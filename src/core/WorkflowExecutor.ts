import { WorkflowData } from './Workflow';
import { NodeInstance } from './NodeInstance';
import { Connection } from './Connection';
import { resourceStore } from './ResourceStore';
import { processImageToSvg } from './processors/svg/svgProcessor';
import { processImageToAscii } from './processors/ascii/asciiProcessor';
import { processImageToSketch } from './processors/sketch/sketchProcessor';
import { processImageToRgbSplit } from './processors/rgbSplit/rgbSplitProcessor';
import { processImageToPixel } from './processors/pixel/pixelProcessor';
import { processImageToColorQuantization } from './processors/colorQuantization/colorQuantizationProcessor';
import { processInputImage } from './processors/input/imageInputProcessor';
import { processImageExport } from './processors/output/imageExportProcessor';
import { processImageToMirage } from './processors/mirage/mirageProcessor';

export type NodeExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface NodeExecutionState {
  status: NodeExecutionStatus;
  errorMessage?: string;
  outputResourceId?: string;
}

export interface ExecutionPathResult {
  success: boolean;
  processedNodeIds: string[];
  skippedNodeIds: string[];
  failedNodeId?: string;
  errorMessage?: string;
}

class WorkflowExecutor {
  private executionStates: Map<string, NodeExecutionState> = new Map();
  private executionCache: Map<string, { paramHash: string; resourceId: string }> = new Map();
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  getExecutionState(nodeId: string): NodeExecutionState {
    return this.executionStates.get(nodeId) || { status: 'idle' };
  }

  setExecutionState(nodeId: string, state: Partial<NodeExecutionState>): void {
    const current = this.getExecutionState(nodeId);
    this.executionStates.set(nodeId, { ...current, ...state });
    this.notify();
  }

  getUpstreamNodeIds(targetNodeId: string, connections: Connection[]): string[] {
    const visited = new Set<string>();
    const stack = [targetNodeId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const incomingConnections = connections.filter((c) => c.targetNodeId === currentId);
      for (const conn of incomingConnections) {
        if (!visited.has(conn.sourceNodeId)) {
          visited.add(conn.sourceNodeId);
          stack.push(conn.sourceNodeId);
        }
      }
    }

    return Array.from(visited);
  }

  topologicalSort(nodeIds: string[], connections: Connection[]): string[] {
    const nodeSet = new Set(nodeIds);
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    nodeIds.forEach((id) => {
      inDegree.set(id, 0);
      adj.set(id, []);
    });

    connections.forEach((conn) => {
      if (nodeSet.has(conn.sourceNodeId) && nodeSet.has(conn.targetNodeId)) {
        adj.get(conn.sourceNodeId)!.push(conn.targetNodeId);
        inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) || 0) + 1);
      }
    });

    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    const result: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      result.push(u);
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) queue.push(v);
      }
    }

    return result;
  }

  /**
   * 构造稳定且精确的节点执行签名 Hash (Execution Signature)
   * 包含：nodeType、可编辑参数、processorVersion、按 targetPortId 排序的所有输入 ResourceId 以及上游节点的 outputRevision
   */
  public computeExecutionSignature(
    node: NodeInstance,
    workflow: WorkflowData,
    nodeVersions: Record<string, number> = {},
    processorVersion = 'v1.0'
  ): { signature: string; inputResourceIds: string[]; upstreamRevisions: Record<string, number> } {
    const incomingConns = (workflow.connections || [])
      .filter((c: Connection) => c.targetNodeId === node.id)
      .sort((a, b) => a.targetPortId.localeCompare(b.targetPortId));

    const inputResourceIds: string[] = [];
    const upstreamRevisions: Record<string, number> = {};

    for (const conn of incomingConns) {
      const sourceState = this.getExecutionState(conn.sourceNodeId);
      const resId = sourceState.outputResourceId;
      if (resId) {
        inputResourceIds.push(`${conn.targetPortId}:${resId}`);
      }
      upstreamRevisions[conn.sourceNodeId] = nodeVersions[conn.sourceNodeId] || 0;
    }

    // 对于输入节点 (input.image)，把 parameters.resourceId 纳入 userParams，确保换图时 Signature 100% 改变！
    const userParams: Record<string, any> = {};
    if (node.parameters) {
      Object.keys(node.parameters)
        .filter((k) => (node.type === 'input.image' ? k !== 'outputResourceId' : k !== 'resourceId' && k !== 'outputResourceId'))
        .sort()
        .forEach((k) => {
          userParams[k] = node.parameters[k];
        });
    }

    const signatureObj = {
      nodeType: node.type,
      processorVersion,
      userParams,
      inputResourceIds,
      upstreamRevisions
    };

    return {
      signature: JSON.stringify(signatureObj),
      inputResourceIds,
      upstreamRevisions
    };
  }

  async executeToNode(
    targetNodeId: string,
    workflow: WorkflowData,
    nodeVersions: Record<string, number> = {}
  ): Promise<ExecutionPathResult> {
    const upstreamIds = this.getUpstreamNodeIds(targetNodeId, workflow.connections);
    const allRelevantIds = [...upstreamIds, targetNodeId];
    const sortedIds = this.topologicalSort(allRelevantIds, workflow.connections);

    const processedNodeIds: string[] = [];
    const skippedNodeIds: string[] = [];

    for (const nodeId of sortedIds) {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const { signature } = this.computeExecutionSignature(node, workflow, nodeVersions);
      const cache = this.executionCache.get(nodeId);
      const currentState = this.getExecutionState(nodeId);

      // Cache 严格命中检查：
      // 1. 参数签名 hash 完备匹配 (包含 processorVersion、用户参数、所有输入端口 targetPortId 对应的 resourceId)
      // 2. 当前节点上次状态为 success，且关联的 outputResourceId 在 ResourceStore 中仍然真实有效存在
      if (
        cache &&
        cache.paramHash === signature &&
        currentState.status === 'success' &&
        currentState.outputResourceId &&
        resourceStore.getResource(currentState.outputResourceId)
      ) {
        console.log(`[WorkflowExecutor] Node ${nodeId} (${node.type}) hit cache, skipping computation.`);
        node.dirty = false;
        node.lastExecutedSignature = signature;
        skippedNodeIds.push(nodeId);
        continue;
      }

      this.setExecutionState(nodeId, { status: 'running', errorMessage: undefined });

      try {
        if (node.type === 'input.image') {
          const rawResId = node.parameters.resourceId;
          const rawRes = rawResId ? resourceStore.getResource(rawResId) : undefined;
          if (!rawRes || !rawRes.blob || !rawRes.blob.type.startsWith('image/')) {
            throw new Error('当前输入卡片未上传有效的图片素材！');
          }

          // Step 1: Denoise Filter -> Step 2: Scale Ratio Pipeline Processing
          const processed = await processInputImage(rawRes.blob, {
            denoiseRadius: node.parameters.denoiseRadius,
            scaleRatio: node.parameters.scaleRatio
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: processed.resourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: processed.resourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'output.image') {
          const incomingConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId);
          if (!incomingConn) {
            throw new Error('请连接上游图像节点');
          }

          const sourceState = this.getExecutionState(incomingConn.sourceNodeId);
          const sourceResId = sourceState.outputResourceId;

          if (!sourceResId) {
            throw new Error('未获取到连线上游节点的图像资源');
          }

          const inputRes = resourceStore.getResource(sourceResId);
          if (!inputRes || !inputRes.blob) {
            throw new Error('连线上游素材并非有效的图片类型，请重新上传或渲染！');
          }

          const result = await processImageExport(inputRes.blob, {
            scaleRatio: node.parameters.scaleRatio,
            exportFormat: node.parameters.exportFormat,
            jpgQuality: node.parameters.jpgQuality
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通处理节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: result.resourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: result.resourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'output.svg') {
          const incomingConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId);
          if (!incomingConn) {
            throw new Error('请连接上游图像输入节点');
          }

          const sourceState = this.getExecutionState(incomingConn.sourceNodeId);
          const sourceResId = sourceState.outputResourceId;

          if (!sourceResId) {
            throw new Error('未获取到连线上游节点的图像资源');
          }

          const inputRes = resourceStore.getResource(sourceResId);
          if (!inputRes || !inputRes.blob || !inputRes.blob.type.startsWith('image/')) {
            throw new Error('连线上游素材并非有效的图片类型，请重新上传输入图片！');
          }

          const result = await processImageToSvg(inputRes.blob, {
            scalePercent: node.parameters.scalePercent,
            colorCount: node.parameters.colorCount,
            medianRadius: node.parameters.medianRadius,
            despeckleMinArea: node.parameters.despeckleMinArea,
            simplifyEpsilon: node.parameters.simplifyEpsilon,
            cornerHardness: node.parameters.cornerHardness,
            bezierTolerance: node.parameters.bezierTolerance,
            bilateral: node.parameters.bilateral,
            seamGuard: node.parameters.seamGuard,
            vectorMode: node.parameters.vectorMode
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通处理节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: result.svgResourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: result.svgResourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'output.ascii') {
          const incomingConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId);
          if (!incomingConn) {
            throw new Error('请连接上游图像输入节点');
          }

          const sourceState = this.getExecutionState(incomingConn.sourceNodeId);
          const sourceResId = sourceState.outputResourceId;

          if (!sourceResId) {
            throw new Error('未获取到连线上游节点的图像资源');
          }

          const inputRes = resourceStore.getResource(sourceResId);
          if (!inputRes || !inputRes.blob || !inputRes.blob.type.startsWith('image/')) {
            throw new Error('连线上游素材并非有效的图片类型，请重新上传输入图片！');
          }

          const result = await processImageToAscii(inputRes.blob, {
            preset: node.parameters.preset,
            customCharSet: node.parameters.customCharSet,
            invertCharSet: node.parameters.invertCharSet,
            includeSpace: node.parameters.includeSpace,
            resolutionCols: node.parameters.resolutionCols,
            widthRatio: node.parameters.widthRatio,
            heightRatio: node.parameters.heightRatio,
            colorMode: node.parameters.colorMode,
            textColor: node.parameters.textColor,
            bgColor: node.parameters.bgColor,
            fontFamily: node.parameters.fontFamily,
            fontSize: node.parameters.fontSize
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通处理节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: result.resourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: result.resourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'filter.sketch') {
          const incomingConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId);
          if (!incomingConn) {
            throw new Error('请连接上游图像输入节点');
          }

          const sourceState = this.getExecutionState(incomingConn.sourceNodeId);
          const sourceResId = sourceState.outputResourceId;

          if (!sourceResId) {
            throw new Error('未获取到连线上游节点的图像资源');
          }

          const inputRes = resourceStore.getResource(sourceResId);
          if (!inputRes || !inputRes.blob || !inputRes.blob.type.startsWith('image/')) {
            throw new Error('连线上游素材并非有效的图片类型，请重新上传输入图片！');
          }

          const result = await processImageToSketch(inputRes.blob, {
            layer0Opacity: node.parameters.layer0Opacity,
            layer1Opacity: node.parameters.layer1Opacity,
            layer2Opacity: node.parameters.layer2Opacity,
            layer2MinimumRadius: node.parameters.layer2MinimumRadius,
            layer3Opacity: node.parameters.layer3Opacity,
            layer3ColorMode: node.parameters.layer3ColorMode,
            layer3CustomColor: node.parameters.layer3CustomColor,
            layer3BlendMode: node.parameters.layer3BlendMode
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通处理节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: result.resourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: result.resourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'filter.rgbSplit') {
          const incomingConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId);
          if (!incomingConn) {
            throw new Error('请连接上游图像输入节点');
          }

          const sourceState = this.getExecutionState(incomingConn.sourceNodeId);
          const sourceResId = sourceState.outputResourceId;

          if (!sourceResId) {
            throw new Error('未获取到连线上游节点的图像资源');
          }

          const inputRes = resourceStore.getResource(sourceResId);
          if (!inputRes || !inputRes.blob || !inputRes.blob.type.startsWith('image/')) {
            throw new Error('连线上游素材并非有效的图片类型，请重新上传输入图片！');
          }

          const result = await processImageToRgbSplit(inputRes.blob, {
            noiseAmount: node.parameters.noiseAmount,
            l1OffsetX: node.parameters.l1OffsetX,
            l1OffsetY: node.parameters.l1OffsetY,
            l1Opacity: node.parameters.l1Opacity,
            l2OffsetX: node.parameters.l2OffsetX,
            l2OffsetY: node.parameters.l2OffsetY,
            l2Opacity: node.parameters.l2Opacity,
            l3OffsetX: node.parameters.l3OffsetX,
            l3OffsetY: node.parameters.l3OffsetY,
            l3Opacity: node.parameters.l3Opacity
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通处理节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: result.resourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: result.resourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'filter.pixel') {
          const incomingConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId);
          if (!incomingConn) {
            throw new Error('请连接上游图像输入节点');
          }

          const sourceState = this.getExecutionState(incomingConn.sourceNodeId);
          const sourceResId = sourceState.outputResourceId;

          if (!sourceResId) {
            throw new Error('未获取到连线上游节点的图像资源');
          }

          const inputRes = resourceStore.getResource(sourceResId);
          if (!inputRes || !inputRes.blob || !inputRes.blob.type.startsWith('image/')) {
            throw new Error('连线上游素材并非有效的图片类型，请重新上传输入图片！');
          }

          const result = await processImageToPixel(inputRes.blob, {
            scaleRatio: node.parameters.scaleRatio,
            enableThreshold: node.parameters.enableThreshold,
            threshold: node.parameters.threshold,
            thresholdMode: node.parameters.thresholdMode,
            enableCustomColor: node.parameters.enableCustomColor,
            customColor: node.parameters.customColor
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通处理节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: result.resourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: result.resourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'filter.colorQuantization') {
          const incomingConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId);
          if (!incomingConn) {
            throw new Error('请连接上游图像输入节点');
          }

          const sourceState = this.getExecutionState(incomingConn.sourceNodeId);
          const sourceResId = sourceState.outputResourceId;

          if (!sourceResId) {
            throw new Error('未获取到连线上游节点的图像资源');
          }

          const inputRes = resourceStore.getResource(sourceResId);
          if (!inputRes || !inputRes.blob || !inputRes.blob.type.startsWith('image/')) {
            throw new Error('连线上游素材并非有效的图片类型，请重新上传输入图片！');
          }

          const result = await processImageToColorQuantization(inputRes.blob, {
            k: node.parameters.k,
            maxIterations: node.parameters.maxIterations
          });

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通处理节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: result.resourceId });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: result.resourceId });
          processedNodeIds.push(nodeId);
        } else if (node.type === 'output.mirage') {
          const coverConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId && c.targetPortId === 'coverImage');
          const innerConn = workflow.connections.find((c: Connection) => c.targetNodeId === nodeId && c.targetPortId === 'innerImage');

          if (!coverConn || !innerConn) {
            throw new Error('幻影坦克节点需要同时连接表图和里图');
          }

          const coverSourceState = this.getExecutionState(coverConn.sourceNodeId);
          const innerSourceState = this.getExecutionState(innerConn.sourceNodeId);

          const coverResId = coverSourceState.outputResourceId;
          const innerResId = innerSourceState.outputResourceId;

          if (!coverResId || !innerResId) {
            throw new Error('无法获取表图或里图的上游图片资源');
          }

          const coverRes = resourceStore.getResource(coverResId);
          const innerRes = resourceStore.getResource(innerResId);

          if (!coverRes?.blob || !innerRes?.blob) {
            throw new Error('表图或里图的上游图片资源无效');
          }

          const result = await processImageToMirage(
            coverRes.blob,
            innerRes.blob,
            {
              isColored: node.parameters.isColored ?? true,
              maxSize: node.parameters.maxSize ?? 0,
              innerScale: node.parameters.innerScale ?? 0.3,
              coverScale: node.parameters.coverScale ?? 0.2,
              innerWeight: node.parameters.innerWeight ?? 0.7,
              innerDesat: node.parameters.innerDesat ?? 0,
              coverDesat: node.parameters.coverDesat ?? 0
            }
          );

          const resource = await resourceStore.addResource(
            `mirage_${Date.now()}.png`,
            'image',
            result.blob,
            {
              mimeType: 'image/png',
              width: result.width,
              height: result.height,
              coverPreviewUrl: result.coverPreviewUrl,
              innerPreviewUrl: result.innerPreviewUrl
            }
          );

          node.dirty = false;
          node.lastExecutedSignature = signature;
          // 普通节点不写回 parameters.resourceId！仅保存在 executionStates 与 executionCache
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: resource.id });
          this.setExecutionState(nodeId, { status: 'success', outputResourceId: resource.id });
          processedNodeIds.push(nodeId);
        } else {
          node.dirty = false;
          node.lastExecutedSignature = signature;
          this.executionCache.set(nodeId, { paramHash: signature, resourceId: '' });
          this.setExecutionState(nodeId, { status: 'success' });
          processedNodeIds.push(nodeId);
        }
      } catch (err: any) {
        console.error(`[WorkflowExecutor] Error executing node ${nodeId}:`, err);
        // 执行失败：保留失败节点及下游节点的 Dirty 状态，不清除，同时中止后续渲染
        node.dirty = true;
        this.setExecutionState(nodeId, { status: 'error', errorMessage: err.message || '执行失败' });
        return {
          success: false,
          processedNodeIds,
          skippedNodeIds,
          failedNodeId: nodeId,
          errorMessage: err.message || '执行失败'
        };
      }
    }

    return {
      success: true,
      processedNodeIds,
      skippedNodeIds
    };
  }
}

export const workflowExecutor = new WorkflowExecutor();

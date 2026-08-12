import { Node as RFNode, Edge as RFEdge } from '@xyflow/react';
import { NodeInstance } from '../core/NodeInstance';
import { Connection } from '../core/Connection';
import { nodeRegistry } from '../registry/nodeRegistry';
import { NodeDefinition } from '../core/NodeDefinition';

export interface VisualNodeData {
  instance: NodeInstance;
  definition: NodeDefinition;
  onDraftParamsChange?: (nodeId: string, params: Record<string, any>) => void;
  onRecordNodeExecuted?: (nodeId: string) => void;
  onParameterChange?: (nodeId: string, paramId: string, value: any) => void;
  onRemoveNode?: (nodeId: string) => void;
  onResizeNode?: (nodeId: string, width: number, height: number) => void;
  markNodeAndDownstreamDirty?: (nodeId: string) => void;
  enableMagnifier?: boolean;
  [key: string]: unknown;
}

/**
 * Converts Core NodeInstances into React Flow Nodes
 */
export function coreNodesToFlowNodes(
  instances: NodeInstance[],
  onParameterChange?: (nodeId: string, paramId: string, value: any) => void,
  onRemoveNode?: (nodeId: string) => void,
  onResizeNode?: (nodeId: string, width: number, height: number) => void,
  enableMagnifier?: boolean,
  onDraftParamsChange?: (nodeId: string, params: Record<string, any>) => void,
  onRecordNodeExecuted?: (nodeId: string) => void,
  markNodeAndDownstreamDirty?: (nodeId: string) => void
): RFNode<VisualNodeData>[] {
  const validFlowNodes: RFNode<VisualNodeData>[] = [];

  for (const instance of instances) {
    const definition = nodeRegistry.get(instance.type);
    if (!definition) {
      console.warn(`[WorkflowAdapter] Skipping unknown/unregistered node type: "${instance.type}" (id: ${instance.id})`);
      continue;
    }

    const width = instance.size?.width ?? instance.width ?? definition.defaultSize?.width ?? 260;
    const height = instance.size?.height ?? instance.height ?? definition.defaultSize?.height ?? 200;

    validFlowNodes.push({
      id: instance.id,
      type: 'customNode', // Custom node component in React Flow
      position: { x: instance.position.x, y: instance.position.y },
      style: {
        width: `${width}px`,
        height: `${height}px`
      },
      data: {
        instance,
        definition,
        onDraftParamsChange,
        onRecordNodeExecuted,
        onParameterChange,
        onRemoveNode,
        onResizeNode,
        markNodeAndDownstreamDirty,
        enableMagnifier
      }
    });
  }

  return validFlowNodes;
}

/**
 * Traces all upstream connection IDs for a given target node ID (Upstream Dependency Chain Only)
 */
export function getUpstreamConnectionIds(targetNodeId: string, connections: Connection[]): Set<string> {
  const upstreamConnIds = new Set<string>();
  const visitedNodes = new Set<string>();
  const queue = [targetNodeId];

  while (queue.length > 0) {
    const currNodeId = queue.shift()!;
    if (visitedNodes.has(currNodeId)) continue;
    visitedNodes.add(currNodeId);

    // Find all incoming connections where target is currNodeId
    const incomingConns = connections.filter((c) => c.targetNodeId === currNodeId);
    for (const conn of incomingConns) {
      upstreamConnIds.add(conn.id);
      queue.push(conn.sourceNodeId);
    }
  }

  return upstreamConnIds;
}

/**
 * Converts Core Connections into React Flow Edges with Dual-State Color Priorities
 * Priority:
 * 1. Pending & Selected => Orange (#f97316)
 * 2. Pending Only => Yellow (#facc15)
 * 3. Selected Only => Red (#ec4899)
 * 4. Default => Blue (#3b82f6)
 */
export function coreConnectionsToFlowEdges(
  connections: Connection[],
  enableAnimation: boolean = true,
  selectedNodeId: string | null = null,
  nodeVersions: Record<string, number> = {},
  lastConsumedVersions: Record<string, Record<string, number>> = {},
  validNodeIds?: Set<string>,
  nodesMap?: Map<string, NodeInstance>
): RFEdge[] {
  const highlightConnIds = selectedNodeId
    ? getUpstreamConnectionIds(selectedNodeId, connections)
    : new Set<string>();

  return connections
    .filter((conn) => {
      if (!validNodeIds) return true;
      return validNodeIds.has(conn.sourceNodeId) && validNodeIds.has(conn.targetNodeId);
    })
    .map((conn) => {
      const edgeKey = `${conn.sourceNodeId}:${conn.sourcePortId}->${conn.targetNodeId}:${conn.targetPortId}`;
      const isSelectedLike = highlightConnIds.has(conn.id);

      const sourceNode = nodesMap?.get(conn.sourceNodeId);
      const sourceVer = sourceNode?.outputRevision ?? nodeVersions[conn.sourceNodeId] ?? 0;
      const consumedVer = lastConsumedVersions[conn.targetNodeId]?.[edgeKey] ?? 0;

      // 边颜色逻辑判定（精确的三状态模型）：
      // 1. 若 source 节点的最新 outputRevision 大于 target 对该边的已消费 revision，说明 source 输出了新版本但 target 尚未消费 -> 边处于未消费 Dirty (黄/橙)
      // 2. 若 source 节点本身处于 dirty 状态（例如 source 的参数或输入发生变化但尚未重新渲染），其出边连线应保持未消费/Dirty 提示 -> 黄/橙线
      const isSourceDirty = !!sourceNode?.dirty;
      const isVersionUnconsumed = sourceVer > consumedVer;
      const isEdgeDirty = isSourceDirty || isVersionUnconsumed;

      let edgeStyle: React.CSSProperties = { stroke: '#3b82f6', strokeWidth: 2.5 };

      if (isEdgeDirty && isSelectedLike) {
        // 橙色：Edge 处于 Dirty 状态且在上游高亮链上
        edgeStyle = {
          stroke: '#f97316',
          strokeWidth: 4,
          filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.9))'
        };
      } else if (isEdgeDirty && !isSelectedLike) {
        // 黄色：Edge 处于 Dirty 状态（例如 source dirty 或未消费）
        edgeStyle = {
          stroke: '#facc15',
          strokeWidth: 3.5,
          filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.9))'
        };
      } else if (!isEdgeDirty && isSelectedLike) {
        // 粉红：数据最新（Clean）且在选中链上
        edgeStyle = {
          stroke: '#ec4899',
          strokeWidth: 4,
          filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.9))'
        };
      }

      return {
        id: conn.id,
        source: conn.sourceNodeId,
        sourceHandle: conn.sourcePortId,
        target: conn.targetNodeId,
        targetHandle: conn.targetPortId,
        animated: enableAnimation,
        style: edgeStyle
      };
    });
}

/**
 * Converts a React Flow Edge into a Core Connection
 */
export function flowEdgeToCoreConnection(edge: RFEdge): Connection {
  return {
    id: edge.id || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sourceNodeId: edge.source,
    sourcePortId: edge.sourceHandle || '',
    targetNodeId: edge.target,
    targetPortId: edge.targetHandle || ''
  };
}

import { useState, useEffect, useCallback } from 'react';
import { resourceStore } from '../core/ResourceStore';
import { workflowExecutor } from '../core/WorkflowExecutor';

export interface UpstreamResourceResult {
  originalUrl: string | null;
  isUpstreamReady: boolean;
}

/**
 * Resolves the valid outputResourceId ONLY from the DIRECT upstream connected node (no recursion, strict filter isolation)
 */
function resolveUpstreamResourceId(nodeId: string, targetPortId?: string): string | undefined {
  const workflowData = (window as any).__SUZU_WORKFLOW_DATA__;
  if (!workflowData || !workflowData.connections) return undefined;

  // 1. 查找直连的输入连线
  let incomingConn: any = null;
  if (targetPortId) {
    incomingConn = workflowData.connections.find(
      (c: any) => c.targetNodeId === nodeId && c.targetPortId === targetPortId
    );
  } else {
    incomingConn = workflowData.connections.find((c: any) => c.targetNodeId === nodeId);
  }

  if (!incomingConn) return undefined;

  const sourceNodeId = incomingConn.sourceNodeId;
  const sourceNode = workflowData.nodes?.find((n: any) => n.id === sourceNodeId);
  if (!sourceNode) return undefined;

  // 2. 情形 A：直连上游是输入节点 (input.image)
  if (sourceNode.type === 'input.image') {
    const sourceState = workflowExecutor.getExecutionState(sourceNodeId);
    return sourceState.outputResourceId || sourceNode.parameters?.resourceId;
  }

  // 3. 情形 B：直连上游是处理/滤镜/输出节点 -> 必须【且只能】读取该直连上游在 WorkflowExecutor 中渲染成功的 outputResourceId！
  const sourceState = workflowExecutor.getExecutionState(sourceNodeId);
  if (sourceState.status === 'success' && sourceState.outputResourceId) {
    return sourceState.outputResourceId;
  }

  // 4. 情形 C：直连处理节点未渲染 -> 返回 undefined，下游节点的原图面板显示为空（黑色/待渲染）！
  return undefined;
}

export function useUpstreamResource(nodeId: string, targetPortId?: string): UpstreamResourceResult {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isUpstreamReady, setIsUpstreamReady] = useState<boolean>(false);

  const loadResource = useCallback(() => {
    const resId = resolveUpstreamResourceId(nodeId, targetPortId);

    if (resId) {
      const res = resourceStore.getResource(resId);
      if (res && res.blob) {
        setOriginalUrl(URL.createObjectURL(res.blob));
        setIsUpstreamReady(true);
        return;
      }
    }

    setOriginalUrl(null);
    setIsUpstreamReady(false);
  }, [nodeId, targetPortId]);

  useEffect(() => {
    loadResource();
    const unsubscribe = workflowExecutor.subscribe(() => {
      loadResource();
    });
    return () => unsubscribe();
  }, [loadResource]);

  return {
    originalUrl,
    isUpstreamReady
  };
}

/**
 * Universal display URL resolver:
 * A. isSelected && livePreviewUrl -> live draft preview
 * B. renderedUrl (committed parameter resource) -> formal render
 * C. null -> placeholder (never fall back to originalUrl!)
 */
export function useDisplayUrl(
  isSelected: boolean,
  livePreviewUrl?: string | null,
  renderedUrl?: string | null,
  _originalUrl?: string | null
): string | null {
  // 1. 如果当前被选中且有实时预览（草稿），优先显示实时预览
  if (isSelected && livePreviewUrl) {
    return livePreviewUrl;
  }
  // 2. 如果当前节点已经正式渲染成功过，显示渲染成品图
  if (renderedUrl) {
    return renderedUrl;
  }
  // 3. 如果既没选中预览，又没正式渲染过，绝对不能 fallback 到 originalUrl！
  // 必须返回 null，让右侧成品预览面板显示“未渲染 / 待渲染”占位。
  return null;
}

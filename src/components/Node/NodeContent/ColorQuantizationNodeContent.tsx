import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { ColorQuantizationPreview } from '../../NodePreview/ColorQuantizationPreview';
import { useUpstreamResource, useDisplayUrl } from '../../../hooks/useUpstreamResource';

export function ColorQuantizationNodeContent({
  instance,
  isSelected,
  livePreviewUrl,
  isProcessing
}: NodeContentProps) {
  const { originalUrl } = useUpstreamResource(instance.id);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [executionState, setExecutionState] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    errorMessage?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    const state = workflowExecutor.getExecutionState(instance.id);
    setExecutionState({
      status: state.status,
      errorMessage: state.errorMessage
    });

    // 响应式读取正式渲染输出 ID，创建并管理安全 URL
    const resId = instance.outputResourceId || state.outputResourceId;
    if (!resId) {
      setRenderedUrl(null);
      return;
    }

    const res = resourceStore.getResource(resId);
    if (!res || !res.blob) {
      setRenderedUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(res.blob);
    setRenderedUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [instance.id, instance.outputResourceId]);

  useEffect(() => {
    const unsubscribe = workflowExecutor.subscribe(() => {
      const state = workflowExecutor.getExecutionState(instance.id);
      setExecutionState({
        status: state.status,
        errorMessage: state.errorMessage
      });
    });
    return () => unsubscribe();
  }, [instance.id]);

  // 统一双预览切换使用 useDisplayUrl：
  // 聚焦时若有 livePreviewUrl 优先显示草稿，失焦时 100% 保持显示正式 renderedUrl！
  const displayRenderedUrl = useDisplayUrl(isSelected, livePreviewUrl, renderedUrl, originalUrl);
  const currentStatus = isProcessing ? 'running' : executionState.status;

  return (
    <ColorQuantizationPreview
      originalUrl={originalUrl}
      renderedUrl={displayRenderedUrl}
      status={currentStatus}
      errorMessage={executionState.errorMessage}
    />
  );
}

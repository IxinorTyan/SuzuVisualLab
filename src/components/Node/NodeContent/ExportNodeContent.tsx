import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { SketchPreview } from '../../NodePreview/SketchPreview';
import { useUpstreamResource, useDisplayUrl } from '../../../hooks/useUpstreamResource';

export function ExportNodeContent({
  instance,
  isSelected,
  livePreviewUrl,
  isProcessing
}: NodeContentProps) {
  const { originalUrl } = useUpstreamResource(instance.id);
  const [exportRenderedUrl, setExportRenderedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  useEffect(() => {
    const state = workflowExecutor.getExecutionState(instance.id);
    setStatus(state.status);

    const exportResId = instance.outputResourceId || state.outputResourceId;
    if (!exportResId) {
      setExportRenderedUrl(null);
      return;
    }

    const res = resourceStore.getResource(exportResId);
    if (!res || !res.blob) {
      setExportRenderedUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(res.blob);
    setExportRenderedUrl(objectUrl);
    setStatus('success');

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [instance.id, instance.outputResourceId]);

  useEffect(() => {
    const unsubscribe = workflowExecutor.subscribe(() => {
      const state = workflowExecutor.getExecutionState(instance.id);
      setStatus(state.status);
    });
    return () => unsubscribe();
  }, [instance.id]);

  // Determine display url using unified resolver
  const displayRenderedUrl = useDisplayUrl(isSelected, livePreviewUrl, exportRenderedUrl, originalUrl);
  const currentStatus = isProcessing ? 'running' : status;

  return (
    <SketchPreview
      originalUrl={originalUrl}
      renderedUrl={displayRenderedUrl}
      status={currentStatus}
    />
  );
}

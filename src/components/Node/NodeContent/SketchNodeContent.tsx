import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { SketchPreview } from '../../NodePreview/SketchPreview';
import { useUpstreamResource, useDisplayUrl } from '../../../hooks/useUpstreamResource';

export function SketchNodeContent({
  instance,
  isSelected,
  livePreviewUrl,
  isProcessing
}: NodeContentProps) {
  const { originalUrl } = useUpstreamResource(instance.id);
  const [sketchRenderedUrl, setSketchRenderedUrl] = useState<string | null>(null);
  const [sketchStatus, setSketchStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  useEffect(() => {
    const state = workflowExecutor.getExecutionState(instance.id);
    setSketchStatus(state.status);

    const sketchResId = instance.outputResourceId || state.outputResourceId;
    if (!sketchResId) {
      setSketchRenderedUrl(null);
      return;
    }

    const res = resourceStore.getResource(sketchResId);
    if (!res || !res.blob) {
      setSketchRenderedUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(res.blob);
    setSketchRenderedUrl(objectUrl);
    setSketchStatus('success');

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [instance.id, instance.outputResourceId]);

  useEffect(() => {
    const unsubscribe = workflowExecutor.subscribe(() => {
      const state = workflowExecutor.getExecutionState(instance.id);
      setSketchStatus(state.status);
    });
    return () => unsubscribe();
  }, [instance.id]);

  // Determine display url using unified resolver: livePreviewUrl -> renderedUrl -> originalUrl
  const displayRenderedUrl = useDisplayUrl(isSelected, livePreviewUrl, sketchRenderedUrl, originalUrl);
  const currentStatus = isProcessing ? 'running' : sketchStatus;

  return (
    <SketchPreview
      originalUrl={originalUrl}
      renderedUrl={displayRenderedUrl}
      status={currentStatus}
    />
  );
}

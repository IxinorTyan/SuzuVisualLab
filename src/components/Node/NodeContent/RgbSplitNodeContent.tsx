import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { RgbSplitPreview } from '../../NodePreview/RgbSplitPreview';
import { useUpstreamResource, useDisplayUrl } from '../../../hooks/useUpstreamResource';

export function RgbSplitNodeContent({
  instance,
  isSelected,
  livePreviewUrl,
  isProcessing
}: NodeContentProps) {
  const { originalUrl } = useUpstreamResource(instance.id);
  const [rgbSplitRenderedUrl, setRgbSplitRenderedUrl] = useState<string | null>(null);
  const [rgbSplitStatus, setRgbSplitStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  useEffect(() => {
    const state = workflowExecutor.getExecutionState(instance.id);
    setRgbSplitStatus(state.status);

    const rgbResId = instance.outputResourceId || state.outputResourceId;
    if (!rgbResId) {
      setRgbSplitRenderedUrl(null);
      return;
    }

    const res = resourceStore.getResource(rgbResId);
    if (!res || !res.blob) {
      setRgbSplitRenderedUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(res.blob);
    setRgbSplitRenderedUrl(objectUrl);
    setRgbSplitStatus('success');

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [instance.id, instance.outputResourceId]);

  useEffect(() => {
    const unsubscribe = workflowExecutor.subscribe(() => {
      const state = workflowExecutor.getExecutionState(instance.id);
      setRgbSplitStatus(state.status);
    });
    return () => unsubscribe();
  }, [instance.id]);

  // Determine display url using unified resolver: livePreviewUrl -> renderedUrl -> originalUrl
  const displayRenderedUrl = useDisplayUrl(isSelected, livePreviewUrl, rgbSplitRenderedUrl, originalUrl);
  const currentStatus = isProcessing ? 'running' : rgbSplitStatus;

  return (
    <RgbSplitPreview
      originalUrl={originalUrl}
      renderedUrl={displayRenderedUrl}
      status={currentStatus}
    />
  );
}

import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { PixelPreview } from '../../NodePreview/PixelPreview';
import { useUpstreamResource, useDisplayUrl } from '../../../hooks/useUpstreamResource';

export function PixelNodeContent({
  instance,
  isSelected,
  livePreviewUrl,
  isProcessing
}: NodeContentProps) {
  const { originalUrl } = useUpstreamResource(instance.id);
  const [pixelRenderedUrl, setPixelRenderedUrl] = useState<string | null>(null);
  const [pixelStatus, setPixelStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const loadResource = () => {
    const pixelResId = instance.outputResourceId || instance.parameters.resourceId;
    if (pixelResId) {
      const res = resourceStore.getResource(pixelResId);
      if (res && res.blob) {
        setPixelRenderedUrl(URL.createObjectURL(res.blob));
        setPixelStatus('success');
      }
    } else {
      setPixelRenderedUrl(null);
    }
  };

  useEffect(() => {
    loadResource();
    const unsubscribe = workflowExecutor.subscribe(() => {
      loadResource();
    });
    return () => unsubscribe();
  }, [instance.id, instance.outputResourceId]);

  // Determine display url using unified resolver: livePreviewUrl -> renderedUrl -> originalUrl
  const displayRenderedUrl = useDisplayUrl(isSelected, livePreviewUrl, pixelRenderedUrl, originalUrl);
  const currentStatus = isProcessing ? 'running' : pixelStatus;

  return (
    <PixelPreview
      originalUrl={originalUrl}
      renderedUrl={displayRenderedUrl}
      status={currentStatus}
    />
  );
}

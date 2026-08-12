import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { MiragePreview } from '../../NodePreview/MiragePreview';
import { useUpstreamResource, useDisplayUrl } from '../../../hooks/useUpstreamResource';

export function MirageNodeContent({
  instance,
  isSelected,
  livePreviewUrl,
  liveCoverPreviewUrl,
  liveInnerPreviewUrl,
  isProcessing
}: NodeContentProps) {
  const { originalUrl: coverUrl } = useUpstreamResource(instance.id, 'coverImage');
  const { originalUrl: innerUrl } = useUpstreamResource(instance.id, 'innerImage');
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [innerPreviewUrl, setInnerPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  useEffect(() => {
    const state = workflowExecutor.getExecutionState(instance.id);
    setStatus(state.status);

    const mirageResId = instance.outputResourceId || state.outputResourceId;
    if (!mirageResId) {
      setRenderedUrl(null);
      setCoverPreviewUrl(null);
      setInnerPreviewUrl(null);
      return;
    }

    const res = resourceStore.getResource(mirageResId);
    if (!res || !res.blob) {
      setRenderedUrl(null);
      setCoverPreviewUrl(null);
      setInnerPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(res.blob);
    setRenderedUrl(objectUrl);
    setStatus('success');

    if (res.metadata) {
      if (res.metadata.coverPreviewUrl) setCoverPreviewUrl(res.metadata.coverPreviewUrl);
      if (res.metadata.innerPreviewUrl) setInnerPreviewUrl(res.metadata.innerPreviewUrl);
    }

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

  const displayRenderedUrl = useDisplayUrl(isSelected, livePreviewUrl, renderedUrl, null);
  const displayCoverPreviewUrl = (isSelected && liveCoverPreviewUrl) ? liveCoverPreviewUrl : coverPreviewUrl;
  const displayInnerPreviewUrl = (isSelected && liveInnerPreviewUrl) ? liveInnerPreviewUrl : innerPreviewUrl;
  const currentStatus = isProcessing ? 'running' : status;

  return (
    <MiragePreview
      coverUrl={coverUrl}
      innerUrl={innerUrl}
      coverPreviewUrl={displayCoverPreviewUrl}
      innerPreviewUrl={displayInnerPreviewUrl}
      renderedUrl={displayRenderedUrl}
      status={currentStatus}
    />
  );
}

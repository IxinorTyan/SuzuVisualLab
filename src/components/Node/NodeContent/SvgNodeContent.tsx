import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { MultiStagePreview } from '../../NodePreview/MultiStagePreview';
import { useUpstreamResource } from '../../../hooks/useUpstreamResource';

export function SvgNodeContent({ instance, onAction, onRenderResult }: NodeContentProps) {
  const { originalUrl } = useUpstreamResource(instance.id);
  const [denoisedUrl, setDenoisedUrl] = useState<string | null>(null);
  const [quantizedUrl, setQuantizedUrl] = useState<string | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);
  const [svgStatus, setSvgStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  useEffect(() => {
    const state = workflowExecutor.getExecutionState(instance.id);
    setSvgStatus(state.status);

    const svgResId = instance.outputResourceId || state.outputResourceId;
    if (!svgResId) {
      setSvgString(null);
      return;
    }

    const svgRes = resourceStore.getResource(svgResId);
    if (svgRes && svgRes.blob) {
      svgRes.blob.text().then((text) => {
        setSvgString(text);
        setSvgStatus('success');
        onRenderResult?.({ svgString: text });
      });
      if (svgRes.metadata) {
        if (svgRes.metadata.denoisedUrl) setDenoisedUrl(svgRes.metadata.denoisedUrl);
        if (svgRes.metadata.quantizedUrl) setQuantizedUrl(svgRes.metadata.quantizedUrl);
      }
    }
  }, [instance.id, instance.outputResourceId]);

  useEffect(() => {
    const unsubscribe = workflowExecutor.subscribe(() => {
      const state = workflowExecutor.getExecutionState(instance.id);
      setSvgStatus(state.status);
    });
    return () => unsubscribe();
  }, [instance.id]);

  return (
    <MultiStagePreview
      originalUrl={originalUrl}
      denoisedUrl={denoisedUrl}
      quantizedUrl={quantizedUrl}
      svgString={svgString}
      status={svgStatus}
      onRender={() => onAction('svg')}
      onExportSvg={() => onAction('exportSvg')}
    />
  );
}

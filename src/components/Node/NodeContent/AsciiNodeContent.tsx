import React, { useState, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { AsciiPreview } from '../../NodePreview/AsciiPreview';
import { AsciiDataData } from '../../../core/processors/ascii/asciiProcessor';
import { useUpstreamResource } from '../../../hooks/useUpstreamResource';

export function AsciiNodeContent({
  instance,
  isSelected,
  liveAsciiData,
  isProcessing,
  onRenderResult
}: NodeContentProps) {
  const { originalUrl } = useUpstreamResource(instance.id);
  const [asciiData, setAsciiData] = useState<AsciiDataData | null>(null);
  const [asciiStatus, setAsciiStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  useEffect(() => {
    const state = workflowExecutor.getExecutionState(instance.id);
    setAsciiStatus(state.status);

    const asciiResId = instance.outputResourceId || state.outputResourceId;
    if (!asciiResId) {
      setAsciiData(null);
      return;
    }

    const asciiRes = resourceStore.getResource(asciiResId);
    if (asciiRes && asciiRes.blob) {
      asciiRes.blob.text().then((text) => {
        try {
          const parsed = JSON.parse(text) as AsciiDataData;
          setAsciiData(parsed);
          setAsciiStatus('success');
          onRenderResult?.({ asciiData: parsed });
        } catch (e) {
          console.error('Failed to parse ASCII resource blob:', e);
        }
      });
    }
  }, [instance.id, instance.outputResourceId]);

  useEffect(() => {
    const unsubscribe = workflowExecutor.subscribe(() => {
      const state = workflowExecutor.getExecutionState(instance.id);
      setAsciiStatus(state.status);
    });
    return () => unsubscribe();
  }, [instance.id]);

  // Determine active display ASCII data: prioritize live preview when selected
  const displayAsciiData = (isSelected && liveAsciiData) ? liveAsciiData : asciiData;
  const currentStatus = isProcessing ? 'running' : asciiStatus;

  return (
    <AsciiPreview
      originalUrl={originalUrl}
      asciiData={displayAsciiData}
      status={currentStatus}
    />
  );
}

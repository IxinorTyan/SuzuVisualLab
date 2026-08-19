import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { VisualNodeData } from '../../adapter/reactFlowAdapter';
import { useToast } from '../UI/ToastContainer';
import { resourceStore } from '../../core/ResourceStore';
import {
  copyAsciiToClipboard,
  downloadAsciiTxt,
  downloadAsciiHtml,
  downloadAsciiPng
} from '../../core/processors/ascii/asciiExport';
import { workflowExecutor } from '../../core/WorkflowExecutor';
import { useNodeLivePreview } from '../../hooks/useNodeLivePreview';
import { NodeParameterForm } from './NodeParameterForm';
import { getNodeContent } from './NodeContent';
import { NodeHeader } from './NodeHeader';
import { NodeHandles } from './NodeHandles';
import { NodeActions } from './NodeActions';
import { NodeRenderResult } from './NodeContent/types';
import { WorkflowData } from '../../core/Workflow';

interface CustomNodeExtraProps {
  onRemoveNode?: (nodeId: string) => void;
}

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const { showToast } = useToast();
  const nodeData = data as unknown as VisualNodeData & CustomNodeExtraProps;

  if (!nodeData || !nodeData.instance || !nodeData.definition) {
    return (
      <div className="visual-node" style={{ padding: '12px', color: '#ef4444', fontSize: '12px' }}>
        Node Error: Definition missing
      </div>
    );
  }

  const {
    instance,
    definition,
    draftParamsMap,
    onParameterChange,
    onDraftParamsChange,
    onRecordNodeExecuted,
    onRemoveNode
  } = nodeData;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const [measuredMinHeight, setMeasuredMinHeight] = useState<number>(0);

  // 1. Draft State & Committed State Separation
  const [draftParams, setDraftParams] = useState<Record<string, any>>(() => {
    const globalDraft = (window as any).__SUZU_DRAFT_PARAMS__?.[instance.id];
    return globalDraft ? { ...globalDraft } : { ...instance.parameters };
  });

  // Render Result State from child NodeContent
  const [renderResult, setRenderResult] = useState<NodeRenderResult>({});

  // 提取用户可编辑属性的比较快照，过滤掉运行时输出/缓存属性（如 resourceId）
  const getComparableParameters = useCallback((params?: Record<string, any>) => {
    if (!params) return {};
    const result: Record<string, any> = {};
    const ignoreKeys = new Set(['resourceId', 'outputResourceId', 'paramHash']);

    // 按 Key 升序排序，避免对象键顺序不同引发的误判
    const sortedKeys = Object.keys(params)
      .filter((k) => !ignoreKeys.has(k))
      .sort();

    for (const key of sortedKeys) {
      const val = params[key];
      // 将 undefined 统一转换为 null/跳过，避免可选参数默认值导致的比较不一致
      if (val !== undefined) {
        result[key] = val;
      }
    }
    return result;
  }, []);

  // Derived Dirty State
  const isDirty = useMemo(() => {
    const draftSnapshot = getComparableParameters(draftParams);
    const instanceSnapshot = getComparableParameters(instance.parameters);
    return JSON.stringify(draftSnapshot) !== JSON.stringify(instanceSnapshot);
  }, [draftParams, instance.parameters, getComparableParameters]);

  useEffect(() => {
    const syncDraft = () => {
      const globalDraft = (window as any).__SUZU_DRAFT_PARAMS__?.[instance.id];
      const source = globalDraft ?? instance.parameters;
      setDraftParams((prev) => {
        if (JSON.stringify(source) !== JSON.stringify(prev)) {
          return { ...source };
        }
        return prev;
      });
    };

    syncDraft();

    window.addEventListener('suzu_draft_updated', syncDraft);
    return () => {
      window.removeEventListener('suzu_draft_updated', syncDraft);
    };
  }, [instance.id, instance.parameters, selected]);

  const handleParamChange = useCallback((paramId: string, value: any) => {
    setDraftParams((prev) => {
      const updated = { ...prev, [paramId]: value };
      onDraftParamsChange?.(instance.id, updated);
      return updated;
    });
    // 参数发生草稿变动时，仅触发 markNodeAndDownstreamDirty 标记当前节点及其递归下游为 Dirty
    // 严禁在此处递增 outputRevision，因为节点尚未生成新输出！
    nodeData.markNodeAndDownstreamDirty?.(instance.id);
  }, [instance.id, onDraftParamsChange, nodeData]);

  // Immediately commit parameter update
  const handleCommitParameter = useCallback((paramId: string, value: any) => {
    onParameterChange?.(instance.id, paramId, value);
    setDraftParams((prev) => {
      const updated = { ...prev, [paramId]: value };
      onDraftParamsChange?.(instance.id, updated);
      return updated;
    });
  }, [instance.id, onParameterChange, onDraftParamsChange]);

  const [svgStatus, setSvgStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  // Live preview hook - pass draftParams when selected, else instance.parameters
  const livePreview = useNodeLivePreview(
    instance.id,
    instance.type,
    selected ? draftParams : instance.parameters,
    !!selected
  );

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.ceil(entry.contentRect.height);
        if (height > 0) {
          setMeasuredMinHeight((prev) => (Math.abs(prev - height) > 5 ? height : prev));
        }
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Universal Commit Function with Workflow Snapshot
  const commitAndExecute = useCallback(async (actionType: string) => {
    // A. 构造提交后的完整参数快照
    const committedParams = {
      ...instance.parameters,
      ...draftParams
    };

    // B. 一次性批量同步提交给全局 React Workflow State
    Object.keys(draftParams).forEach((key) => {
      onParameterChange?.(instance.id, key, draftParams[key]);
    });

    // C. 保持本地 draftParams 为刚刚提交的草稿参数，并同步更新 window 草稿全局缓存
    setDraftParams({ ...draftParams });
    onDraftParamsChange?.(instance.id, { ...draftParams });

    // C. 基于全局数据构造本次计算专用的 workflow 内存快照（Snapshot）
    const activeWorkflow = (window as any).__SUZU_WORKFLOW_DATA__ || { nodes: [instance], connections: [] };
    const workflowSnapshot: WorkflowData = {
      ...activeWorkflow,
      nodes: (activeWorkflow.nodes || []).map((n: any) =>
        n.id === instance.id ? { ...n, parameters: { ...committedParams } } : n
      )
    };

    if (actionType === 'svg') {
      setSvgStatus('running');
      try {
        const pathRes = await workflowExecutor.executeToNode(instance.id, workflowSnapshot);
        if (!pathRes.success) {
          setSvgStatus('error');
          showToast(pathRes.errorMessage || '渲染失败', 'error');
          return;
        }

        // 由 applyExecutionPathResult 统一接管提交与版本更新，CustomNode 不再直接循环调用 onRecordNodeExecuted 或 cleanNodesDirty
        if ((window as any).__SUZU_APPLY_EXECUTION_RESULT__) {
          (window as any).__SUZU_APPLY_EXECUTION_RESULT__(pathRes);
        }

        const executionState = workflowExecutor.getExecutionState(instance.id);

        if (executionState.outputResourceId) {
          const res = resourceStore.getResource(executionState.outputResourceId);
          if (res && res.blob) {
            const svgText = await res.blob.text();
            setRenderResult((prev) => ({ ...prev, blob: res.blob || undefined, svgString: svgText }));
          }
        }
        setSvgStatus('success');
        showToast('SVG 渲染成功！', 'success');
      } catch (err: any) {
        setSvgStatus('error');
        showToast(err.message || '渲染失败', 'error');
      }
    } else if (actionType === 'ascii') {
      try {
        const pathRes = await workflowExecutor.executeToNode(instance.id, workflowSnapshot);
        if (!pathRes.success) {
          showToast(pathRes.errorMessage || '渲染失败', 'error');
          return;
        }

        // 统一由 applyExecutionPathResult 提交，禁止手动调用 onRecordNodeExecuted
        if ((window as any).__SUZU_APPLY_EXECUTION_RESULT__) {
          (window as any).__SUZU_APPLY_EXECUTION_RESULT__(pathRes);
        }

        const executionState = workflowExecutor.getExecutionState(instance.id);

        if (executionState.outputResourceId) {
          const res = resourceStore.getResource(executionState.outputResourceId);
          if (res && res.blob) {
            const parsed = JSON.parse(await res.blob.text()) as any;
            setRenderResult((prev) => ({ ...prev, blob: res.blob || undefined, asciiData: parsed }));
          }
        }
        showToast('ASCII 渲染成功！', 'success');
      } catch (err: any) {
        showToast(err.message || '渲染失败', 'error');
      }
    } else {
      try {
        const pathRes = await workflowExecutor.executeToNode(instance.id, workflowSnapshot);
        if (!pathRes.success) {
          showToast(pathRes.errorMessage || '渲染失败', 'error');
          return;
        }

        // 统一由 applyExecutionPathResult 提交，禁止手动调用 onRecordNodeExecuted
        if ((window as any).__SUZU_APPLY_EXECUTION_RESULT__) {
          (window as any).__SUZU_APPLY_EXECUTION_RESULT__(pathRes);
        }

        const executionState = workflowExecutor.getExecutionState(instance.id);

        if (executionState.outputResourceId) {
          const res = resourceStore.getResource(executionState.outputResourceId);
          if (res && res.blob) {
            setRenderResult((prev) => ({ ...prev, blob: res.blob || undefined }));
          }
        }
        showToast('渲染处理成功！', 'success');
      } catch (err: any) {
        showToast(err.message || '处理失败', 'error');
      }
    }
  }, [instance, draftParams, onParameterChange, onRecordNodeExecuted, showToast]);

  const handleExportSvg = useCallback(() => {
    if (!renderResult.svgString) {
      showToast('请先渲染', 'warning');
      return;
    }
    const blob = new Blob([renderResult.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vectorized_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG 文件已成功导出', 'success');
  }, [renderResult.svgString, showToast]);

  const handleAction = useCallback((actionId: string) => {
    const isSvgRender = instance.type === 'output.svg' && actionId === 'render';
    const isSvgExport = instance.type === 'output.svg' && actionId === 'export';
    const isAsciiRender = instance.type === 'output.ascii' && actionId === 'render';
    const isRgbSplitReset = instance.type === 'filter.rgbSplit' && actionId === 'reset';

    if (isInputRender(instance.type, actionId)) commitAndExecute('input');
    else if (isSvgRender || actionId === 'svg') commitAndExecute('svg');
    else if (isSvgExport || actionId === 'exportSvg') handleExportSvg();
    else if (isAsciiRender) commitAndExecute('ascii');
    else if (actionId === 'export' || actionId === 'exportFile') {
      // Unified direct file export for output.mirage & output.image
      const resourceId = instance.parameters.resourceId;
      const resource = resourceId ? resourceStore.getResource(resourceId) : undefined;
      const targetBlob = renderResult.blob || resource?.blob;

      if (targetBlob) {
        const ext = instance.type === 'output.mirage' ? 'png' : (draftParams.exportFormat || 'png');
        const url = URL.createObjectURL(targetBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${instance.type.replace('.', '_')}_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('导出图片已开始下载！', 'success');
      } else {
        commitAndExecute('export').then(() => {
          const resId = instance.parameters.resourceId;
          const res = resId ? resourceStore.getResource(resId) : undefined;
          if (res && res.blob) {
            const ext = instance.type === 'output.mirage' ? 'png' : (draftParams.exportFormat || 'png');
            const url = URL.createObjectURL(res.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${instance.type.replace('.', '_')}_${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('导出图片已开始下载！', 'success');
          }
        });
      }
    } else if (isRgbSplitReset) {
      const defaultValues = { noiseAmount: 0, l1OffsetX: 0, l1OffsetY: 0, l1Opacity: 1.0, l2OffsetX: 0, l2OffsetY: 0, l2Opacity: 1.0, l3OffsetX: 0, l3OffsetY: 0, l3Opacity: 1.0 };
      setDraftParams((prev) => {
        const next = { ...prev, ...defaultValues };
        onDraftParamsChange?.(instance.id, next);
        return next;
      });
      Object.keys(defaultValues).forEach((key) => onParameterChange?.(instance.id, key, (defaultValues as any)[key]));
      showToast('已重置为默认数值！', 'info');
    } else if (actionId === 'copy') {
      if (!renderResult.asciiData) {
        showToast('请先渲染 ASCII', 'warning');
        return;
      }
      copyAsciiToClipboard(renderResult.asciiData.text).then(() => showToast('已复制剪贴板！', 'success'));
    } else if (actionId === 'exportTxt') {
      if (!renderResult.asciiData) {
        showToast('请先渲染 ASCII', 'warning');
        return;
      }
      downloadAsciiTxt(renderResult.asciiData.text, `ascii_${Date.now()}.txt`);
    } else if (actionId === 'exportHtml') {
      if (!renderResult.asciiData) {
        showToast('请先渲染 ASCII', 'warning');
        return;
      }
      downloadAsciiHtml(renderResult.asciiData, `ascii_${Date.now()}.html`);
    } else if (actionId === 'exportPng') {
      if (!renderResult.asciiData) {
        showToast('请先渲染 ASCII', 'warning');
        return;
      }
      downloadAsciiPng(renderResult.asciiData, `ascii_${Date.now()}.png`);
    } else {
      commitAndExecute(actionId);
    }
  }, [instance.type, instance.id, instance.parameters.resourceId, draftParams.exportFormat, renderResult.asciiData, renderResult.blob, commitAndExecute, handleExportSvg, onDraftParamsChange, onParameterChange, showToast]);

  const floorMinWidth = definition.minSize?.width ?? 260;
  const floorMinHeight = useMemo(() => Math.max(definition.minSize?.height ?? 180, measuredMinHeight), [definition.minSize?.height, measuredMinHeight]);

  const NodeContent = getNodeContent(instance.type);
  const headerStyle = definition?.headerColor ? { borderTop: `3px solid ${definition.headerColor}` } : {};

  return (
    <div
      className={`visual-node ${selected ? 'selected' : ''}`}
      style={{
        ...headerStyle,
        width: '100%',
        height: '100%',
        minWidth: `${floorMinWidth}px`,
        minHeight: `${floorMinHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: isDirty ? '0 0 0 2px #f59e0b, 0 4px 12px rgba(245, 158, 11, 0.3)' : undefined
      }}
    >
      <NodeHandles nodeId={instance.id} inputs={definition.inputs} outputs={definition.outputs} />

      <NodeResizer
        isVisible={selected}
        minWidth={floorMinWidth}
        minHeight={floorMinHeight}
        onResize={(_e: any, params: any) => nodeData.onResizeNode?.(instance.id, params.width, params.height)}
        handleStyle={{ width: 8, height: 8, backgroundColor: 'var(--accent-blue)', borderRadius: 2 }}
        lineStyle={{ border: '1px solid var(--accent-blue)' }}
      />

      <NodeHeader definition={definition} instance={instance} isDirty={isDirty} onRemoveNode={onRemoveNode}>
        <NodeActions
          actions={definition.actions}
          isDirty={isDirty}
          isRunning={svgStatus === 'running'}
          hasSvgString={!!renderResult.svgString}
          onActionClick={handleAction}
        />
      </NodeHeader>

      <div ref={contentRef} className="visual-node-body nowheel" style={{ flex: 1, overflowY: 'auto' }}>
        {NodeContent && (
          <NodeContent
            instance={instance}
            definition={definition}
            isSelected={!!selected}
            draftParams={draftParams}
            livePreviewUrl={selected ? livePreview.previewUrl : null}
            liveCoverPreviewUrl={selected ? livePreview.coverPreviewUrl : null}
            liveInnerPreviewUrl={selected ? livePreview.innerPreviewUrl : null}
            liveAsciiData={selected ? livePreview.asciiData : null}
            isProcessing={livePreview.isProcessing}
            onParameterChange={handleParamChange}
            onCommitParameter={handleCommitParameter}
            onAction={handleAction}
            onRenderResult={(res) => setRenderResult((prev) => ({ ...prev, ...res }))}
          />
        )}

        <NodeParameterForm
          parameters={definition.parameters}
          values={draftParams}
          onChange={handleParamChange}
        />
      </div>
    </div>
  );
});

function isInputRender(nodeType: string, actionId: string): boolean {
  return nodeType === 'input.image' && actionId === 'render';
}

CustomNode.displayName = 'CustomNode';

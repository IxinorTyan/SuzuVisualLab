import React, { useState, useRef, useEffect } from 'react';
import { NodeContentProps } from './types';
import { resourceStore } from '../../../core/ResourceStore';
import { workflowExecutor } from '../../../core/WorkflowExecutor';
import { useToast } from '../../UI/ToastContainer';
import { ImagePreview } from '../../NodePreview/ImagePreview';
import { UploadCloud } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';

export function InputNodeContent({ instance, draftParams, onCommitParameter, onAction }: NodeContentProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const cardFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCardDragging, setIsCardDragging] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [downscaledUrl, setDownscaledUrl] = useState<string | null>(null);

  const scaleRatio = draftParams.scaleRatio ?? instance.parameters.scaleRatio ?? 100;

  const handleCardImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择有效的图片文件！', 'warning');
      return;
    }
    const resource = await resourceStore.addResource(file.name, 'image', file);

    console.log('[InputUpload]', {
      nodeId: instance.id,
      oldResourceId: instance.parameters.resourceId,
      newResourceId: resource.id,
      fileName: file.name,
      fileType: file.type
    });

    // 1. 原子更新节点正式 parameters.resourceId
    if (onCommitParameter) {
      onCommitParameter('resourceId', resource.id);
    }

    // 2. 安全同步输入节点的 draftParams.resourceId，绝不覆盖其他草稿字段
    if (onCommitParameter) {
      onCommitParameter('resourceId', resource.id);
    }

    // 3. 标记输入节点本身及全量下游为 DIRTY
    if ((window as any).__SUZU_MARK_DIRTY__) {
      (window as any).__SUZU_MARK_DIRTY__(instance.id);
    }

    // 4. 构造包含 newResourceId 的最新 workflowSnapshot，只处理输入节点 A 自身
    const activeWorkflow = (window as any).__SUZU_WORKFLOW_DATA__ || { nodes: [instance], connections: [] };
    const freshWorkflowSnapshot = {
      ...activeWorkflow,
      nodes: (activeWorkflow.nodes || []).map((n: any) =>
        n.id === instance.id ? { ...n, parameters: { ...n.parameters, resourceId: resource.id } } : n
      )
    };

    try {
      const pathRes = await workflowExecutor.executeToNode(instance.id, freshWorkflowSnapshot);
      // 5. 将 A 的运行结果通过统一入口 applyExecutionPathResult 提交，A 递增版本 1 次并恢复 clean，B/C/D 依然保持 Dirty！
      if ((window as any).__SUZU_APPLY_EXECUTION_RESULT__) {
        (window as any).__SUZU_APPLY_EXECUTION_RESULT__(pathRes);
      }
      showToast('输入图片上传成功！', 'success');
    } catch (e: any) {
      console.error('Auto process input image failed:', e);
    }
  };

  useEffect(() => {
    const resId = instance.parameters.resourceId;
    const res = resId ? resourceStore.getResource(resId) : undefined;

    if (res && res.blob) {
      const url = URL.createObjectURL(res.blob);
      setOriginalUrl(url);

      const img = document.createElement('img');
      img.onload = () => {
        const w = Math.max(1, Math.round(img.naturalWidth * (scaleRatio / 100)));
        const h = Math.max(1, Math.round(img.naturalHeight * (scaleRatio / 100)));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, w, h);
          setDownscaledUrl(canvas.toDataURL('image/png'));
        }
      };
      img.src = url;
    } else {
      setOriginalUrl(null);
      setDownscaledUrl(null);
    }
  }, [instance.parameters.resourceId, scaleRatio]);

  return (
    <div style={{ padding: '0 12px 10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="file"
        ref={cardFileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCardImageUpload(file);
          e.target.value = '';
        }}
      />

      {!originalUrl ? (
        <div
          onClick={() => cardFileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCardDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCardDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCardDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleCardImageUpload(file);
          }}
          style={{
            border: `2px dashed ${isCardDragging ? 'var(--accent-blue)' : 'var(--border-color)'}`,
            backgroundColor: isCardDragging ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
            borderRadius: '8px',
            padding: '24px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <UploadCloud size={28} style={{ color: 'var(--accent-blue)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('dropImageHere')}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {t('bindImageHint')}
          </span>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCardDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCardDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsCardDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleCardImageUpload(file);
          }}
          style={{
            position: 'relative',
            border: isCardDragging ? '2px dashed var(--accent-blue)' : 'none',
            borderRadius: '6px',
            overflow: 'hidden'
          }}
        >
          <ImagePreview
            originalUrl={originalUrl}
            downscaledUrl={downscaledUrl}
            scaleRatio={scaleRatio}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              cardFileInputRef.current?.click();
            }}
            className="nodrag"
            style={{
              position: 'absolute',
              top: '8px',
              right: '16px',
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'rgba(18, 19, 22, 0.85)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(4px)',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            {t('changeImage')}
          </button>
        </div>
      )}
    </div>
  );
}

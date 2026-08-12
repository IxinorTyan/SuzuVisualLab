import React from 'react';

interface ColorQuantizationPreviewProps {
  originalUrl: string | null;
  renderedUrl: string | null;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export const ColorQuantizationPreview: React.FC<ColorQuantizationPreviewProps> = ({
  originalUrl,
  renderedUrl,
  status,
  errorMessage
}) => {
  return (
    <div style={{ padding: '0 12px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '6px',
          padding: '8px',
          border: '1px solid var(--border-color)',
          flex: 1
        }}
      >
        {/* 左侧：原图 (Original) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
            原图 (Original)
          </span>
          <div className="node-preview-box" data-raw-high-res-url={originalUrl || undefined}>
            {originalUrl ? (
              <img
                src={originalUrl}
                alt="Original"
                className="preview-img"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>等待输入...</span>
            )}
          </div>
        </div>

        {/* 右侧：颜色量化输出图 (Quantized Output) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#06b6d4' }}>
            颜色量化 (Color Quantization)
          </span>
          <div className="node-preview-box" data-raw-high-res-url={renderedUrl || undefined} style={{ position: 'relative' }}>
            {status === 'running' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  zIndex: 2
                }}
              >
                处理中...
              </div>
            )}
            {status === 'error' ? (
              <span style={{ fontSize: '10px', color: '#ef4444', textAlign: 'center', padding: '4px' }}>
                {errorMessage || '渲染错误'}
              </span>
            ) : renderedUrl ? (
              <img
                src={renderedUrl}
                alt="Quantized Output"
                className="preview-img"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>未渲染</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

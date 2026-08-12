import React from 'react';

interface MiragePreviewProps {
  coverUrl: string | null;
  innerUrl: string | null;
  coverPreviewUrl?: string | null;
  innerPreviewUrl?: string | null;
  renderedUrl: string | null;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export const MiragePreview: React.FC<MiragePreviewProps> = ({
  coverUrl,
  innerUrl,
  coverPreviewUrl,
  innerPreviewUrl,
  renderedUrl,
  status,
  errorMessage
}) => {
  const isMissingInputs = !coverUrl || !innerUrl;

  if (isMissingInputs) {
    return (
      <div style={{ padding: '0 12px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '6px',
            padding: '24px 12px',
            border: '1px dashed var(--border-color)',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          请同时连接表图和里图
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 12px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 2x3 Grid Matrix Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '6px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '6px',
          padding: '6px',
          border: '1px solid var(--border-color)',
          minHeight: '180px',
          flex: 1
        }}
      >
        {/* Row 1, Col 1: Original Cover */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)' }}>
            原图(表)
          </span>
          <div className="node-preview-box" data-raw-high-res-url={coverUrl || undefined} style={{ width: '100%', height: '100%' }}>
            <img src={coverUrl} alt="Cover Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Row 1, Col 2: Preview Cover */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-purple)' }}>
            预览(表)
          </span>
          <div className="node-preview-box" data-raw-high-res-url={coverPreviewUrl || undefined} style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', position: 'relative' }}>
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
                  fontSize: '9px',
                  fontWeight: 600,
                  zIndex: 2
                }}
              >
                处理中...
              </div>
            )}
            {status === 'error' ? (
              <span style={{ fontSize: '9px', color: '#ef4444', textAlign: 'center', padding: '2px' }}>
                {errorMessage || '渲染错误'}
              </span>
            ) : coverPreviewUrl ? (
              <img src={coverPreviewUrl} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>未渲染</span>
            )}
          </div>
        </div>

        {/* Row 1, Col 3: Result White Bg */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
            白底结果
          </span>
          <div className="node-preview-box" data-raw-high-res-url={renderedUrl || undefined} style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', position: 'relative' }}>
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
                  fontSize: '9px',
                  fontWeight: 600,
                  zIndex: 2
                }}
              >
                处理中...
              </div>
            )}
            {status === 'error' ? (
              <span style={{ fontSize: '9px', color: '#ef4444', textAlign: 'center', padding: '2px' }}>
                {errorMessage || '渲染错误'}
              </span>
            ) : renderedUrl ? (
              <img src={renderedUrl} alt="Result White" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>未渲染</span>
            )}
          </div>
        </div>

        {/* Row 2, Col 1: Original Inner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)' }}>
            原图(里)
          </span>
          <div className="node-preview-box" data-raw-high-res-url={innerUrl || undefined} style={{ width: '100%', height: '100%' }}>
            <img src={innerUrl} alt="Inner Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Row 2, Col 2: Preview Inner */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-pink)' }}>
            预览(里)
          </span>
          <div className="node-preview-box" data-raw-high-res-url={innerPreviewUrl || undefined} style={{ width: '100%', height: '100%', backgroundColor: '#000000', position: 'relative' }}>
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
                  fontSize: '9px',
                  fontWeight: 600,
                  zIndex: 2
                }}
              >
                处理中...
              </div>
            )}
            {status === 'error' ? (
              <span style={{ fontSize: '9px', color: '#ef4444', textAlign: 'center', padding: '2px' }}>
                {errorMessage || '渲染错误'}
              </span>
            ) : innerPreviewUrl ? (
              <img src={innerPreviewUrl} alt="Inner Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>未渲染</span>
            )}
          </div>
        </div>

        {/* Row 2, Col 3: Result Black Bg */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
            黑底结果
          </span>
          <div className="node-preview-box" data-raw-high-res-url={renderedUrl || undefined} style={{ width: '100%', height: '100%', backgroundColor: '#000000', position: 'relative' }}>
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
                  fontSize: '9px',
                  fontWeight: 600,
                  zIndex: 2
                }}
              >
                处理中...
              </div>
            )}
            {status === 'error' ? (
              <span style={{ fontSize: '9px', color: '#ef4444', textAlign: 'center', padding: '2px' }}>
                {errorMessage || '渲染错误'}
              </span>
            ) : renderedUrl ? (
              <img src={renderedUrl} alt="Result Black" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>未渲染</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

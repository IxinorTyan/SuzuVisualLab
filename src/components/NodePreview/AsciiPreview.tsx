import React from 'react';
import { AsciiDataData } from '../../core/processors/ascii/asciiProcessor';
import { useLanguage } from '../../i18n/LanguageContext';

interface AsciiPreviewProps {
  originalUrl: string | null;
  asciiData: AsciiDataData | null;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
}

export const AsciiPreview: React.FC<AsciiPreviewProps> = ({
  originalUrl,
  asciiData,
  status,
  errorMessage
}) => {
  const { t } = useLanguage();
  const [renderedDataUrl, setRenderedDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!asciiData) {
      setRenderedDataUrl(null);
      return;
    }

    const { lines, colors, params } = asciiData;
    const {
      fontFamily = 'monospace',
      fontSize = 8,
      bgColor = '#000000',
      textColor = '#ffffff',
      colorMode = 'mono'
    } = params;

    const cols = lines[0]?.length || 80;
    const rows = lines.length || 40;

    const charW = Math.ceil(fontSize * 0.6);
    const charH = Math.ceil(fontSize * 1.0);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, cols * charW + 16);
    canvas.height = Math.max(1, rows * charH + 16);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px ${fontFamily}, monospace`;
    ctx.textBaseline = 'top';

    for (let r = 0; r < rows; r++) {
      const line = lines[r];
      const y = 8 + r * charH;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === ' ') continue;
        const x = 8 + c * charW;
        ctx.fillStyle = colorMode === 'color' && colors[r] && colors[r][c] ? colors[r][c] : textColor;
        ctx.fillText(char, x, y);
      }
    }

    setRenderedDataUrl(canvas.toDataURL('image/png'));
  }, [asciiData]);

  return (
    <div style={{ padding: '0 12px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Input Image -> Final ASCII side-by-side preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '6px',
          padding: '6px',
          border: '1px solid var(--border-color)',
          minHeight: '180px',
          maxHeight: '260px',
          flex: 1
        }}
      >
        {/* 1. Original Image View */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', overflow: 'hidden' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)' }}>
            1. {t('originalView')}
          </span>
          <div className="node-preview-box" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            {originalUrl ? (
              <img src={originalUrl} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>待图像输入</span>
            )}
          </div>
        </div>

        {/* 2. ASCII Render View */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', overflow: 'hidden' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: '#f59e0b' }}>
            2. ASCII 输出
          </span>
          <div
            className="node-preview-box nowheel"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: asciiData?.params.bgColor || '#000000',
              overflow: 'hidden',
              borderRadius: '4px',
              padding: '4px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {status === 'running' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '10px' }}>
                生成 ASCII 中...
              </div>
            ) : status === 'error' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', fontSize: '10px', padding: '4px', textAlign: 'center' }}>
                {errorMessage || '渲染失败'}
              </div>
            ) : renderedDataUrl ? (
              <img
                src={renderedDataUrl}
                alt="ASCII Rendered"
                className="preview-img"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '10px' }}>
                待渲染
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

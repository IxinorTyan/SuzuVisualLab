import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SVGPreview } from './SVGPreview';

interface MultiStagePreviewProps {
  originalUrl: string | null;
  denoisedUrl: string | null;
  quantizedUrl: string | null;
  svgString: string | null;
  status: 'idle' | 'running' | 'success' | 'error';
  errorMessage?: string;
  onRender: () => void;
  onExportSvg?: () => void;
}

export const MultiStagePreview: React.FC<MultiStagePreviewProps> = ({
  originalUrl,
  denoisedUrl,
  quantizedUrl,
  svgString,
  status,
  errorMessage,
  onRender,
  onExportSvg
}) => {
  const { t } = useLanguage();

  // Calculate SVG Blob Size string for display
  const svgSizeText = React.useMemo(() => {
    if (!svgString) return null;
    const bytes = new Blob([svgString]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [svgString]);

  return (
    <div style={{ padding: '0 12px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 2x2 Grid Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
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
        {/* 1. Original Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)' }}>
            1. {t('originalView')}
          </span>
          <div className="node-preview-box" style={{ width: '100%', height: '100%' }}>
            {originalUrl ? (
              <img src={originalUrl} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>待图像输入</span>
            )}
          </div>
        </div>

        {/* 2. Denoised Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-purple)' }}>
            2. {t('denoisedView')}
          </span>
          <div className="node-preview-box" style={{ width: '100%', height: '100%' }}>
            {denoisedUrl ? (
              <img src={denoisedUrl} alt="Denoised" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>待渲染</span>
            )}
          </div>
        </div>

        {/* 3. Quantized Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-pink)' }}>
            3. {t('quantizedView')}
          </span>
          <div className="node-preview-box" style={{ width: '100%', height: '100%' }}>
            {quantizedUrl ? (
              <img src={quantizedUrl} alt="Quantized" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>待渲染</span>
            )}
          </div>
        </div>

        {/* 4. SVG Vector Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%' }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--accent-blue)' }}>
            4. {t('svgView')}
          </span>
          <div style={{ width: '100%', height: '100%' }}>
            <SVGPreview svgString={svgString} />
          </div>
        </div>
      </div>

    </div>
  );
};

import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ImagePreviewProps {
  originalUrl: string | null;
  downscaledUrl: string | null;
  scaleRatio: number;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  originalUrl,
  downscaledUrl,
  scaleRatio
}) => {
  const { t } = useLanguage();

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>
            {t('originalView')}
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
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Test Pattern</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-blue)' }}>
            {t('downscaledView')} ({scaleRatio}%)
          </span>
          <div className="node-preview-box">
            {downscaledUrl ? (
              <img
                src={downscaledUrl}
                alt="Downscaled"
                className="preview-img"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  imageRendering: 'pixelated'
                }}
              />
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--accent-blue)' }}>Test Pattern</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

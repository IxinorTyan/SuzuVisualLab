import React from 'react';

interface SVGPreviewProps {
  svgString: string | null;
}

export const SVGPreview: React.FC<SVGPreviewProps> = ({ svgString }) => {
  if (!svgString) {
    return (
      <div
        className="node-preview-box"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '10px',
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--bg-primary)'
        }}
      >
        <span>无 SVG 数据</span>
      </div>
    );
  }

  // Process SVG string to force viewBox & preserveAspectRatio="xMidYMid meet"
  const formattedSvg = React.useMemo(() => {
    let s = svgString;
    if (!s.includes('preserveAspectRatio')) {
      s = s.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
    }
    // Force SVG style to fill parent flex contain box
    s = s.replace('<svg', '<svg style="width:100%; height:100%; max-width:100%; max-height:100%; display:block;"');
    return s;
  }, [svgString]);

  const [svgDataUrl, setSvgDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!svgString) {
      setSvgDataUrl(null);
      return;
    }
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setSvgDataUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [svgString]);

  return (
    <div
      className="node-preview-box"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      {svgDataUrl && (
        <img
          src={svgDataUrl}
          alt="SVG Rendered"
          className="preview-img"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
    </div>
  );
};

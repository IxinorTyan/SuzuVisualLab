import React, { useEffect, useRef } from 'react';

interface MagnifierLensProps {
  enabled?: boolean;
  zoom?: number;
  lensSize?: number;
}

interface CachedTarget {
  boxEl: HTMLElement;
  canvas: HTMLCanvasElement;
  rawHighResUrl?: string;
  version: number;
  naturalWidth: number;
  naturalHeight: number;
}

export const MagnifierLens: React.FC<MagnifierLensProps> = ({
  enabled = true,
  zoom = 4.0,
  lensSize = 220
}) => {
  const lensRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Target Change Cache References
  const activeTargetRef = useRef<CachedTarget | null>(null);
  const captureVersionRef = useRef<number>(0);

  useEffect(() => {
    const lens = lensRef.current;
    const canvas = canvasRef.current;
    if (!lens || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Helper: get background color of boxEl or fallback to #000000
    const getBoxBgColor = (boxEl: HTMLElement): string => {
      const computedStyle = window.getComputedStyle(boxEl);
      const bgColor = computedStyle.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        return bgColor;
      }
      return '#000000';
    };

    // Build or update High-Res Canvas ONLY when target preview box changes
    const updateTargetCache = (boxEl: HTMLElement): void => {
      const rawHighResUrl = boxEl.dataset.rawHighResUrl;

      // Skip capture if hovering the exact same target with identical rawHighResUrl
      if (
        activeTargetRef.current &&
        activeTargetRef.current.boxEl === boxEl &&
        activeTargetRef.current.rawHighResUrl === rawHighResUrl
      ) {
        return;
      }

      const version = ++captureVersionRef.current;

      const rect = boxEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        activeTargetRef.current = null;
        return;
      }

      const imgEl = boxEl.querySelector('img');
      const svgEl = boxEl.querySelector('svg');
      const canvasEl = boxEl.querySelector('canvas');
      const preEl = boxEl.querySelector('pre');

      const bgColor = getBoxBgColor(boxEl);

      // 1. Target with dataset.rawHighResUrl (Asynchronous Image Loading with Version Lock)
      if (rawHighResUrl) {
        const highResImg = new Image();
        highResImg.src = rawHighResUrl;

        const applyHighResImg = () => {
          if (captureVersionRef.current !== version) return; // Stale async request check
          if (highResImg.naturalWidth <= 0 || highResImg.naturalHeight <= 0) return;

          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = highResImg.naturalWidth;
          fullCanvas.height = highResImg.naturalHeight;
          const fullCtx = fullCanvas.getContext('2d');
          if (fullCtx) {
            fullCtx.fillStyle = bgColor;
            fullCtx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
            fullCtx.drawImage(highResImg, 0, 0);
            activeTargetRef.current = {
              boxEl,
              canvas: fullCanvas,
              rawHighResUrl,
              version,
              naturalWidth: highResImg.naturalWidth,
              naturalHeight: highResImg.naturalHeight
            };
          }
        };

        if (highResImg.complete && highResImg.naturalWidth > 0) {
          applyHighResImg();
        } else {
          highResImg.onload = applyHighResImg;
        }
        return;
      }

      // 2. Fallback: Standard <img> DOM element
      if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
        const imgCanvas = document.createElement('canvas');
        imgCanvas.width = imgEl.naturalWidth;
        imgCanvas.height = imgEl.naturalHeight;
        const imgCtx = imgCanvas.getContext('2d');
        if (imgCtx) {
          imgCtx.fillStyle = bgColor;
          imgCtx.fillRect(0, 0, imgCanvas.width, imgCanvas.height);
          imgCtx.drawImage(imgEl, 0, 0);
          activeTargetRef.current = {
            boxEl,
            canvas: imgCanvas,
            version,
            naturalWidth: imgEl.naturalWidth,
            naturalHeight: imgEl.naturalHeight
          };
          return;
        }
      }

      // 3. Fallback: <canvas> DOM element
      if (canvasEl && canvasEl.width > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasEl.width;
        tempCanvas.height = canvasEl.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.fillStyle = bgColor;
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(canvasEl, 0, 0);
          activeTargetRef.current = {
            boxEl,
            canvas: tempCanvas,
            version,
            naturalWidth: canvasEl.width,
            naturalHeight: canvasEl.height
          };
          return;
        }
      }

      // 4. Fallback: <svg> DOM element
      if (svgEl) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(rect.width * 2);
        tempCanvas.height = Math.round(rect.height * 2);
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          const xml = new XMLSerializer().serializeToString(svgEl);
          const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const img = new Image();
          img.onload = () => {
            if (captureVersionRef.current !== version) return;
            tempCtx.fillStyle = bgColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            URL.revokeObjectURL(url);
            activeTargetRef.current = {
              boxEl,
              canvas: tempCanvas,
              version,
              naturalWidth: tempCanvas.width,
              naturalHeight: tempCanvas.height
            };
          };
          img.src = url;
          return;
        }
      }

      // 5. Fallback: <pre> DOM element
      if (preEl) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(rect.width * 2);
        tempCanvas.height = Math.round(rect.height * 2);
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          const style = window.getComputedStyle(preEl);
          const preBgColor = style.backgroundColor || bgColor;
          tempCtx.fillStyle = preBgColor;
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

          const text = preEl.textContent || '';
          const lines = text.split('\n');
          const fontSize = parseFloat(style.fontSize) * 2 || 16;
          tempCtx.font = `${fontSize}px ${style.fontFamily || 'monospace'}`;
          tempCtx.fillStyle = style.color || '#ffffff';
          tempCtx.textBaseline = 'top';

          const lineHeight = fontSize;
          for (let i = 0; i < lines.length; i++) {
            tempCtx.fillText(lines[i], 8, i * lineHeight + 8);
          }
          activeTargetRef.current = {
            boxEl,
            canvas: tempCanvas,
            version,
            naturalWidth: tempCanvas.width,
            naturalHeight: tempCanvas.height
          };
          return;
        }
      }

      activeTargetRef.current = null;
    };

    // Ultra-Fast Zero-Allocation MouseMove Listener
    // Performs ZERO Canvas / Image instantiation or full-image drawImage during mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (!enabled) {
        lens.style.display = 'none';
        return;
      }

      const target = e.target as HTMLElement;
      const boxEl = target.closest('.node-preview-box') as HTMLElement | null;

      if (!boxEl) {
        lens.style.display = 'none';
        activeTargetRef.current = null;
        return;
      }

      // Execute cache update ONLY if entering or switching target
      updateTargetCache(boxEl);

      const cached = activeTargetRef.current;
      if (!cached || cached.boxEl !== boxEl || !cached.canvas) {
        lens.style.display = 'none';
        return;
      }

      const rect = boxEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        lens.style.display = 'none';
        return;
      }

      // Calculate object-fit: contain rendered sub-rectangle inside boxEl
      const imgAspect = cached.naturalWidth / cached.naturalHeight;
      const boxAspect = rect.width / rect.height;

      let renderW = rect.width;
      let renderH = rect.height;
      let offX = 0;
      let offY = 0;

      if (imgAspect > boxAspect) {
        renderH = rect.width / imgAspect;
        offY = (rect.height - renderH) / 2;
      } else {
        renderW = rect.height * imgAspect;
        offX = (rect.width - renderW) / 2;
      }

      // If mouse is within letterbox padding, hide lens
      const imgX = x - offX;
      const imgY = y - offY;

      if (imgX < 0 || imgY < 0 || imgX > renderW || imgY > renderH) {
        lens.style.display = 'none';
        return;
      }

      lens.style.display = 'block';
      lens.style.left = `${e.clientX - lensSize / 2}px`;
      lens.style.top = `${e.clientY - lensSize / 2}px`;

      const rx = imgX / renderW;
      const ry = imgY / renderH;

      const sx = rx * cached.canvas.width;
      const sy = ry * cached.canvas.height;

      const cropW = (lensSize / zoom) * (cached.canvas.width / renderW);
      const cropH = (lensSize / zoom) * (cached.canvas.height / renderH);

      ctx.clearRect(0, 0, lensSize, lensSize);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      try {
        // Fast O(1) small crop drawImage from pre-built cached canvas
        ctx.drawImage(
          cached.canvas,
          Math.max(0, sx - cropW / 2),
          Math.max(0, sy - cropH / 2),
          cropW,
          cropH,
          0,
          0,
          lensSize,
          lensSize
        );
      } catch (err) {
        // Ignore edge-case draw bounds errors
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      activeTargetRef.current = null;
    };
  }, [enabled, zoom, lensSize]);

  return (
    <div
      ref={lensRef}
      style={{
        position: 'fixed',
        width: `${lensSize}px`,
        height: `${lensSize}px`,
        borderRadius: '50%',
        border: '3px solid var(--accent-blue)',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.7), 0 0 10px var(--accent-blue)',
        pointerEvents: 'none',
        zIndex: 99999,
        display: 'none',
        overflow: 'hidden',
        backgroundColor: '#121316'
      }}
    >
      <canvas ref={canvasRef} width={lensSize} height={lensSize} />
    </div>
  );
};

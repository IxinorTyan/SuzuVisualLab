import { AsciiDataData } from './asciiProcessor';

export function renderAsciiToCanvas(asciiData: AsciiDataData): HTMLCanvasElement {
  const { lines, colors, cols, rows, params } = asciiData;
  const {
    colorMode = 'mono',
    textColor = '#ffffff',
    bgColor = '#000000',
    fontFamily = 'monospace',
    fontSize = 12
  } = params;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.font = `${fontSize}px ${fontFamily}`;
  const charWidth = ctx.measureText('M').width || fontSize * 0.6;
  const charHeight = fontSize;

  canvas.width = Math.max(1, Math.ceil(cols * charWidth));
  canvas.height = Math.max(1, Math.ceil(rows * charHeight));

  // Reset context properties after resize
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const isColor = colorMode === 'color';

  for (let r = 0; r < rows; r++) {
    const line = lines[r];
    if (!line) continue;
    for (let c = 0; c < cols; c++) {
      const char = line[c];
      if (!char || char === ' ') continue;

      ctx.fillStyle = isColor && colors[r] && colors[r][c] ? colors[r][c] : textColor;
      ctx.fillText(char, c * charWidth, r * charHeight);
    }
  }

  return canvas;
}

import { resourceStore } from '../../ResourceStore';

export interface AsciiProcessParams {
  preset?: 'default' | 'simple' | 'binary' | 'blocks' | 'custom';
  customCharSet?: string;
  invertCharSet?: boolean;
  includeSpace?: boolean;
  resolutionCols?: number;
  widthRatio?: number;
  heightRatio?: number;
  colorMode?: 'mono' | 'color';
  textColor?: string;
  bgColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface AsciiDataData {
  text: string;
  lines: string[];
  colors: string[][];
  cols: number;
  rows: number;
  params: AsciiProcessParams;
}

export interface AsciiProcessResult {
  resourceId: string;
  asciiData: AsciiDataData;
  originalUrl: string;
}

export const ASCII_PRESETS: Record<string, string> = {
  default: 'M@N%W$E#RK&FXYI*l]}1/+i>"!~`:\'. ',
  simple: '@#S%?*+:;,. ',
  binary: '01 ',
  blocks: '█▓▒░ '
};

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function imageDataToDataUrl(data: Uint8ClampedArray, width: number, height: number): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const clamped = new Uint8ClampedArray(data);
  ctx.putImageData(new ImageData(clamped, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

export async function processImageToAscii(
  inputBlob: Blob,
  params: AsciiProcessParams
): Promise<AsciiProcessResult> {
  const {
    preset = 'default',
    customCharSet = '',
    invertCharSet = false,
    includeSpace = true,
    resolutionCols = 80,
    widthRatio = 1.0,
    heightRatio = 0.5,
    colorMode = 'mono',
    textColor = '#ffffff',
    bgColor = '#000000',
    fontFamily = 'monospace',
    fontSize = 12
  } = params;

  // 1. Prepare Charset
  let chars = preset === 'custom' ? customCharSet : ASCII_PRESETS[preset] || ASCII_PRESETS.default;
  if (includeSpace) {
    if (!chars.includes(' ')) chars = chars + ' ';
  } else {
    chars = chars.replace(/ /g, '');
  }
  if (!chars) chars = ' ';

  if (invertCharSet) {
    chars = Array.from(chars).reverse().join('');
  }

  // 2. Load Blob to Image
  const imgBitmap = await createImageBitmap(inputBlob);
  const origCanvas = document.createElement('canvas');
  origCanvas.width = imgBitmap.width;
  origCanvas.height = imgBitmap.height;
  const origCtx = origCanvas.getContext('2d');
  if (!origCtx) throw new Error('Failed to get 2d context for ASCII processing');
  origCtx.drawImage(imgBitmap, 0, 0);
  const origImageData = origCtx.getImageData(0, 0, imgBitmap.width, imgBitmap.height);
  const originalUrl = imageDataToDataUrl(origImageData.data, origImageData.width, origImageData.height);

  await yieldToMain();

  // 3. Downsample to cols x rows grid
  const cols = Math.max(10, Math.min(300, resolutionCols));
  const imgAspect = imgBitmap.width / imgBitmap.height;
  const rows = Math.max(1, Math.round((cols / imgAspect) * (heightRatio / widthRatio)));

  const pCanvas = document.createElement('canvas');
  pCanvas.width = cols;
  pCanvas.height = rows;
  const pCtx = pCanvas.getContext('2d');
  if (!pCtx) throw new Error('Failed to get 2d context for ASCII pixel sampling');
  pCtx.drawImage(imgBitmap, 0, 0, cols, rows);

  const imgData = pCtx.getImageData(0, 0, cols, rows);
  const pixels = imgData.data;
  const charLen = chars.length;

  const asciiLines: string[] = [];
  const pixelColors: string[][] = [];

  for (let r = 0; r < rows; r++) {
    let line = '';
    const rowColors: string[] = [];
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 4;
      const red = pixels[idx];
      const green = pixels[idx + 1];
      const blue = pixels[idx + 2];
      const alpha = pixels[idx + 3];

      if (alpha === 0) {
        line += ' ';
        rowColors.push('rgba(0,0,0,0)');
        continue;
      }

      // Grayscale calculation formula (BT.709)
      const gray = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const charIdx = Math.floor((gray / 256) * charLen);
      const char = chars[Math.min(charIdx, charLen - 1)];

      line += char;
      rowColors.push(`rgb(${red},${green},${blue})`);
    }
    asciiLines.push(line);
    pixelColors.push(rowColors);
  }

  const generatedAsciiText = asciiLines.join('\n');

  const asciiData: AsciiDataData = {
    text: generatedAsciiText,
    lines: asciiLines,
    colors: pixelColors,
    cols,
    rows,
    params: {
      preset,
      customCharSet,
      invertCharSet,
      includeSpace,
      resolutionCols,
      widthRatio,
      heightRatio,
      colorMode,
      textColor,
      bgColor,
      fontFamily,
      fontSize
    }
  };

  // Add resource to ResourceStore (Remove redundant Base64 originalUrl from metadata)
  const asciiJsonBlob = new Blob([JSON.stringify(asciiData)], { type: 'application/json' });
  const resource = await resourceStore.addResource(
    `ascii_${Date.now()}.json`,
    'unknown',
    asciiJsonBlob,
    {
      cols,
      rows,
      textLength: generatedAsciiText.length
    }
  );

  return {
    resourceId: resource.id,
    asciiData,
    originalUrl
  };
}

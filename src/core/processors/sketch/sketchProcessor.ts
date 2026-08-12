import { resourceStore } from '../../ResourceStore';
import { SketchFilters } from './sketchFilters';
import { SketchBlend } from './sketchBlend';

export interface SketchOptions {
  layer0Opacity?: number;
  layer1Opacity?: number;
  layer2Opacity?: number;
  layer3Opacity?: number;
  layer3ColorMode?: string;
  layer3CustomColor?: string;
  layer2MinimumRadius?: number;
  layer3BlendMode?: string;
}

export interface SketchResult {
  resourceId: string;
  width: number;
  height: number;
}

function parseHexColor(hex: string): [number, number, number] {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16) || 0;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function createColorLayer(
  width: number,
  height: number,
  colorSpec: string,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
): ImageData {
  if (colorSpec === 'rainbow') {
    canvas.width = width;
    canvas.height = height;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#fbba30');
    grad.addColorStop(0.4, '#fc7235');
    grad.addColorStop(0.6, '#fc354e');
    grad.addColorStop(0.7, '#cf36df');
    grad.addColorStop(0.8, '#37b5d9');
    grad.addColorStop(1, '#3eb6da');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }

  const [r, g, b] = parseHexColor(colorSpec);
  const imgData = new ImageData(width, height);
  const data = imgData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }

  return imgData;
}

export async function processImageToSketch(
  inputBlob: Blob,
  options: SketchOptions = {}
): Promise<SketchResult> {
  const {
    layer0Opacity = 1.0,
    layer1Opacity = 1.0,
    layer2Opacity = 1.0,
    layer3Opacity = 1.0,
    layer3ColorMode = 'solid',
    layer3CustomColor = '#000000',
    layer2MinimumRadius = 3,
    layer3BlendMode = 'soft-light'
  } = options;

  const colorSpec = layer3ColorMode === 'rainbow' ? 'rainbow' : layer3CustomColor;

  // Load image from blob
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(inputBlob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    image.src = url;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const maxWidth = 1600;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法创建 Canvas 2D 上下文');
  }

  ctx.drawImage(img, 0, 0, width, height);
  const layer0 = ctx.getImageData(0, 0, width, height);

  // Layer 1: Grayscale
  const layer1 = SketchFilters.grayscale(layer0);

  // Layer 2: Invert -> Minimum Filter -> Color Dodge
  const layer2Inverted = SketchFilters.invert(layer1);
  const layer2Min = SketchFilters.minimumFilter(layer2Inverted, layer2MinimumRadius);
  const layer2 = SketchBlend.colorDodge(layer1, layer2Min);

  // Layer 3: Color layer
  const layer3 = createColorLayer(width, height, colorSpec, ctx, canvas);

  // Composite Layers
  const composite = new ImageData(width, height);
  const compData = composite.data;
  const len = compData.length;

  const l0Data = layer0.data;
  const l1Data = layer1.data;
  const l2Data = layer2.data;

  for (let i = 0; i < len; i += 4) {
    const alpha = l0Data[i + 3];
    if (alpha === 0) {
      compData[i] = 0;
      compData[i + 1] = 0;
      compData[i + 2] = 0;
      compData[i + 3] = 0;
      continue;
    }

    let r = 255;
    let g = 255;
    let b = 255;

    // Layer 0
    if (layer0Opacity > 0) {
      r = r * (1 - layer0Opacity) + l0Data[i] * layer0Opacity;
      g = g * (1 - layer0Opacity) + l0Data[i + 1] * layer0Opacity;
      b = b * (1 - layer0Opacity) + l0Data[i + 2] * layer0Opacity;
    }

    // Layer 1 (Multiply)
    if (layer1Opacity > 0) {
      const multR = (r * l1Data[i]) / 255;
      const multG = (g * l1Data[i + 1]) / 255;
      const multB = (b * l1Data[i + 2]) / 255;

      r = r * (1 - layer1Opacity) + multR * layer1Opacity;
      g = g * (1 - layer1Opacity) + multG * layer1Opacity;
      b = b * (1 - layer1Opacity) + multB * layer1Opacity;
    }

    // Layer 2 (Multiply)
    if (layer2Opacity > 0) {
      const multR = (r * l2Data[i]) / 255;
      const multG = (g * l2Data[i + 1]) / 255;
      const multB = (b * l2Data[i + 2]) / 255;

      r = r * (1 - layer2Opacity) + multR * layer2Opacity;
      g = g * (1 - layer2Opacity) + multG * layer2Opacity;
      b = b * (1 - layer2Opacity) + multB * layer2Opacity;
    }

    compData[i] = Math.min(255, Math.max(0, Math.round(r)));
    compData[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
    compData[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
    compData[i + 3] = alpha;
  }

  let finalData = composite;
  if (layer3Opacity > 0) {
    finalData = SketchBlend.blendLayers(composite, layer3, layer3BlendMode, layer3Opacity);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.putImageData(finalData, 0, 0);

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      // Cleanup canvas memory
      canvas.width = 0;
      canvas.height = 0;
      if (b) resolve(b);
      else reject(new Error('Canvas 导出二进制 Blob 失败'));
    }, 'image/png');
  });

  const resItem = await resourceStore.addResource('sketch_output.png', 'image', outputBlob);

  return {
    resourceId: resItem.id,
    width,
    height
  };
}

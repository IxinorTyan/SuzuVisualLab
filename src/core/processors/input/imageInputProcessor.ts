import { resourceStore } from '../../ResourceStore';
import { medianFilter } from '../svg/svgPipeline';

export interface ImageInputParams {
  denoiseRadius?: number;
  scaleRatio?: number;
}

export interface ImageInputResult {
  resourceId: string;
}

export async function processInputImage(
  rawBlob: Blob,
  params: ImageInputParams = {}
): Promise<ImageInputResult> {
  const { denoiseRadius = 0, scaleRatio = 100 } = params;

  // 1. Load image blob to HTMLImageElement
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(rawBlob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    image.src = url;
  });

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = origWidth;
  canvas.height = origHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 2D Canvas');

  ctx.drawImage(img, 0, 0, origWidth, origHeight);
  let imageData = ctx.getImageData(0, 0, origWidth, origHeight);

  // 2. Step 1: Denoise Filter (Median Filter) if denoiseRadius > 0
  if (denoiseRadius > 0) {
    const filtered = medianFilter(
      { data: imageData.data, width: origWidth, height: origHeight },
      Math.round(denoiseRadius)
    );
    imageData = new ImageData(new Uint8ClampedArray(filtered.data), origWidth, origHeight);
  }

  // 3. Step 2: Scale Ratio Resampling
  const clampedScale = Math.max(10, Math.min(100, Number(scaleRatio) || 100));
  const scale = clampedScale / 100;

  const targetWidth = Math.max(1, Math.round(origWidth * scale));
  const targetHeight = Math.max(1, Math.round(origHeight * scale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetWidth;
  outCanvas.height = targetHeight;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('无法创建输出 Canvas');

  if (denoiseRadius > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = origWidth;
    tempCanvas.height = origHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(imageData, 0, 0);
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);
    }
  } else {
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = 'high';
    outCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
  }

  const processedBlob = await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('输入图片处理转换失败'));
    }, 'image/png');
  });

  const resItem = await resourceStore.addResource('input_processed.png', 'image', processedBlob);

  return {
    resourceId: resItem.id
  };
}

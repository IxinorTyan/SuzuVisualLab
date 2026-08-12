import { resourceStore, ResourceItem } from '../../ResourceStore';
import {
  preprocessInput,
  medianFilter,
  bilateralFilter,
  kmeansQuantize,
  despeckleAndMerge,
  traceContoursShared,
  fitCurvesToRegions,
  buildSVG,
  ImageInputData
} from './svgPipeline';

export interface SvgVectorizeParams {
  scalePercent?: number;
  colorCount?: number;
  medianRadius?: number;
  despeckleMinArea?: number;
  simplifyEpsilon?: number;
  cornerHardness?: number;
  bezierTolerance?: number;
  bilateral?: boolean;
  seamGuard?: boolean;
  vectorMode?: 'smooth' | 'line';
}

export interface VectorizeProcessResult {
  svgResourceId: string;
  originalUrl: string;
  denoisedUrl: string;
  quantizedUrl: string;
  svgString: string;
}

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

function labelsToDataUrl(labels: Int32Array, palette: number[][], width: number, height: number): string {
  if (typeof document === 'undefined') return '';
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const color = palette[labels[i]];
    if (color) {
      data[i * 4] = color[0];
      data[i * 4 + 1] = color[1];
      data[i * 4 + 2] = color[2];
      data[i * 4 + 3] = color[3] !== undefined ? color[3] : 255;
    }
  }
  return imageDataToDataUrl(data, width, height);
}

export async function processImageToSvg(
  inputBlob: Blob,
  params: SvgVectorizeParams
): Promise<VectorizeProcessResult> {
  const {
    scalePercent = 100,
    colorCount = 16,
    medianRadius = 1,
    despeckleMinArea = 40,
    simplifyEpsilon = 1.2,
    cornerHardness = 50,
    bezierTolerance = 0.8,
    bilateral = false,
    seamGuard = false,
    vectorMode = 'smooth'
  } = params;

  // 1. Load Blob into ImageInputData
  const imgBitmap = await createImageBitmap(inputBlob);
  const canvas = document.createElement('canvas');
  canvas.width = imgBitmap.width;
  canvas.height = imgBitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context for image conversion');
  ctx.drawImage(imgBitmap, 0, 0);
  const imgData = ctx.getImageData(0, 0, imgBitmap.width, imgBitmap.height);
  const rawInput: ImageInputData = {
    data: new Uint8ClampedArray(imgData.data),
    width: imgBitmap.width,
    height: imgBitmap.height
  };

  await yieldToMain();

  // Stage 0: Preprocessing
  const { img: processedImageData } = preprocessInput(rawInput, { scalePercent });
  const originalUrl = imageDataToDataUrl(processedImageData.data, processedImageData.width, processedImageData.height);

  await yieldToMain();

  // Stage 1: Denoise
  const denoised = bilateral
    ? bilateralFilter(processedImageData, medianRadius)
    : medianFilter(processedImageData, medianRadius);
  const denoisedUrl = imageDataToDataUrl(denoised.data, denoised.width, denoised.height);

  await yieldToMain();

  // Stage 1.5: Quantize & Despeckle
  const { labels, palette, width, height } = kmeansQuantize(denoised, colorCount);
  despeckleAndMerge(labels, width, height, despeckleMinArea);
  const quantizedUrl = labelsToDataUrl(labels, palette, width, height);

  await yieldToMain();

  // Stage 2 & 3: Contour Tracing
  const contourRes = traceContoursShared(labels, width, height, palette.length, simplifyEpsilon);
  let regions = contourRes.regions;

  await yieldToMain();

  // Stage 4 & 5: Curve Fitting (if smooth) vs Pure Polyline RDP (if line)
  if (vectorMode === 'smooth') {
    const curveRes = fitCurvesToRegions(regions, { cornerHardness, bezierTolerance });
    regions = curveRes.regions;
  } else {
    // For pure 'line' mode, force pathSegments to be null/undefined so buildSVG strictly uses simplifyLoop RDP polylines
    regions = regions.map((r: any) => ({
      ...r,
      pathSegments: undefined
    }));
  }

  await yieldToMain();

  // Stage 7: Build SVG
  const svgRes = buildSVG(regions, palette, width, height, 0, seamGuard);
  const svgString = svgRes.svg;

  // Create SVG blob & save into ResourceStore with stage preview DataURLs in metadata
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
  const resource = await resourceStore.addResource(
    `vectorized_${Date.now()}.svg`,
    'image',
    svgBlob,
    {
      mimeType: 'image/svg+xml',
      width,
      height,
      denoisedUrl,   // 降噪图 DataURL - 步骤 2
      quantizedUrl   // 量化图 DataURL - 步骤 3
    }
  );

  return {
    svgResourceId: resource.id,
    originalUrl,
    denoisedUrl,
    quantizedUrl,
    svgString
  };
}

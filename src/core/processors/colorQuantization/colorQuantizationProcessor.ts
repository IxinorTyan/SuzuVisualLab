/**
 * colorQuantizationProcessor.ts
 * 颜色量化 (Color Quantization) 算法处理器
 * 核心算法：基于 K-Means 色彩聚类，严格保护 PNG Alpha 透明通道。
 */

import { resourceStore } from '../../ResourceStore';

export interface ColorQuantizationOptions {
  k?: number;             // 聚类颜色数，默认 8 (范围 2~64)
  maxIterations?: number; // 最大迭代次数，默认 10 (范围 1~30)
}

export interface ColorQuantizationResult {
  resourceId: string;
  width: number;
  height: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * 纯算法：K-Means 颜色量化处理 ImageData (原地修改 imageData)
 */
export function applyKMeansQuantization(
  imageData: ImageData,
  kRaw = 8,
  maxIterRaw = 10
): void {
  const k = clamp(Math.round(kRaw), 2, 64);
  const maxIter = clamp(Math.round(maxIterRaw), 1, 30);

  const data = imageData.data;
  const pixelCount = data.length / 4;

  // 1. 收集非完全透明 (alpha > 0) 像素的 RGB 指针及数据
  // 保存其在 data 数组中的 pixel index (0 ~ pixelCount - 1)
  const validPixelIndices: number[] = [];
  for (let i = 0; i < pixelCount; i++) {
    const alpha = data[i * 4 + 3];
    if (alpha > 0) {
      validPixelIndices.push(i);
    }
  }

  const validCount = validPixelIndices.length;
  // 若有效像素数量少于等于 k，直接返回保持原样
  if (validCount === 0 || validCount <= k) {
    return;
  }

  // 2. 确定性采样初始化 K 个质心 (Deterministic Grid Sampling)
  // 采用网格均匀分布采样，避免 Math.random 导致的不稳定渲染结果
  const centers: number[][] = [];
  const step = validCount / k;
  for (let c = 0; c < k; c++) {
    const idx = validPixelIndices[Math.floor(c * step)];
    const offset = idx * 4;
    centers.push([data[offset], data[offset + 1], data[offset + 2]]);
  }

  // 分配数组：保存每个有效像素所属的 cluster index (0 ~ k - 1)
  const assignments = new Int32Array(validCount);

  // 3. K-Means 迭代过程
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;

    // 步骤 A: 分配像素到最近质心 (Euclidean Distance in RGB)
    for (let i = 0; i < validCount; i++) {
      const pIdx = validPixelIndices[i];
      const offset = pIdx * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      let minDist = Infinity;
      let minCluster = 0;

      for (let c = 0; c < k; c++) {
        const center = centers[c];
        const dr = r - center[0];
        const dg = g - center[1];
        const db = b - center[2];
        const dist = dr * dr + dg * dg + db * db;

        if (dist < minDist) {
          minDist = dist;
          minCluster = c;
        }
      }

      if (assignments[i] !== minCluster) {
        assignments[i] = minCluster;
        changed = true;
      }
    }

    // 若本轮无像素质心分配变化，提早收敛退出
    if (!changed) {
      break;
    }

    // 步骤 B: 重新计算各 Cluster 质心均值
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    const counts = new Int32Array(k);

    for (let i = 0; i < validCount; i++) {
      const cluster = assignments[i];
      const pIdx = validPixelIndices[i];
      const offset = pIdx * 4;

      sums[cluster][0] += data[offset];
      sums[cluster][1] += data[offset + 1];
      sums[cluster][2] += data[offset + 2];
      counts[cluster]++;
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centers[c][0] = Math.round(sums[c][0] / counts[c]);
        centers[c][1] = Math.round(sums[c][1] / counts[c]);
        centers[c][2] = Math.round(sums[c][2] / counts[c]);
      }
    }
  }

  // 4. 将质心 RGB 写回有效像素，原样保留 Alpha 通道
  for (let i = 0; i < validCount; i++) {
    const pIdx = validPixelIndices[i];
    const offset = pIdx * 4;
    const cluster = assignments[i];
    const center = centers[cluster];

    data[offset] = center[0];
    data[offset + 1] = center[1];
    data[offset + 2] = center[2];
    // data[offset + 3] (Alpha) 严格原样保持不变
  }
}

/**
 * 纯算法处理：Image/Bitmap -> 颜色量化 Canvas
 */
export function processColorQuantizationCanvas(
  img: HTMLImageElement | ImageBitmap,
  options: ColorQuantizationOptions = {}
): HTMLCanvasElement {
  const origWidth = ('naturalWidth' in img ? img.naturalWidth : img.width) || img.width;
  const origHeight = ('naturalHeight' in img ? img.naturalHeight : img.height) || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = origWidth;
  canvas.height = origHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法创建 2D Canvas 上下文');
  }

  // 显式清空，保护透明通道
  ctx.clearRect(0, 0, origWidth, origHeight);
  ctx.drawImage(img, 0, 0, origWidth, origHeight);

  const imageData = ctx.getImageData(0, 0, origWidth, origHeight);
  applyKMeansQuantization(imageData, options.k, options.maxIterations);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * Workflow 入口：Blob 输入 -> 颜色量化 -> ResourceStore 保存
 */
export async function processImageToColorQuantization(
  inputBlob: Blob,
  options: ColorQuantizationOptions = {}
): Promise<ColorQuantizationResult> {
  let imgBitmap: ImageBitmap | null = null;
  let imgElement: HTMLImageElement | null = null;
  let width = 0;
  let height = 0;

  try {
    if (typeof createImageBitmap === 'function') {
      imgBitmap = await createImageBitmap(inputBlob);
      width = imgBitmap.width;
      height = imgBitmap.height;
    }
  } catch (e) {
    // Fallback
  }

  if (!imgBitmap) {
    imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
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
    width = imgElement.naturalWidth || imgElement.width;
    height = imgElement.naturalHeight || imgElement.height;
  }

  const sourceInput = imgBitmap || imgElement!;
  const canvas = processColorQuantizationCanvas(sourceInput, options);

  // 及时释放 ImageBitmap 资源
  if (imgBitmap) {
    imgBitmap.close();
  }

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas 导出二进制 PNG Blob 失败'));
    }, 'image/png');
  });

  // 及时清理临时 Canvas
  canvas.width = 0;
  canvas.height = 0;

  const resItem = await resourceStore.addResource('color_quantization_output.png', 'image', outputBlob);

  return {
    resourceId: resItem.id,
    width,
    height
  };
}

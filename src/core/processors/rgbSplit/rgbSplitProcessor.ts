/**
 * rgbSplitProcessor.ts
 * 纯图像算法 Processor，绝不依赖 ResourceStore，保持纯函数/算法层定位。
 * 1:1 移植自 saibo/js/renderer.js (GlitchProcessor)
 */

import { resourceStore } from '../../ResourceStore';
import { applyNoise } from './noise';
import { createRDisabledLayer, createGDisabledLayer, createBDisabledLayer } from './channels';
import { blendChannelLayer } from './blend';

export interface RgbSplitOptions {
  noiseAmount?: number;

  // Layer 1 (Close R)
  l1OffsetX?: number;
  l1OffsetY?: number;
  l1Opacity?: number;

  // Layer 2 (Close G)
  l2OffsetX?: number;
  l2OffsetY?: number;
  l2Opacity?: number;

  // Layer 3 (Close B)
  l3OffsetX?: number;
  l3OffsetY?: number;
  l3Opacity?: number;
}

export interface RgbSplitResult {
  resourceId: string;
  width: number;
  height: number;
}

/**
 * 纯算法：处理 ImageData -> RGB Split 后的 ImageData
 */
export function processRgbSplitImageData(
  originalImageData: ImageData,
  options: RgbSplitOptions = {}
): ImageData {
  const params = {
    noiseAmount: options.noiseAmount ?? 0,

    l1OffsetX: options.l1OffsetX ?? 0,
    l1OffsetY: options.l1OffsetY ?? 0,
    l1Opacity: options.l1Opacity ?? 1.0,

    l2OffsetX: options.l2OffsetX ?? 0,
    l2OffsetY: options.l2OffsetY ?? 0,
    l2Opacity: options.l2Opacity ?? 1.0,

    l3OffsetX: options.l3OffsetX ?? 0,
    l3OffsetY: options.l3OffsetY ?? 0,
    l3Opacity: options.l3Opacity ?? 1.0,
  };

  // 1. Layer 0 (Noise Layer)
  const layer0ImageData = applyNoise(originalImageData, params.noiseAmount);

  // 2. 从 Layer 0 派生三个 Channel Layer
  const layer1 = createRDisabledLayer(layer0ImageData); // Disable R
  const layer2 = createGDisabledLayer(layer0ImageData); // Disable G
  const layer3 = createBDisabledLayer(layer0ImageData); // Disable B

  // 3. 顺序合成
  let base = layer0ImageData;

  // 叠加 Layer 1 (Disable R)
  base = blendChannelLayer(
    base,
    layer1.imageData,
    params.l1OffsetX,
    params.l1OffsetY,
    params.l1Opacity,
    layer1.disabledChannel
  );

  // 叠加 Layer 2 (Disable G)
  base = blendChannelLayer(
    base,
    layer2.imageData,
    params.l2OffsetX,
    params.l2OffsetY,
    params.l2Opacity,
    layer2.disabledChannel
  );

  // 叠加 Layer 3 (Disable B)
  base = blendChannelLayer(
    base,
    layer3.imageData,
    params.l3OffsetX,
    params.l3OffsetY,
    params.l3Opacity,
    layer3.disabledChannel
  );

  return base;
}

/**
 * Workflow 入口封装：Blob 输入 -> RGB Split 核心计算 -> 输出 Resource 关联
 */
export async function processImageToRgbSplit(
  inputBlob: Blob,
  options: RgbSplitOptions = {}
): Promise<RgbSplitResult> {
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

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法创建 Canvas 2D 上下文');
  }

  ctx.drawImage(img, 0, 0, width, height);
  const originalImageData = ctx.getImageData(0, 0, width, height);

  // 执行 RGB Split 纯算法处理
  const resultImageData = processRgbSplitImageData(originalImageData, options);

  ctx.putImageData(resultImageData, 0, 0);

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas 导出二进制 Blob 失败'));
    }, 'image/png');
  });

  const resItem = await resourceStore.addResource('rgb_split_output.png', 'image', outputBlob);

  return {
    resourceId: resItem.id,
    width,
    height
  };
}

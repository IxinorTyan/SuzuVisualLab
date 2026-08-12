/**
 * noise.ts
 * 负责给 ImageData 添加 Noise 杂色。
 * 从 saibo/js/noise.js 1:1 移植
 */

export function applyNoise(sourceImageData: ImageData, amount: number): ImageData {
  const width = sourceImageData.width;
  const height = sourceImageData.height;

  // 创建新的 ImageData 避免直接修改原数据
  const result = new ImageData(
    new Uint8ClampedArray(sourceImageData.data),
    width,
    height
  );

  if (amount <= 0) {
    return result;
  }

  const data = result.data;
  const factor = (amount / 100) * 255;
  const halfFactor = factor / 2;

  for (let i = 0; i < data.length; i += 4) {
    // 忽略完全透明像素，避免在透明区域产生杂色纹理
    if (data[i + 3] === 0) {
      continue;
    }

    // 计算 RGB 三通道随机杂色
    const noiseR = (Math.random() * factor) - halfFactor;
    const noiseG = (Math.random() * factor) - halfFactor;
    const noiseB = (Math.random() * factor) - halfFactor;

    data[i]     = Math.min(255, Math.max(0, data[i] + noiseR));     // R
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noiseG)); // G
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noiseB)); // B
  }

  return result;
}

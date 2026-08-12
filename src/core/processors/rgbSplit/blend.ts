/**
 * blend.ts
 * 负责 Channel-level compositing（通道级别的图层合成）。
 * 模拟 Photoshop 中关闭特定颜色通道 (Advanced Blending Channel Options) 并包含位移与透明度的合成。
 * 从 saibo/js/blend.js 1:1 移植
 */

export function blendChannelLayer(
  baseImageData: ImageData,
  layerImageData: ImageData,
  offsetX: number,
  offsetY: number,
  opacity: number,
  disabledChannel: 'R' | 'G' | 'B'
): ImageData {
  const width = baseImageData.width;
  const height = baseImageData.height;

  // 创建结果 ImageData
  const resultImageData = new ImageData(
    new Uint8ClampedArray(baseImageData.data),
    width,
    height
  );

  const destData = resultImageData.data;
  const srcData = layerImageData.data;

  // 取整位移
  const shiftX = Math.round(offsetX);
  const shiftY = Math.round(offsetY);

  // 若透明度几乎为0，则无需混合，直接返回副本
  if (opacity <= 0) {
    return resultImageData;
  }

  for (let y = 0; y < height; y++) {
    const srcY = y - shiftY;

    // 若采样的 Y 超出原图范围，则按透明像素处理（不修改 destData）
    if (srcY < 0 || srcY >= height) {
      continue;
    }

    for (let x = 0; x < width; x++) {
      const srcX = x - shiftX;

      // 若采样的 X 超出原图范围，则按透明像素处理（不修改 destData）
      if (srcX < 0 || srcX >= width) {
        continue;
      }

      const destIdx = (y * width + x) * 4;
      const srcIdx = (srcY * width + srcX) * 4;

      // 源像素Alpha与图层Opacity复合
      const srcAlpha = (srcData[srcIdx + 3] / 255) * opacity;

      if (srcAlpha <= 0) {
        continue;
      }

      const invAlpha = 1 - srcAlpha;

      // Photoshop 关闭通道合成机制：
      // 被关闭的通道：该图层不改写改通道，保留基底 (base) 的颜色值。
      // 未被关闭的通道：按照该图层位移后的采样颜色与源Alpha进行 Alpha Blend。

      if (disabledChannel !== 'R') {
        destData[destIdx] = Math.round(destData[destIdx] * invAlpha + srcData[srcIdx] * srcAlpha);
      }

      if (disabledChannel !== 'G') {
        destData[destIdx + 1] = Math.round(destData[destIdx + 1] * invAlpha + srcData[srcIdx + 1] * srcAlpha);
      }

      if (disabledChannel !== 'B') {
        destData[destIdx + 2] = Math.round(destData[destIdx + 2] * invAlpha + srcData[srcIdx + 2] * srcAlpha);
      }

      // Alpha 通道保持基底的 Alpha，通常为 255
    }
  }

  return resultImageData;
}

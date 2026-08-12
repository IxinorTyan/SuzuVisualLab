/**
 * channels.ts
 * 负责从 Layer 0 (带有 Noise 的图层) 派生三个分别关闭 R/G/B 通道的 Channel Layer。
 * 从 saibo/js/channels.js 1:1 移植
 */

export interface DisabledChannelLayer {
  imageData: ImageData;
  disabledChannel: 'R' | 'G' | 'B';
}

function cloneImageData(src: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(src.data),
    src.width,
    src.height
  );
}

export function createRDisabledLayer(layer0: ImageData): DisabledChannelLayer {
  return {
    imageData: cloneImageData(layer0),
    disabledChannel: 'R'
  };
}

export function createGDisabledLayer(layer0: ImageData): DisabledChannelLayer {
  return {
    imageData: cloneImageData(layer0),
    disabledChannel: 'G'
  };
}

export function createBDisabledLayer(layer0: ImageData): DisabledChannelLayer {
  return {
    imageData: cloneImageData(layer0),
    disabledChannel: 'B'
  };
}

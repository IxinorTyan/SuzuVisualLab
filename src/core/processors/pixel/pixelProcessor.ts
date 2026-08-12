/**
 * pixelProcessor.ts
 * 像素化 (Pixel Art) 算法处理器
 * 移植自 original pixel.js，支持纯图像 2D Canvas 缩小拉伸与二值化/阈值像素处理，完全支持 PNG 透明度通道。
 */

import { resourceStore } from '../../ResourceStore';

export interface PixelOptions {
  scaleRatio?: number;        // 0.05 ~ 1.0 (例如 0.25)
  enableThreshold?: boolean;  // 是否开启阈值转换
  threshold?: number;        // 0 ~ 255 (例如 128)
  thresholdMode?: 'color' | 'blackWhite'; // 'color' 彩色模式 / 'blackWhite' 黑白二值模式
  enableCustomColor?: boolean; // 黑白模式下是否启用正片叠底自由选色图层
  customColor?: string;       // 正片叠底叠加颜色 HEX (如 '#3b82f6')
}

export interface PixelResult {
  resourceId: string;
  width: number;
  height: number;
}

/**
 * 辅助数值 Clamp
 */
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * 安全解析 HEX 颜色为 RGB (支持 #RRGGBB 与 #RGB，非法时回退到 #3b82f6)
 */
function parseHexColor(hexStr?: string): { r: number; g: number; b: number } {
  const fallback = { r: 59, g: 130, b: 246 }; // Default #3b82f6
  if (!hexStr || typeof hexStr !== 'string') return fallback;

  let hex = hexStr.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }

  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) {
    return fallback;
  }

  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * 纯算法：阈值处理 ImageData (直接原地处理ImageData数据)
 * 阶段 1: 基础二值/阈值计算 (Binary Threshold Base Layer)
 * 阶段 2: 逻辑上的 Screen (滤色) 暗部/黑色区域着色图层 (Logical Screen Color Layer)
 */
export function applyPixelThreshold(
  imageData: ImageData,
  thresholdRaw: number,
  mode: 'color' | 'blackWhite',
  enableCustomColor = false,
  customColorHex = '#3b82f6'
): void {
  const threshold = clamp(Math.round(thresholdRaw), 0, 255);
  const data = imageData.data;
  const isBlackWhite = mode === 'blackWhite';

  // 阶段 1：二值底图算法 (Binary Base Layer Processing)
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];

    // 如果该像素完全透明 (alpha === 0)，跳过 RGB 改写，保持 alpha=0，避免透明边缘黑边/错色
    if (alpha === 0) {
      continue;
    }

    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    // NTSC 标准灰度公式: gray = 0.299 * R + 0.587 * G + 0.114 * B
    const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
    const isAboveThreshold = gray >= threshold;

    if (isBlackWhite) {
      // 黑白模式：高于或等于阈值变白 (255)，低于阈值变黑 (0)
      const color = isAboveThreshold ? 255 : 0;
      data[i] = color;
      data[i + 1] = color;
      data[i + 2] = color;
    } else {
      // 彩色模式：高于或等于阈值变白 (255)，低于阈值保留原始颜色
      if (isAboveThreshold) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }

    // 透明度二值截断：高于或等于阈值保持原 alpha，低于阈值设为完全透明(0)
    data[i + 3] = alpha >= threshold ? alpha : 0;
  }

  // 阶段 2：逻辑 Screen (滤色) 暗部/黑色区域着色图层 (Logical Screen / Dark Area Color Layer Processing)
  // 仅在同时满足 thresholdMode === 'blackWhite' 且 enableCustomColor === true 时生效
  if (isBlackWhite && enableCustomColor) {
    const blendColor = parseHexColor(customColorHex);

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      // 保持 alpha = 0 的透明像素不变，半透明像素保留原 alpha
      if (alpha === 0) {
        continue;
      }

      // 标准 Screen (滤色) 混合公式：Output = 255 - ((255 - Base) * (255 - Blend)) / 255
      // 对于二值图：
      // - 黑色像素 (Base = 0)：Output = 255 - (255 * (255 - Blend)) / 255 = Blend (变自选 customColor)
      // - 白色像素 (Base = 255)：Output = 255 - (0 * (255 - Blend)) / 255 = 255 (保持纯白)
      const baseR = data[i];
      const baseG = data[i + 1];
      const baseB = data[i + 2];

      const outR = clamp(Math.round(255 - ((255 - baseR) * (255 - blendColor.r)) / 255), 0, 255);
      const outG = clamp(Math.round(255 - ((255 - baseG) * (255 - blendColor.g)) / 255), 0, 255);
      const outB = clamp(Math.round(255 - ((255 - baseB) * (255 - blendColor.b)) / 255), 0, 255);

      data[i] = outR;
      data[i + 1] = outG;
      data[i + 2] = outB;
      // alpha 保持第一阶段计算的透明度
    }
  }
}

/**
 * 纯算法处理：Image -> 像素化 Canvas
 */
export function processPixelArtCanvas(
  img: HTMLImageElement | ImageBitmap,
  options: PixelOptions = {}
): HTMLCanvasElement {
  const rawScale = options.scaleRatio ?? 0.25;
  const scale = clamp(rawScale, 0.05, 1.0);
  const enableThreshold = options.enableThreshold ?? false;
  const threshold = options.threshold ?? 128;
  const thresholdMode = options.thresholdMode ?? 'color';

  const origWidth = ('naturalWidth' in img ? img.naturalWidth : img.width) || img.width;
  const origHeight = ('naturalHeight' in img ? img.naturalHeight : img.height) || img.height;

  // 保证缩小尺寸至少为 1x1，防止产生 0 宽或 0 高
  const scaledWidth = Math.max(1, Math.floor(origWidth * scale));
  const scaledHeight = Math.max(1, Math.floor(origHeight * scale));

  // 1. 创建离屏临时 Canvas，绘制缩小版图像
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = scaledWidth;
  tempCanvas.height = scaledHeight;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) {
    throw new Error('无法创建离屏 Canvas 2D 上下文');
  }

  // 清空离屏 Canvas，确保 PNG 透明通道干净
  tempCtx.clearRect(0, 0, scaledWidth, scaledHeight);
  tempCtx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

  // 2. 如果启用了阈值，处理离屏 ImageData
  if (enableThreshold) {
    const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
    applyPixelThreshold(
      imageData,
      threshold,
      thresholdMode,
      options.enableCustomColor,
      options.customColor
    );
    tempCtx.putImageData(imageData, 0, 0);
  }

  // 3. 创建主 Canvas，放大恢复原图尺寸，禁用图像平滑以获得点阵像素硬轮廓
  const canvas = document.createElement('canvas');
  canvas.width = origWidth;
  canvas.height = origHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建主 Canvas 2D 上下文');
  }

  ctx.clearRect(0, 0, origWidth, origHeight);

  // 禁用锯齿/反锯齿平滑 (Nearest-neighbor)
  ctx.imageSmoothingEnabled = false;
  (ctx as any).mozImageSmoothingEnabled = false;
  (ctx as any).webkitImageSmoothingEnabled = false;
  (ctx as any).msImageSmoothingEnabled = false;

  ctx.drawImage(tempCanvas, 0, 0, origWidth, origHeight);

  return canvas;
}

/**
 * Workflow 入口封装：Blob 输入 -> 像素化渲染 -> 输出 Resource 关联
 */
export async function processImageToPixel(
  inputBlob: Blob,
  options: PixelOptions = {}
): Promise<PixelResult> {
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
    // Fallback to HTMLImageElement
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
  const canvas = processPixelArtCanvas(sourceInput, options);

  // 及时释放 ImageBitmap 资源，防止显存/内存泄露
  if (imgBitmap) {
    imgBitmap.close();
  }

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas 导出二进制 Blob 失败'));
    }, 'image/png');
  });

  const resItem = await resourceStore.addResource('pixel_output.png', 'image', outputBlob);

  return {
    resourceId: resItem.id,
    width,
    height
  };
}

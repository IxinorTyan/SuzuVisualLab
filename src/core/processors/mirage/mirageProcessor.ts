export interface MirageOptions {
  isColored?: boolean;      // 默认 true
  maxSize?: number;         // 默认 0（不限制）
  innerScale?: number;      // 默认 0.3
  coverScale?: number;      // 默认 0.2
  innerWeight?: number;     // 默认 0.7
  innerDesat?: number;      // 默认 0
  coverDesat?: number;      // 默认 0
}

export interface MirageResult {
  blob: Blob;
  width: number;
  height: number;
  coverPreviewUrl: string;  // 预处理后的表图 DataURL
  innerPreviewUrl: string;  // 预处理后的里图 DataURL
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * 将表图与里图合成彩色/黑白幻影坦克图片
 */
export async function processImageToMirage(
  coverBlob: Blob,
  innerBlob: Blob,
  options: MirageOptions = {}
): Promise<MirageResult> {
  const {
    isColored = true,
    maxSize = 0,
    innerScale = 0.3,
    coverScale = 0.2,
    innerWeight = 0.7,
    innerDesat = 0,
    coverDesat = 0,
  } = options;

  const [coverImg, innerImg] = await Promise.all([
    loadImage(coverBlob),
    loadImage(innerBlob),
  ]);

  // 计算目标缩放尺寸（以里图为基准）
  let w = innerImg.width;
  let h = innerImg.height;
  if (maxSize > 0 && (w > maxSize || h > maxSize)) {
    if (w > h) {
      h = Math.ceil((h * maxSize) / w);
      w = maxSize;
    } else {
      w = Math.ceil((w * maxSize) / h);
      h = maxSize;
    }
  }

  // 绘制里图
  const innerCanvas = document.createElement('canvas');
  innerCanvas.width = w;
  innerCanvas.height = h;
  const innerCtx = innerCanvas.getContext('2d')!;
  innerCtx.drawImage(innerImg, 0, 0, w, h);
  const innerImgData = innerCtx.getImageData(0, 0, w, h);

  // 绘制表图（居中裁切对齐）
  const coverCanvas = document.createElement('canvas');
  coverCanvas.width = w;
  coverCanvas.height = h;
  const coverCtx = coverCanvas.getContext('2d')!;
  const currRatio = coverImg.width / coverImg.height;
  const tarRatio = w / h;
  let sx = 0, sy = 0, nw = w, nh = h;
  if (currRatio < tarRatio) {
    sy = Math.ceil((h - w / currRatio) / 2);
    nh = Math.ceil(w / currRatio);
  } else {
    sx = Math.ceil((w - h * currRatio) / 2);
    nw = Math.ceil(h * currRatio);
  }
  coverCtx.drawImage(coverImg, sx, sy, nw, nh);
  const coverImgData = coverCtx.getImageData(0, 0, w, h);

  // 计算灰度数据
  const len = w * h;
  const innerGray = new Uint8ClampedArray(len);
  const coverGray = new Uint8ClampedArray(len);
  for (let i = 0; i < len; i++) {
    const p = i * 4;
    innerGray[i] = 0.299 * innerImgData.data[p] + 0.587 * innerImgData.data[p + 1] + 0.114 * innerImgData.data[p + 2];
    coverGray[i] = 0.299 * coverImgData.data[p] + 0.587 * coverImgData.data[p + 1] + 0.114 * coverImgData.data[p + 2];
  }

  const scaleC = 1 - coverScale;
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const coverPrevData = new Uint8ClampedArray(coverImgData.data);
  const innerPrevData = new Uint8ClampedArray(innerImgData.data);

  const outData = new Uint8ClampedArray(len * 4);

  if (isColored) {
    for (let i = 0; i < len; i++) {
      const p = i * 4;
      // 里图缓存与去色处理
      const ir = innerImgData.data[p] * innerScale;
      const ig = innerImgData.data[p + 1] * innerScale;
      const ib = innerImgData.data[p + 2] * innerScale;
      const il = innerGray[i] * innerScale;
      const icR = ir + (il - ir) * innerDesat;
      const icG = ig + (il - ig) * innerDesat;
      const icB = ib + (il - ib) * innerDesat;

      // 表图缓存与去色处理
      const cr = 255 - (255 - coverImgData.data[p]) * scaleC;
      const cg = 255 - (255 - coverImgData.data[p + 1]) * scaleC;
      const cb = 255 - (255 - coverImgData.data[p + 2]) * scaleC;
      const cl = 255 - (255 - coverGray[i]) * scaleC;
      const ccR = cr + (cl - cr) * coverDesat;
      const ccG = cg + (cl - cg) * coverDesat;
      const ccB = cb + (cl - cb) * coverDesat;

      coverPrevData[p] = clamp(ccR);
      coverPrevData[p + 1] = clamp(ccG);
      coverPrevData[p + 2] = clamp(ccB);
      coverPrevData[p + 3] = 255;

      innerPrevData[p] = clamp(icR);
      innerPrevData[p + 1] = clamp(icG);
      innerPrevData[p + 2] = clamp(icB);
      innerPrevData[p + 3] = 255;

      // Alpha 计算
      const a = Math.min(Math.max((255 + il - cl) / 255, 0), 1);
      const ai = 255 * a;

      // RGB 颜色混合计算
      outData[p] = a === 0 ? 0 : clamp(((icR - ai + 255 - ccR) * innerWeight + ai - 255 + ccR) / a);
      outData[p + 1] = a === 0 ? 0 : clamp(((icG - ai + 255 - ccG) * innerWeight + ai - 255 + ccG) / a);
      outData[p + 2] = a === 0 ? 0 : clamp(((icB - ai + 255 - ccB) * innerWeight + ai - 255 + ccB) / a);
      outData[p + 3] = clamp(ai);
    }
  } else {
    for (let i = 0; i < len; i++) {
      const p = i * 4;
      const li = innerGray[i] * innerScale;
      const lc = 255 - (255 - coverGray[i]) * scaleC;
      const a = 255 + li - lc;
      const l = a === 0 ? 0 : (li * 255) / a;
      outData[p] = l;
      outData[p + 1] = l;
      outData[p + 2] = l;
      outData[p + 3] = a;
    }
  }

  const coverPrevCanvas = document.createElement('canvas');
  coverPrevCanvas.width = w;
  coverPrevCanvas.height = h;
  coverPrevCanvas.getContext('2d')!.putImageData(new ImageData(coverPrevData, w, h), 0, 0);

  const innerPrevCanvas = document.createElement('canvas');
  innerPrevCanvas.width = w;
  innerPrevCanvas.height = h;
  innerPrevCanvas.getContext('2d')!.putImageData(new ImageData(innerPrevData, w, h), 0, 0);

  const coverPreviewUrl = coverPrevCanvas.toDataURL('image/png');
  const innerPreviewUrl = innerPrevCanvas.toDataURL('image/png');

  // 输出生成 PNG Blob
  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.putImageData(new ImageData(outData, w, h), 0, 0);

  const finalBlob = await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });

  return {
    blob: finalBlob,
    width: w,
    height: h,
    coverPreviewUrl,
    innerPreviewUrl
  };
}

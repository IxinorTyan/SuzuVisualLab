export const SketchFilters = {
  grayscale(imageData: ImageData): ImageData {
    const data = imageData.data;
    const len = data.length;
    const result = new ImageData(
      new Uint8ClampedArray(data),
      imageData.width,
      imageData.height
    );
    const resData = result.data;

    for (let i = 0; i < len; i += 4) {
      const a = resData[i + 3];
      if (a === 0) {
        resData[i] = 0;
        resData[i + 1] = 0;
        resData[i + 2] = 0;
        resData[i + 3] = 0;
        continue;
      }
      const r = resData[i];
      const g = resData[i + 1];
      const b = resData[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      resData[i] = gray;
      resData[i + 1] = gray;
      resData[i + 2] = gray;
      resData[i + 3] = a;
    }
    return result;
  },

  invert(imageData: ImageData): ImageData {
    const data = imageData.data;
    const len = data.length;
    const result = new ImageData(
      new Uint8ClampedArray(data),
      imageData.width,
      imageData.height
    );
    const resData = result.data;

    for (let i = 0; i < len; i += 4) {
      const a = resData[i + 3];
      if (a === 0) {
        resData[i] = 255;
        resData[i + 1] = 255;
        resData[i + 2] = 255;
        resData[i + 3] = 0;
        continue;
      }
      resData[i] = 255 - resData[i];
      resData[i + 1] = 255 - resData[i + 1];
      resData[i + 2] = 255 - resData[i + 2];
      resData[i + 3] = a;
    }
    return result;
  },

  minimumFilter(imageData: ImageData, radius: number): ImageData {
    if (radius <= 0) {
      return new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );
    }

    const width = imageData.width;
    const height = imageData.height;
    const src = imageData.data;
    const result = new ImageData(width, height);
    const dst = result.data;

    const intR = Math.max(1, Math.round(radius));
    const factor = radius < 1 ? radius : 1;

    for (let y = 0; y < height; y++) {
      const minY = Math.max(0, y - intR);
      const maxY = Math.min(height - 1, y + intR);

      for (let x = 0; x < width; x++) {
        const dstIdx = (y * width + x) * 4;
        const srcAlpha = src[dstIdx + 3];

        if (srcAlpha === 0) {
          dst[dstIdx] = 0;
          dst[dstIdx + 1] = 0;
          dst[dstIdx + 2] = 0;
          dst[dstIdx + 3] = 0;
          continue;
        }

        const minX = Math.max(0, x - intR);
        const maxX = Math.min(width - 1, x + intR);

        let minR = 255;
        let minG = 255;
        let minB = 255;
        let foundValidPixel = false;

        for (let ny = minY; ny <= maxY; ny++) {
          const rowOffset = ny * width;
          for (let nx = minX; nx <= maxX; nx++) {
            const idx = (rowOffset + nx) * 4;
            if (src[idx + 3] > 0) {
              foundValidPixel = true;
              if (src[idx] < minR) minR = src[idx];
              if (src[idx + 1] < minG) minG = src[idx + 1];
              if (src[idx + 2] < minB) minB = src[idx + 2];
            }
          }
        }

        if (!foundValidPixel) {
          minR = src[dstIdx];
          minG = src[dstIdx + 1];
          minB = src[dstIdx + 2];
        }

        if (factor < 1) {
          dst[dstIdx] = Math.round(src[dstIdx] * (1 - factor) + minR * factor);
          dst[dstIdx + 1] = Math.round(src[dstIdx + 1] * (1 - factor) + minG * factor);
          dst[dstIdx + 2] = Math.round(src[dstIdx + 2] * (1 - factor) + minB * factor);
        } else {
          dst[dstIdx] = minR;
          dst[dstIdx + 1] = minG;
          dst[dstIdx + 2] = minB;
        }
        dst[dstIdx + 3] = srcAlpha;
      }
    }

    return result;
  }
};

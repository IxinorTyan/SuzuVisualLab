export const SketchBlend = {
  colorDodgeChannel(base: number, blend: number): number {
    if (blend === 255) return 255;
    const res = (base * 255) / (255 - blend);
    return res > 255 ? 255 : Math.floor(res);
  },

  colorDodge(baseData: ImageData, blendData: ImageData): ImageData {
    const width = baseData.width;
    const height = baseData.height;
    const base = baseData.data;
    const blend = blendData.data;
    const result = new ImageData(width, height);
    const dst = result.data;
    const len = base.length;

    for (let i = 0; i < len; i += 4) {
      const alpha = base[i + 3];
      if (alpha === 0) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
        continue;
      }
      dst[i] = this.colorDodgeChannel(base[i], blend[i]);
      dst[i + 1] = this.colorDodgeChannel(base[i + 1], blend[i + 1]);
      dst[i + 2] = this.colorDodgeChannel(base[i + 2], blend[i + 2]);
      dst[i + 3] = alpha;
    }

    return result;
  },

  softLightChannel(base: number, blend: number): number {
    const b = base / 255;
    const s = blend / 255;
    let res: number;

    if (s <= 0.5) {
      res = b - (1 - 2 * s) * b * (1 - b);
    } else {
      const d = (b <= 0.25) ? (((16 * b - 12) * b + 4) * b) : Math.sqrt(b);
      res = b + (2 * s - 1) * (d - b);
    }

    return Math.min(255, Math.max(0, Math.round(res * 255)));
  },

  overlayChannel(base: number, blend: number): number {
    const b = base / 255;
    const s = blend / 255;
    const res = (b < 0.5) ? (2 * b * s) : (1 - 2 * (1 - b) * (1 - s));
    return Math.min(255, Math.max(0, Math.round(res * 255)));
  },

  hardLightChannel(base: number, blend: number): number {
    const b = base / 255;
    const s = blend / 255;
    let res: number;
    if (b < 0.5) {
      res = 2.5 * b * s;
    } else {
      res = 1 - 2.5 * (1 - b) * (1 - s);
    }
    return Math.min(255, Math.max(0, Math.round(res * 255)));
  },

  blendLayers(baseData: ImageData, blendData: ImageData, mode: string, opacity = 1.0): ImageData {
    const width = baseData.width;
    const height = baseData.height;
    const base = baseData.data;
    const blend = blendData.data;
    const result = new ImageData(width, height);
    const dst = result.data;
    const len = base.length;

    let blendFunc: (b: number, s: number) => number;
    switch (mode) {
      case 'soft-light':
      case 'soft_light':
        blendFunc = this.softLightChannel;
        break;
      case 'overlay':
        blendFunc = this.overlayChannel;
        break;
      case 'hard-light':
      case 'hard_light':
        blendFunc = this.hardLightChannel;
        break;
      default:
        blendFunc = this.softLightChannel;
    }

    for (let i = 0; i < len; i += 4) {
      const alpha = base[i + 3];
      if (alpha === 0) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
        continue;
      }

      const blendedR = blendFunc(base[i], blend[i]);
      const blendedG = blendFunc(base[i + 1], blend[i + 1]);
      const blendedB = blendFunc(base[i + 2], blend[i + 2]);

      dst[i] = Math.round(base[i] * (1 - opacity) + blendedR * opacity);
      dst[i + 1] = Math.round(base[i + 1] * (1 - opacity) + blendedG * opacity);
      dst[i + 2] = Math.round(base[i + 2] * (1 - opacity) + blendedB * opacity);
      dst[i + 3] = alpha;
    }

    return result;
  }
};

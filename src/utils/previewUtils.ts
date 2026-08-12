/**
 * Utility function to downsample an image Blob for high-performance preview calculation.
 * Max dimension is capped (e.g. 240px) to ensure smooth 60fps parameter drag interaction.
 */
export async function createLowResBlob(sourceBlob: Blob, maxDimension = 240): Promise<Blob> {
  if (!sourceBlob || !sourceBlob.type.startsWith('image/')) {
    return sourceBlob;
  }

  return new Promise<Blob>((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(sourceBlob);

    image.onload = () => {
      URL.revokeObjectURL(url);
      let width = image.naturalWidth || image.width;
      let height = image.naturalHeight || image.height;

      if (width <= maxDimension && height <= maxDimension) {
        resolve(sourceBlob);
        return;
      }

      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(sourceBlob);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob((b) => {
        // Cleanup canvas memory
        canvas.width = 0;
        canvas.height = 0;
        resolve(b || sourceBlob);
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(sourceBlob);
    };

    image.src = url;
  });
}

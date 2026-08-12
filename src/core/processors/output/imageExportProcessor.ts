import { resourceStore } from '../../ResourceStore';

export interface ImageExportParams {
  scaleRatio?: number;
  exportFormat?: 'png' | 'jpg' | 'pdf' | 'html';
  jpgQuality?: number;
}

export interface ImageExportResult {
  resourceId: string;
  blob: Blob;
  format: string;
  filename: string;
}

export async function processImageExport(
  inputBlob: Blob,
  params: ImageExportParams = {}
): Promise<ImageExportResult> {
  const { scaleRatio = 100, exportFormat = 'png', jpgQuality = 90 } = params;

  // 1. Load image blob
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(inputBlob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    image.src = url;
  });

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  const scale = Math.max(10, Math.min(200, Number(scaleRatio) || 100)) / 100;
  const targetWidth = Math.max(1, Math.round(origWidth * scale));
  const targetHeight = Math.max(1, Math.round(origHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');

  if (exportFormat === 'jpg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const timestamp = Date.now();

  if (exportFormat === 'html') {
    const dataUrl = canvas.toDataURL('image/png');
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Suzu Visual Lab - Export ${timestamp}</title>
  <style>
    body { margin: 0; background: #121316; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img { max-width: 95vw; max-height: 95vh; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 8px; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="Export" />
</body>
</html>`;

    const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const resItem = await resourceStore.addResource('export.html', 'unknown', htmlBlob);
    return {
      resourceId: resItem.id,
      blob: htmlBlob,
      format: 'html',
      filename: `export_${timestamp}.html`
    };
  }

  if (exportFormat === 'pdf') {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Export PDF</title>
  <style>
    @page { size: auto; margin: 0; }
    body { margin: 0; display: flex; justify-content: center; align-items: center; }
    img { width: 100%; height: auto; page-break-inside: avoid; }
  </style>
</head>
<body>
  <img src="${dataUrl}" />
</body>
</html>`;

    const pdfBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const resItem = await resourceStore.addResource('export.pdf', 'unknown', pdfBlob);
    return {
      resourceId: resItem.id,
      blob: pdfBlob,
      format: 'pdf',
      filename: `export_${timestamp}.pdf.html`
    };
  }

  const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
  const qualityVal = exportFormat === 'jpg' ? Math.max(0.1, Math.min(1.0, jpgQuality / 100)) : undefined;

  const exportBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('图像导出转换失败'));
      },
      mimeType,
      qualityVal
    );
  });

  const ext = exportFormat === 'jpg' ? 'jpg' : 'png';
  const resItem = await resourceStore.addResource(`export.${ext}`, 'image', exportBlob);

  return {
    resourceId: resItem.id,
    blob: exportBlob,
    format: ext,
    filename: `export_${timestamp}.${ext}`
  };
}

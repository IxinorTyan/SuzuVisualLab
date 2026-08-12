import { AsciiDataData } from './asciiProcessor';
import { renderAsciiToCanvas } from './asciiRenderer';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&' + 'amp;')
    .replace(/</g, '&' + 'lt;')
    .replace(/>/g, '&' + 'gt;')
    .replace(/"/g, '&' + 'quot;')
    .replace(/'/g, '&' + '#039;');
}

export function copyAsciiToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    return Promise.reject(new Error('Clipboard API unavailable'));
  }
  return navigator.clipboard.writeText(text);
}

export function downloadAsciiTxt(text: string, filename = 'ascii_art.txt'): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateAsciiHtmlDocument(asciiData: AsciiDataData, title = 'ASCII Art'): string {
  const { lines, colors, params } = asciiData;
  const {
    colorMode = 'mono',
    textColor = '#ffffff',
    bgColor = '#000000',
    fontFamily = 'monospace',
    fontSize = 12
  } = params;

  let bodyContent = '';

  if (colorMode === 'color' && colors.length > 0) {
    const htmlLines: string[] = [];
    for (let r = 0; r < lines.length; r++) {
      const line = lines[r];
      let lineHtml = '';
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        const safeChar = escapeHtml(char);
        if (char === ' ') {
          lineHtml += ' ';
        } else {
          const color = colors[r] && colors[r][c] ? colors[r][c] : textColor;
          lineHtml += `<span style="color:${color}">${safeChar}</span>`;
        }
      }
      htmlLines.push(lineHtml);
    }
    bodyContent = htmlLines.join('\n');
  } else {
    bodyContent = escapeHtml(asciiData.text);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: ${bgColor};
            color: ${textColor};
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        pre.ascii-art {
            font-family: ${fontFamily};
            font-size: ${fontSize}px;
            line-height: 1.0;
            letter-spacing: 0px;
            white-space: pre;
            background-color: ${bgColor};
            color: ${textColor};
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            overflow: auto;
        }
    </style>
</head>
<body>
    <pre class="ascii-art">${bodyContent}</pre>
</body>
</html>`;
}

export function downloadAsciiHtml(asciiData: AsciiDataData, filename = 'ascii_art.html'): void {
  const htmlDoc = generateAsciiHtmlDocument(asciiData);
  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadAsciiPng(asciiData: AsciiDataData, filename = 'ascii_art.png'): void {
  const canvas = renderAsciiToCanvas(asciiData);
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

import { NodeRegistry } from '../nodeRegistry';

export function registerOutputNodes(registry: NodeRegistry) {
  // 1. 输出文件
  registry.register({
    type: 'output.image',
    title: { zh: '输出文件', en: 'Export File' },
    category: 'Output',
    description: { zh: '支持将管道输出素材进行比例缩放，打包导出为 PNG, JPG, PDF 或 HTML 文件。', en: 'Export pipeline image outputs with scale adjustments as PNG, JPG, PDF or HTML files.' },
    headerColor: '#10b981', // Emerald accent (Output fixed green)
    defaultSize: { width: 340, height: 320 },
    minSize: { width: 300, height: 260 },
    actions: [
      { id: 'render', label: { zh: '处理输出', en: 'Process Output' }, variant: 'primary' },
      { id: 'exportFile', label: { zh: '导出文件', en: 'Export File' }, variant: 'emerald' }
    ],
    inputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '最终处理图像', en: 'Final processed image' }
      }
    ],
    outputs: [],
    parameters: [
      {
        id: 'scaleRatio',
        name: { zh: '输出缩放比例 (%)', en: 'Export Scale (%)' },
        type: 'slider',
        defaultValue: 100,
        min: 10,
        max: 200,
        step: 5
      },
      {
        id: 'exportFormat',
        name: { zh: '导出文件格式', en: 'Export Format' },
        type: 'select',
        defaultValue: 'png',
        options: [
          { label: { zh: 'PNG 高清无损 (*.png)', en: 'PNG Image (*.png)' }, value: 'png' },
          { label: { zh: 'JPG 压缩图像 (*.jpg)', en: 'JPG Image (*.jpg)' }, value: 'jpg' },
          { label: { zh: 'PDF 矢量文档 (*.pdf)', en: 'PDF Document (*.pdf)' }, value: 'pdf' },
          { label: { zh: 'HTML 单页网页 (*.html)', en: 'HTML Page (*.html)' }, value: 'html' }
        ]
      }
    ]
  });

  // 2. 输出 SVG
  registry.register({
    type: 'output.svg',
    title: { zh: '输出 SVG 矢量', en: 'Output SVG' },
    category: 'Output',
    description: { zh: '将位图转化为包含轮廓跟踪和贝塞尔曲线拟合的 SVG 矢量图。', en: 'Converts raster bitmap into scalable SVG vector artwork with curve fitting.' },
    headerColor: '#10b981', // Emerald accent (Output fixed green)
    defaultSize: { width: 380, height: 380 },
    minSize: { width: 340, height: 320 },
    actions: [
      { id: 'render', label: { zh: '处理输出', en: 'Process Output' }, variant: 'primary' },
      { id: 'export', label: { zh: '导出 SVG', en: 'Export SVG' }, variant: 'emerald' }
    ],
    inputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '输入位图数据', en: 'Source raster image' }
      }
    ],
    outputs: [], // Output nodes strictly have NO outputs port
    parameters: [
      {
        id: 'vectorMode',
        name: { zh: '矢量模式', en: 'Vector Mode' },
        type: 'select',
        defaultValue: 'smooth',
        options: [
          { label: { zh: '平滑曲线 (Bezier)', en: 'Smooth Bezier' }, value: 'smooth' },
          { label: { zh: '折线多边形 (Polyline)', en: 'Sharp Polyline' }, value: 'line' }
        ]
      },
      {
        id: 'scalePercent',
        name: { zh: '采样缩放 (%)', en: 'Scale Percent (%)' },
        type: 'slider',
        defaultValue: 100,
        min: 10,
        max: 100,
        step: 5
      },
      {
        id: 'colorCount',
        name: { zh: '量化色彩数', en: 'Color Count' },
        type: 'slider',
        defaultValue: 16,
        min: 2,
        max: 64,
        step: 1
      },
      {
        id: 'medianRadius',
        name: { zh: '中值降噪半径', en: 'Median Radius' },
        type: 'slider',
        defaultValue: 1,
        min: 0,
        max: 10,
        step: 1
      },
      {
        id: 'bilateral',
        name: { zh: '用双边滤波替代中值滤波', en: 'Bilateral Filter' },
        type: 'boolean',
        defaultValue: false
      },
      {
        id: 'despeckleMinArea',
        name: { zh: '噪点清理面积', en: 'Despeckle Area' },
        type: 'slider',
        defaultValue: 40,
        min: 0,
        max: 500,
        step: 5
      },
      {
        id: 'simplifyEpsilon',
        name: { zh: '轮廓简化容差', en: 'Simplify Epsilon' },
        type: 'slider',
        defaultValue: 1.2,
        min: 0.1,
        max: 10.0,
        step: 0.1
      },
      {
        id: 'cornerHardness',
        name: { zh: '角点硬度', en: 'Corner Hardness' },
        type: 'slider',
        defaultValue: 50,
        min: 0,
        max: 100,
        step: 5
      },
      {
        id: 'bezierTolerance',
        name: { zh: '贝塞尔拟合容差', en: 'Bezier Tolerance' },
        type: 'slider',
        defaultValue: 0.8,
        min: 0.1,
        max: 5.0,
        step: 0.1
      },
      {
        id: 'seamGuard',
        name: { zh: '渲染接缝保护', en: 'Seam Guard' },
        type: 'boolean',
        defaultValue: false
      }
    ]
  });

  // 3. 输出幻影坦克
  registry.register({
    type: 'output.mirage',
    title: { zh: '输出幻影坦克', en: 'Mirage Tank Output' },
    category: 'Output',
    description: { zh: '利用透明度通道合成在黑色与白色背景下显示不同图案的"幻影坦克"图片。', en: 'Creates double-image mirage tanks that display different images on black and white backgrounds.' },
    headerColor: '#10b981', // Emerald accent (Output fixed green)
    defaultSize: { width: 420, height: 420 },
    minSize: { width: 380, height: 360 },
    actions: [
      { id: 'render', label: { zh: '处理输出', en: 'Process Output' }, variant: 'primary' },
      { id: 'export', label: { zh: '导出 PNG', en: 'Export PNG' }, variant: 'emerald' }
    ],
    inputs: [
      {
        id: 'coverImage',
        name: { zh: '表', en: 'Cover' },
        type: 'image',
        description: { zh: '白底显示的表图素材', en: 'Image shown on white background' },
        offsetY: '33%'
      },
      {
        id: 'innerImage',
        name: { zh: '里', en: 'Inner' },
        type: 'image',
        description: { zh: '黑底显示的里图素材', en: 'Image shown on black background' },
        offsetY: '67%'
      }
    ],
    outputs: [], // Output 节点没有输出端口
    parameters: [
      { id: 'maxSize', name: { zh: '最大长边像素 (0为不限制)', en: 'Max Dimension (0 = No limit)' }, type: 'slider', defaultValue: 0, min: 0, max: 2000, step: 50 },
      { id: 'innerScale', name: { zh: '里图缩放比例', en: 'Inner Scale' }, type: 'slider', defaultValue: 0.3, min: 0.05, max: 1.0, step: 0.05 },
      { id: 'coverScale', name: { zh: '表图缩放比例', en: 'Cover Scale' }, type: 'slider', defaultValue: 0.2, min: 0.05, max: 1.0, step: 0.05 },
      { id: 'innerWeight', name: { zh: '里图权重比例', en: 'Inner Weight' }, type: 'slider', defaultValue: 0.7, min: 0.1, max: 1.0, step: 0.05 },
      { id: 'innerDesat', name: { zh: '里图去色程度', en: 'Inner Desaturation' }, type: 'slider', defaultValue: 0, min: 0, max: 1.0, step: 0.05 },
      { id: 'coverDesat', name: { zh: '表图去色程度', en: 'Cover Desaturation' }, type: 'slider', defaultValue: 0, min: 0, max: 1.0, step: 0.05 }
    ]
  });

  // 4. 输出 ASCII
  registry.register({
    type: 'output.ascii',
    title: { zh: '输出 ASCII 字符画', en: 'Output ASCII' },
    category: 'Output',
    description: { zh: '将位图图像采样并转换为带灰度映射与彩色渲染的 ASCII 字符画艺术。', en: 'Converts input raster image into customizable ASCII art with grayscale mapping and color rendering.' },
    headerColor: '#10b981', // Emerald accent (Output fixed green)
    defaultSize: { width: 380, height: 380 },
    minSize: { width: 340, height: 320 },
    actions: [
      { id: 'render', label: { zh: '处理输出', en: 'Process Output' }, variant: 'primary' },
      { id: 'copy', label: { zh: '复制文本', en: 'Copy Text' } },
      { id: 'exportTxt', label: { zh: '导出 TXT', en: 'TXT' } },
      { id: 'exportHtml', label: { zh: '导出 HTML', en: 'HTML' } },
      { id: 'exportPng', label: { zh: '导出 PNG', en: 'PNG' } }
    ],
    inputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '输入位图数据', en: 'Source raster image' }
      }
    ],
    outputs: [],
    parameters: [
      {
        id: 'preset',
        name: { zh: '预设字符集', en: 'Charset Preset' },
        type: 'select',
        defaultValue: 'default',
        options: [
          { label: { zh: '标准预设 (M@N%...)', en: 'Standard Preset' }, value: 'default' },
          { label: { zh: '简易字符 (@#S%...)', en: 'Simple Preset' }, value: 'simple' },
          { label: { zh: '二进制 (01)', en: 'Binary (01)' }, value: 'binary' },
          { label: { zh: '实心方块 (█▓▒░)', en: 'Block Presets' }, value: 'blocks' },
          { label: { zh: '自定义字符集', en: 'Custom Charset' }, value: 'custom' }
        ]
      },
      {
        id: 'customCharSet',
        name: { zh: '自定义字符集内容', en: 'Custom Charset' },
        type: 'text',
        defaultValue: 'M@N%W$E#RK&FXYI*l]}1/+i>"!~`:.\' '
      },
      {
        id: 'invertCharSet',
        name: { zh: '反转字符集灰度', en: 'Invert Charset' },
        type: 'boolean',
        defaultValue: false
      },
      {
        id: 'includeSpace',
        name: { zh: '字符集末尾追加空格', en: 'Include Space' },
        type: 'boolean',
        defaultValue: true
      },
      {
        id: 'resolutionCols',
        name: { zh: '分辨率列数 (Cols)', en: 'Resolution Columns' },
        type: 'slider',
        defaultValue: 80,
        min: 20,
        max: 200,
        step: 5
      },
      {
        id: 'widthRatio',
        name: { zh: '字符宽度比例修正', en: 'Width Aspect Ratio' },
        type: 'slider',
        defaultValue: 1.0,
        min: 0.1,
        max: 2.0,
        step: 0.05
      },
      {
        id: 'heightRatio',
        name: { zh: '字符高度比例修正', en: 'Height Aspect Ratio' },
        type: 'slider',
        defaultValue: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.05
      },
      {
        id: 'colorMode',
        name: { zh: '色彩渲染模式', en: 'Color Render Mode' },
        type: 'select',
        defaultValue: 'mono',
        options: [
          { label: { zh: '单色模式 (Mono)', en: 'Monochrome' }, value: 'mono' },
          { label: { zh: '原图色彩模式 (Full Color)', en: 'Full Color' }, value: 'color' }
        ]
      },
      {
        id: 'textColor',
        name: { zh: '文字颜色 (单色模式)', en: 'Text Color (Mono)' },
        type: 'color',
        defaultValue: '#ffffff'
      },
      {
        id: 'bgColor',
        name: { zh: '背景颜色', en: 'Background Color' },
        type: 'color',
        defaultValue: '#000000'
      },
      {
        id: 'fontFamily',
        name: { zh: '显示字体', en: 'Font Family' },
        type: 'select',
        defaultValue: 'monospace',
        options: [
          { label: { zh: '标准等宽 (Monospace)', en: 'Monospace' }, value: 'monospace' },
          { label: { zh: 'Courier New', en: 'Courier New' }, value: 'Courier New' },
          { label: { zh: 'Consolas', en: 'Consolas' }, value: 'Consolas' }
        ]
      },
      {
        id: 'fontSize',
        name: { zh: '渲染字号 (px)', en: 'Font Size (px)' },
        type: 'slider',
        defaultValue: 8,
        min: 6,
        max: 20,
        step: 1
      }
    ]
  });
}

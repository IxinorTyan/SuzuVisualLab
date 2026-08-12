import { NodeRegistry } from '../nodeRegistry';

export function registerFilterNodes(registry: NodeRegistry) {
  registry.register({
    type: 'filter.sketch',
    title: { zh: '线稿化', en: 'Line Art' },
    category: 'Filter',
    description: { zh: '模拟 PS 图层叠加配方，提取图像线条轮廓并进行色彩混合与艺术风格化渲染。', en: 'Extracts line art contours and applies Photoshop style blend mode rendering.' },
    headerColor: '#6366f1', // Indigo accent (Filter random)
    defaultSize: { width: 320, height: 320 },
    minSize: { width: 280, height: 240 },
    actions: [
      { id: 'render', label: { zh: '渲染', en: 'Render' }, variant: 'primary' }
    ],
    inputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '输入源图像流', en: 'Source image stream' }
      }
    ],
    outputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '线稿合成图像流', en: 'Line art output stream' }
      }
    ],
    parameters: [
      {
        id: 'layer0Opacity',
        name: { zh: '底图透明度', en: 'Original Layer Opacity' },
        type: 'slider',
        defaultValue: 0,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        id: 'layer1Opacity',
        name: { zh: '灰度质感强度', en: 'Grayscale Layer Opacity' },
        type: 'slider',
        defaultValue: 0,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        id: 'layer2Opacity',
        name: { zh: '线稿提取强度', en: 'Line Art Opacity' },
        type: 'slider',
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        id: 'layer2MinimumRadius',
        name: { zh: '线条粗细半径', en: 'Line Width Radius' },
        type: 'slider',
        defaultValue: 0.5,
        min: 0.1,
        max: 10,
        step: 0.1
      },
      {
        id: 'layer3Opacity',
        name: { zh: '色彩氛围强度', en: 'Color Atmosphere Opacity' },
        type: 'slider',
        defaultValue: 1,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        id: 'layer3ColorMode',
        name: { zh: '色彩模式', en: 'Color Spec' },
        type: 'select',
        defaultValue: 'solid',
        options: [
          { label: { zh: '自选调色盘', en: 'Custom Color Picker' }, value: 'solid' },
          { label: { zh: '彩色渐变 (Rainbow)', en: 'Rainbow Gradient' }, value: 'rainbow' }
        ]
      },
      {
        id: 'layer3CustomColor',
        name: { zh: '自选叠加颜色', en: 'Atmosphere Color' },
        type: 'color',
        defaultValue: '#000000'
      },
      {
        id: 'layer3BlendMode',
        name: { zh: '色彩混合模式', en: 'Color Blend Mode' },
        type: 'select',
        defaultValue: 'soft-light',
        options: [
          { label: { zh: '柔光 (Soft Light)', en: 'Soft Light' }, value: 'soft-light' },
          { label: { zh: '叠加 (Overlay)', en: 'Overlay' }, value: 'hard-light' },
          { label: { zh: '强光对比 (Hard Light)', en: 'Hard Light' }, value: 'hard-light' }
        ]
      }
    ]
  });

  registry.register({
    type: 'filter.rgbSplit',
    title: { zh: 'RGB 分离', en: 'RGB Split' },
    category: 'Filter',
    description: { zh: '分离图像 RGB 色彩通道，提供 Noise 杂色与各通道高级图层位移/透明度 Glitch 特效。', en: 'Splits RGB channels with configurable noise, offset and opacity per layer.' },
    headerColor: '#ec4899', // Pink / Magenta accent (Filter random)
    defaultSize: { width: 340, height: 360 },
    minSize: { width: 280, height: 280 },
    actions: [
      { id: 'render', label: { zh: '渲染', en: 'Render' }, variant: 'primary' },
      { id: 'reset', label: { zh: '重置', en: 'Reset' } }
    ],
    inputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '输入源图像流', en: 'Source image stream' }
      }
    ],
    outputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: 'RGB 分离输出图像流', en: 'RGB Split output stream' }
      }
    ],
    parameters: [
      {
        id: 'noiseAmount',
        name: { zh: '杂色强度 (Noise)', en: 'Noise Amount' },
        type: 'slider',
        defaultValue: 0,
        min: 0,
        max: 100,
        step: 1
      },
      {
        id: 'l1OffsetX',
        name: { zh: '图层1 (关R) 位移 X', en: 'Layer 1 (No R) Offset X' },
        type: 'slider',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1
      },
      {
        id: 'l1OffsetY',
        name: { zh: '图层1 (关R) 位移 Y', en: 'Layer 1 (No R) Offset Y' },
        type: 'slider',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1
      },
      {
        id: 'l1Opacity',
        name: { zh: '图层1 (关R) 不透明度', en: 'Layer 1 (No R) Opacity' },
        type: 'slider',
        defaultValue: 1.0,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        id: 'l2OffsetX',
        name: { zh: '图层2 (关G) 位移 X', en: 'Layer 2 (No G) Offset X' },
        type: 'slider',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1
      },
      {
        id: 'l2OffsetY',
        name: { zh: '图层2 (关G) 位移 Y', en: 'Layer 2 (No G) Offset Y' },
        type: 'slider',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1
      },
      {
        id: 'l2Opacity',
        name: { zh: '图层2 (关G) 不透明度', en: 'Layer 2 (No G) Opacity' },
        type: 'slider',
        defaultValue: 1.0,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        id: 'l3OffsetX',
        name: { zh: '图层3 (关B) 位移 X', en: 'Layer 3 (No B) Offset X' },
        type: 'slider',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1
      },
      {
        id: 'l3OffsetY',
        name: { zh: '图层3 (关B) 位移 Y', en: 'Layer 3 (No B) Offset Y' },
        type: 'slider',
        defaultValue: 0,
        min: -100,
        max: 100,
        step: 1
      },
      {
        id: 'l3Opacity',
        name: { zh: '图层3 (关B) 不透明度', en: 'Layer 3 (No B) Opacity' },
        type: 'slider',
        defaultValue: 1.0,
        min: 0,
        max: 1,
        step: 0.05
      }
    ]
  });

  registry.register({
    type: 'filter.pixel',
    title: { zh: '像素化', en: 'Pixel Art' },
    category: 'Filter',
    description: { zh: '通过降低采样像素比与二值阈值转换，渲染复古像素画点阵风格，支持 PNG 透明通道。', en: 'Downsamples and applies optional threshold binarization for retro pixel art styling.' },
    headerColor: '#8b5cf6', // Purple accent
    defaultSize: { width: 320, height: 320 },
    minSize: { width: 280, height: 260 },
    actions: [
      { id: 'render', label: { zh: '渲染', en: 'Render' }, variant: 'primary' }
    ],
    inputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '输入源图像流', en: 'Source image stream' }
      }
    ],
    outputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '像素化输出图像流', en: 'Pixel art output stream' }
      }
    ],
    parameters: [
      {
        id: 'scaleRatio',
        name: { zh: '像素采样比例', en: 'Pixel Scale Ratio' },
        type: 'slider',
        defaultValue: 0.25,
        min: 0.05,
        max: 1.0,
        step: 0.01
      },
      {
        id: 'enableThreshold',
        name: { zh: '启用二值阈值', en: 'Enable Threshold' },
        type: 'boolean',
        defaultValue: false
      },
      {
        id: 'threshold',
        name: { zh: '阈值界限 (0-255)', en: 'Threshold (0-255)' },
        type: 'slider',
        defaultValue: 128,
        min: 0,
        max: 255,
        step: 1
      },
      {
        id: 'thresholdMode',
        name: { zh: '阈值模式', en: 'Threshold Mode' },
        type: 'select',
        defaultValue: 'color',
        options: [
          { label: { zh: '保留原色 (Color)', en: 'Color' }, value: 'color' },
          { label: { zh: '黑白二值 (Black & White)', en: 'Black & White' }, value: 'blackWhite' }
        ]
      },
      {
        id: 'enableCustomColor',
        name: { zh: '启用暗部着色 (Screen)', en: 'Enable Dark Area Coloring' },
        type: 'boolean',
        defaultValue: false
      },
      {
        id: 'customColor',
        name: { zh: '暗部着色颜色', en: 'Dark Area Color' },
        type: 'color',
        defaultValue: '#3b82f6'
      }
    ]
  });

  registry.register({
    type: 'filter.colorQuantization',
    title: { zh: '颜色量化', en: 'Color Quantization' },
    category: 'Filter',
    description: { zh: '采用 K-Means 色彩聚类算法提取并减少图片颜色种类，映射调色板风格。', en: 'Applies K-Means color quantization to constrain image colors into a cluster palette.' },
    headerColor: '#06b6d4', // Cyan / Teal accent (Filter)
    defaultSize: { width: 320, height: 320 },
    minSize: { width: 280, height: 260 },
    actions: [
      { id: 'render', label: { zh: '渲染', en: 'Render' }, variant: 'primary' }
    ],
    inputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '输入源图像流', en: 'Source image stream' }
      }
    ],
    outputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '颜色量化输出图像流', en: 'Quantized output image stream' }
      }
    ],
    parameters: [
      {
        id: 'k',
        name: { zh: '聚类颜色数', en: 'Cluster Colors (K)' },
        type: 'slider',
        defaultValue: 8,
        min: 2,
        max: 64,
        step: 1
      },
      {
        id: 'maxIterations',
        name: { zh: '最大迭代次数', en: 'Max Iterations' },
        type: 'slider',
        defaultValue: 10,
        min: 1,
        max: 30,
        step: 1
      }
    ]
  });
}

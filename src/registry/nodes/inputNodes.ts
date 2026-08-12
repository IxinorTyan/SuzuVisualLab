import { NodeRegistry } from '../nodeRegistry';

export function registerInputNodes(registry: NodeRegistry) {
  registry.register({
    type: 'input.image',
    title: { zh: '输入', en: 'Input' },
    category: 'Input',
    description: { zh: '提供管道的图像素材（直接在卡片上上传或拖入图片，删掉卡片则素材丢失）。', en: 'Image source card for the processing pipeline.' },
    headerColor: '#3b82f6', // Blue accent
    defaultSize: { width: 360, height: 320 },
    minSize: { width: 320, height: 260 },
    actions: [
      { id: 'render', label: { zh: '处理输入', en: 'Process Input' }, variant: 'primary' }
    ],
    inputs: [],
    outputs: [
      {
        id: 'image',
        name: { zh: '图像', en: 'Image' },
        type: 'image',
        description: { zh: '输出图像数据流', en: 'Output image stream' }
      }
    ],
    parameters: [
      {
        id: 'denoiseRadius',
        name: { zh: '去噪中值半径', en: 'Denoise Radius' },
        type: 'slider',
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 1
      },
      {
        id: 'scaleRatio',
        name: { zh: '图像缩小比例 (%)', en: 'Scale Ratio (%)' },
        type: 'slider',
        defaultValue: 100,
        min: 10,
        max: 100,
        step: 5
      }
    ]
  });
}

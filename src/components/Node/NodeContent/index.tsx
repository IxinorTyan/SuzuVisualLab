import React from 'react';
import { NodeContentProps } from './types';
import { InputNodeContent } from './InputNodeContent';
import { SvgNodeContent } from './SvgNodeContent';
import { AsciiNodeContent } from './AsciiNodeContent';
import { SketchNodeContent } from './SketchNodeContent';
import { RgbSplitNodeContent } from './RgbSplitNodeContent';
import { PixelNodeContent } from './PixelNodeContent';
import { ColorQuantizationNodeContent } from './ColorQuantizationNodeContent';
import { ExportNodeContent } from './ExportNodeContent';
import { MirageNodeContent } from './MirageNodeContent';

export * from './types';

export function getNodeContent(nodeType: string): React.FC<NodeContentProps> | null {
  const map: Record<string, React.FC<NodeContentProps>> = {
    'input.image': InputNodeContent,
    'output.svg': SvgNodeContent,
    'output.ascii': AsciiNodeContent,
    'filter.sketch': SketchNodeContent,
    'filter.rgbSplit': RgbSplitNodeContent,
    'filter.pixel': PixelNodeContent,
    'filter.colorQuantization': ColorQuantizationNodeContent,
    'output.image': ExportNodeContent,
    'output.mirage': MirageNodeContent,
  };
  return map[nodeType] || null;
}

import { NodeInstance } from '../../../core/NodeInstance';
import { NodeDefinition } from '../../../core/NodeDefinition';

export interface NodeRenderResult {
  svgString?: string;
  asciiData?: any;
  previewUrl?: string;
  blob?: Blob;
}

export interface NodeContentProps {
  instance: NodeInstance;
  definition: NodeDefinition;
  isSelected: boolean;
  draftParams: Record<string, any>;
  livePreviewUrl?: string | null;
  liveCoverPreviewUrl?: string | null;
  liveInnerPreviewUrl?: string | null;
  liveAsciiData?: any;
  isProcessing?: boolean;
  onParameterChange: (paramId: string, value: any) => void;
  onCommitParameter?: (paramId: string, value: any) => void;
  onAction: (actionId: string) => void;
  onRenderResult?: (result: NodeRenderResult) => void;
}

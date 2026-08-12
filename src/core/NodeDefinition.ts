import { PortDefinition } from './Port';
import { ParameterDefinition } from './Parameter';

export type NodeCategory = 'Input' | 'Filter' | 'Output' | 'Color' | 'Math' | 'Utility';

export interface LocalizedString {
  zh: string;
  en: string;
}

export interface LocalizedPortDefinition extends Omit<PortDefinition, 'name' | 'description'> {
  name: LocalizedString | string;
  description?: LocalizedString | string;
}

export interface LocalizedParameterOption {
  label: LocalizedString | string;
  value: string | number;
}

export interface LocalizedParameterDefinition extends Omit<ParameterDefinition, 'name' | 'description' | 'options'> {
  name: LocalizedString | string;
  description?: LocalizedString | string;
  options?: LocalizedParameterOption[];
}

export interface NodeSize {
  width: number;
  height: number;
}

export interface NodeHeaderAction {
  id: string;
  label: LocalizedString | string;
  variant?: 'primary' | 'secondary' | 'emerald';
}

export interface NodeDefinition {
  type: string;                 // e.g. "input.image", "filter.grayscale", "filter.halftone", "output.image"
  title: LocalizedString | string; // Display title, e.g. { zh: "图像输入", en: "Image Input" }
  category: NodeCategory;       // Category for menu grouping
  description?: LocalizedString | string; // Brief explanation
  headerColor?: string;         // Custom accent color for header badge
  defaultSize?: NodeSize;       // Default initial dimensions declared by node definition
  minSize?: NodeSize;           // Node definition declared min floor size
  inputs: LocalizedPortDefinition[];     // Port list
  outputs: LocalizedPortDefinition[];    // Port list
  parameters: LocalizedParameterDefinition[]; // UI Control parameter definitions
  actions?: NodeHeaderAction[]; // Header Action buttons (e.g. Render, Export)
  processor?: (inputs: any, parameters: any) => Promise<any> | any; // Reserved for future execution
}

export function getTranslation(val: LocalizedString | string | undefined, lang: 'zh' | 'en'): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[lang] || val['en'] || '';
}

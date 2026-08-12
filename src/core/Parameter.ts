export type ParameterType = 'number' | 'slider' | 'select' | 'boolean' | 'string' | 'text' | 'color';

export interface ParameterOption {
  label: string;
  value: string | number;
}

export interface ParameterDefinition {
  id: string;
  name: string;
  type: ParameterType;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: ParameterOption[];
  description?: string;
}

export type ParameterValues = Record<string, any>;

export type PortType = 'image' | 'number' | 'color' | 'boolean' | 'any';

export interface PortDefinition {
  id: string;
  name: string;
  type: PortType;
  description?: string;
  multiple?: boolean; // Whether port allows multiple incoming connections
  offsetY?: string;
}

export interface PortState {
  id: string;
  name: string;
  type: PortType;
  connected: boolean;
}

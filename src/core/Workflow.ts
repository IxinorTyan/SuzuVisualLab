import { NodeInstance } from './NodeInstance';
import { Connection } from './Connection';

export interface WorkflowMetadata {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  schemaVersion?: string;
  exportedAt?: string;
  isDemo?: boolean;
  demoVersion?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowData {
  metadata?: WorkflowMetadata;
  nodes: NodeInstance[];
  connections: Connection[];
}

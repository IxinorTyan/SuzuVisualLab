import { ParameterValues } from './Parameter';

export interface Position {
  x: number;
  y: number;
}

export interface NodeInstance {
  id: string;
  type: string;             // References NodeDefinition.type
  position: Position;
  parameters: ParameterValues; // Current parameter values
  titleOverride?: string;   // Optional custom instance title
  width?: number;           // Deprecated legacy field
  height?: number;          // Deprecated legacy field
  size?: {                  // User-adjusted custom size
    width: number;
    height: number;
  };

  // NodeRuntimeState: 维护节点的 Dirty 状态、成功输出的版本与执行签名
  dirty?: boolean;                     // 标记当前节点数据/结果是否已失效 (Dirty)
  outputRevision?: number;             // 最近一次成功生成新输出的递增版本号
  outputResourceId?: string;           // 最近一次成功输出的资源 ID
  lastExecutedSignature?: string;       // 最近一次成功执行或命中的参数/输入签名 Hash
}

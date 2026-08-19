import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LocalizedPortDefinition } from '../../core/NodeDefinition';

interface NodeHandlesProps {
  nodeId?: string;
  inputs: LocalizedPortDefinition[];
  outputs: LocalizedPortDefinition[];
}

export const NodeHandles: React.FC<NodeHandlesProps> = ({ nodeId, inputs, outputs }) => {
  const handlePortClick = (e: React.MouseEvent, portId: string, isSource: boolean) => {
    e.stopPropagation();
    if (!nodeId) return;
    window.dispatchEvent(
      new CustomEvent('suzu_port_handle_clicked', {
        detail: { nodeId, portId, isSource }
      })
    );
  };

  return (
    <>
      {inputs.map((port) => (
        <Handle
          key={`input_${port.id}`}
          type="target"
          position={Position.Left}
          id={port.id}
          onClick={(e) => handlePortClick(e, port.id, false)}
          style={{
            position: 'absolute',
            left: '-16px',
            top: port.offsetY || '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            border: '2.5px solid #ffffff',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.9), 0 0 4px #000000',
            zIndex: 99999,
            pointerEvents: 'all',
            cursor: 'crosshair'
          }}
        />
      ))}

      {outputs.map((port) => (
        <Handle
          key={`output_${port.id}`}
          type="source"
          position={Position.Right}
          id={port.id}
          onClick={(e) => handlePortClick(e, port.id, true)}
          style={{
            position: 'absolute',
            right: '-16px',
            top: port.offsetY || '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            border: '2.5px solid #ffffff',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.9), 0 0 4px #000000',
            zIndex: 99999,
            pointerEvents: 'all',
            cursor: 'crosshair'
          }}
        />
      ))}
    </>
  );
};

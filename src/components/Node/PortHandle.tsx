import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LocalizedPortDefinition, getTranslation } from '../../core/NodeDefinition';
import { useLanguage } from '../../i18n/LanguageContext';

interface PortHandleProps {
  port: LocalizedPortDefinition;
  isInput: boolean;
}

export const PortHandle: React.FC<PortHandleProps> = ({ port, isInput }) => {
  const getPortColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'var(--port-image)';
      case 'number':
        return 'var(--port-number)';
      case 'color':
        return 'var(--port-color)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const { lang } = useLanguage();
  const portColor = getPortColor(port.type);
  const portName = getTranslation(port.name, lang);

  return (
    <div
      className={`visual-node-port-row ${isInput ? 'input' : 'output'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isInput ? 'flex-start' : 'flex-end',
        padding: '4px 12px',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: portColor,
            display: 'inline-block'
          }}
        />
        {portName}
      </span>
    </div>
  );
};

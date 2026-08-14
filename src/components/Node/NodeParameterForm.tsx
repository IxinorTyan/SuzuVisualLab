import React from 'react';
import { LocalizedParameterDefinition, getTranslation } from '../../core/NodeDefinition';
import { useLanguage } from '../../i18n/LanguageContext';
import { resourceStore } from '../../core/ResourceStore';

export interface NodeParameterFormProps {
  parameters: LocalizedParameterDefinition[];
  values: Record<string, any>;
  onChange: (paramId: string, value: any) => void;
  disabled?: boolean;
}

export function NodeParameterForm({
  parameters,
  values,
  onChange,
  disabled = false
}: NodeParameterFormProps) {
  const { lang, t } = useLanguage();

  if (!parameters || parameters.length === 0) {
    return null;
  }

  const vectorMode = values.vectorMode ?? 'smooth';
  const layer3ColorMode = values.layer3ColorMode ?? 'solid';

  return (
    <div className="visual-node-params" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {parameters.map((param) => {
        // Condition 1: Hide smooth-specific parameters if vectorMode is not 'smooth'
        if (vectorMode !== 'smooth' && (param.id === 'cornerHardness' || param.id === 'bezierTolerance')) {
          return null;
        }

        // Condition 2: Hide custom color if layer3ColorMode is not 'solid'
        if (param.id === 'layer3CustomColor' && layer3ColorMode !== 'solid') {
          return null;
        }

        // Condition 3: Pixel Art Filter conditional parameter controls
        const enableThreshold = values.enableThreshold ?? false;
        const thresholdMode = values.thresholdMode ?? 'color';
        const enableCustomColor = values.enableCustomColor ?? false;

        if (!enableThreshold && (param.id === 'threshold' || param.id === 'thresholdMode' || param.id === 'enableCustomColor' || param.id === 'customColor')) {
          return null;
        }

        if (enableThreshold && thresholdMode !== 'blackWhite' && (param.id === 'enableCustomColor' || param.id === 'customColor')) {
          return null;
        }

        if (enableThreshold && thresholdMode === 'blackWhite' && !enableCustomColor && param.id === 'customColor') {
          return null;
        }

        const val = values[param.id] ?? param.defaultValue;
        const paramName = getTranslation(param.name, lang);

        if (param.type === 'slider') {
          return (
            <div key={param.id} className="param-field">
              <div className="param-label" style={{ alignItems: 'center', marginBottom: '4px' }}>
                <span>{paramName}</span>
                <input
                  type="number"
                  className="nodrag"
                  disabled={disabled}
                  min={param.min ?? 0}
                  max={param.max ?? 100}
                  step={param.step ?? 1}
                  value={isNaN(val) ? '' : val}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    const newNum = isNaN(parsed) ? 0 : parsed;
                    onChange(param.id, newNum);
                  }}
                  style={{
                    width: '56px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
              <input
                type="range"
                className="param-slider nodrag"
                disabled={disabled}
                min={param.min ?? 0}
                max={param.max ?? 100}
                step={param.step ?? 1}
                value={isNaN(val) ? 0 : val}
                onChange={(e) => {
                  const newNum = parseFloat(e.target.value);
                  onChange(param.id, newNum);
                }}
              />
            </div>
          );
        }

        if (param.type === 'select') {
          if (param.id === 'resourceId') {
            return (
              <div key={param.id} className="param-field">
                <div className="param-label">
                  <span>{paramName}</span>
                </div>
                <select
                  className="param-select nodrag"
                  disabled={disabled}
                  value={val || ''}
                  onChange={(e) => onChange(param.id, e.target.value)}
                >
                  <option value="">{t('defaultResourceOption')}</option>
                  {resourceStore.getAllResources().map((res: any) => (
                    <option key={res.id} value={res.id}>
                      {res.name} ({new Date(res.createdAt).toLocaleTimeString()})
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={param.id} className="param-field">
              <div className="param-label">
                <span>{paramName}</span>
              </div>
              <select
                className="param-select nodrag"
                disabled={disabled}
                value={val}
                onChange={(e) => {
                  const newPreset = e.target.value;
                  onChange(param.id, newPreset);
                  if (param.id === 'preset' && newPreset !== 'custom') {
                    const presetCharsets: Record<string, string> = {
                      default: 'M@N%W$E#RK&FXYI*l]}1/+i>"!~`:\'. ',
                      simple: '@#S%?*+:;,. ',
                      binary: '01 ',
                      blocks: '█▓▒░ '
                    };
                    if (presetCharsets[newPreset]) {
                      onChange('customCharSet', presetCharsets[newPreset]);
                    }
                  }
                }}
              >
                {param.options?.map((opt) => (
                  <option key={String(opt.value)} value={opt.value}>
                    {getTranslation(opt.label, lang)}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (param.type === 'text' || param.type === 'string') {
          return (
            <div key={param.id} className="param-field">
              <div className="param-label">
                <span>{paramName}</span>
              </div>
              <input
                type="text"
                className="nodrag"
                disabled={disabled}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
                value={val}
                onChange={(e) => {
                  const newTxt = e.target.value;
                  onChange(param.id, newTxt);
                  if (param.id === 'customCharSet') {
                    onChange('preset', 'custom');
                  }
                }}
              />
            </div>
          );
        }

        if (param.type === 'color') {
          return (
            <div
              key={param.id}
              className="param-field"
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span className="param-label">{paramName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  className="nodrag"
                  disabled={disabled}
                  value={val}
                  onChange={(e) => {
                    const newCol = e.target.value;
                    onChange(param.id, newCol);
                  }}
                  style={{
                    width: '28px',
                    height: '22px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                />
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {val}
                </span>
              </div>
            </div>
          );
        }

        if (param.type === 'boolean') {
          return (
            <div
              key={param.id}
              className="param-field"
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span className="param-label">{paramName}</span>
              <input
                type="checkbox"
                className="nodrag"
                disabled={disabled}
                checked={!!val}
                onChange={(e) => {
                  const newBool = e.target.checked;
                  onChange(param.id, newBool);
                }}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

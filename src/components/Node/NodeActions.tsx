import React from 'react';
import { NodeHeaderAction, getTranslation } from '../../core/NodeDefinition';
import { useLanguage } from '../../i18n/LanguageContext';

interface NodeActionsProps {
  actions?: NodeHeaderAction[];
  isDirty?: boolean;
  isRunning?: boolean;
  hasSvgString?: boolean;
  onActionClick: (actionId: string) => void;
}

export const NodeActions: React.FC<NodeActionsProps> = ({
  actions,
  isDirty,
  isRunning,
  hasSvgString,
  onActionClick
}) => {
  const { lang, t } = useLanguage();

  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', marginRight: '8px' }}>
      {actions.map((act) => {
        const actLabel = getTranslation(act.label, lang);

        let btnBg = 'var(--bg-tertiary)';
        let btnColor = 'var(--text-primary)';
        let btnBorder = '1px solid var(--border-color)';

        if (act.variant === 'primary') {
          btnBg = isRunning ? 'var(--bg-tertiary)' : isDirty ? '#f59e0b' : 'var(--accent-blue)';
          btnColor = '#ffffff';
          btnBorder = 'none';
        } else if (act.variant === 'emerald') {
          btnBg = hasSvgString ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)';
          btnColor = hasSvgString ? 'var(--accent-emerald)' : 'var(--text-muted)';
          btnBorder = '1px solid var(--accent-emerald)';
        }

        return (
          <button
            key={act.id}
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(act.id);
            }}
            disabled={isRunning}
            className="nodrag"
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              border: btnBorder,
              backgroundColor: btnBg,
              color: btnColor,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              lineHeight: '1.2'
            }}
          >
            <span>
              {act.id === 'render'
                ? isRunning
                  ? t('renderingBtn')
                  : isDirty
                  ? '渲染提交'
                  : actLabel
                : actLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

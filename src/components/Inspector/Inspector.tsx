import React from 'react';
import { NodeInstance } from '../../core/NodeInstance';
import { nodeRegistry } from '../../registry/nodeRegistry';
import { getTranslation } from '../../core/NodeDefinition';
import { Settings, Trash2, Info, Sliders } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { NodeParameterForm } from '../Node/NodeParameterForm';

interface InspectorProps {
  node: NodeInstance | null;
  workflowData?: any;
  draftParamsMap?: Record<string, Record<string, any>>;
  getDraftParams?: (nodeId: string | null) => Record<string, any> | null;
  onDraftParamsChange?: (nodeId: string, params: Record<string, any>) => void;
  onCommitAndExecute?: (nodeId: string, draftParams?: Record<string, any>) => void;
  onUpdateParameter: (nodeId: string, paramId: string, value: any) => void;
  onRemoveNode: (nodeId: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  node,
  getDraftParams,
  onDraftParamsChange,
  onCommitAndExecute,
  onUpdateParameter,
  onRemoveNode
}) => {
  const { lang, t } = useLanguage();

  if (!node) {
    return (
      <aside
        style={{
          width: '280px',
          height: '100%',
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          zIndex: 10,
          userSelect: 'none'
        }}
      >
        <Sliders size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
        <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {t('noNodeSelected')}
        </h3>
        <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.4' }}>
          {t('selectNodeHint')}
        </p>
      </aside>
    );
  }

  const definition = nodeRegistry.get(node.type);
  if (!definition) return null;

  const nodeTitle = getTranslation(definition.title, lang);
  const nodeDesc = getTranslation(definition.description, lang);
  const categoryKey = `cat${definition.category}` as keyof typeof import('../../i18n/translations').translations['zh'];
  const categoryLabel = t(categoryKey) || definition.category;

  // Read draft parameters when available, fallback to committed node.parameters
  const activeParams = getDraftParams?.(node.id) || node.parameters;
  const isDirty = JSON.stringify(activeParams) !== JSON.stringify(node.parameters);

  return (
    <aside
      style={{
        width: '280px',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        userSelect: 'none'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} style={{ color: 'var(--accent-purple)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('inspectorTitle')}
          </h2>
          {isDirty && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                lineHeight: '1.2'
              }}
              title={t('uncommittedTooltip')}
            >
              {t('uncommitted')}
            </span>
          )}
        </div>
        <button
          onClick={() => onRemoveNode(node.id)}
          title={t('deleteNode')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Node Metadata Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {nodeTitle}
            </span>
            <span className="visual-node-category-badge">{categoryLabel}</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {t('nodeId')}: <code style={{ fontFamily: 'var(--font-mono)' }}>{node.id}</code>
          </p>
          {nodeDesc && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-blue)' }} />
              <span>{nodeDesc}</span>
            </div>
          )}
        </div>

        {/* Focus Action Render & Reset Buttons in Inspector */}
        {definition.actions && definition.actions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {definition.actions.map((act) => {
              const actLabel = getTranslation(act.label, lang);
              const isPrimary = act.variant === 'primary' || act.id === 'render';

              return (
                <button
                  key={act.id}
                  onClick={() => {
                    if (act.id === 'reset') {
                      // Trigger parameter reset to default values on draft state
                      const defaultParams: Record<string, any> = {};
                      definition.parameters.forEach((p) => {
                        defaultParams[p.id] = p.defaultValue;
                      });
                      onDraftParamsChange?.(node.id, defaultParams);
                      return;
                    }

                    // Call unified commitAndExecuteNode from useWorkflow
                    onCommitAndExecute?.(node.id, activeParams);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: isPrimary ? 'none' : '1px solid var(--border-color)',
                    backgroundColor: isPrimary ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                    color: isPrimary ? '#ffffff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: isPrimary
                      ? (isDirty
                          ? '0 0 0 2px rgba(245, 158, 11, 0.6), 0 2px 6px rgba(59, 130, 246, 0.3)'
                          : '0 2px 6px rgba(59, 130, 246, 0.3)')
                      : 'none'
                  }}
                >
                  <span>{actLabel}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Parameters Form using shared NodeParameterForm component */}
        <div>
          <h4
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-muted)',
              marginBottom: '12px'
            }}
          >
            {t('parameters')} ({definition.parameters.length})
          </h4>

          {definition.parameters.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('noParameters')}
            </div>
          ) : (
            <NodeParameterForm
              parameters={definition.parameters}
              values={activeParams}
              onChange={(paramId, value) => {
                onDraftParamsChange?.(node.id, {
                  ...activeParams,
                  [paramId]: value
                });
              }}
            />
          )}
        </div>
      </div>
    </aside>
  );
};

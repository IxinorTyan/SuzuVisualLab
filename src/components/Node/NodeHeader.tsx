import React from 'react';
import { NodeDefinition, getTranslation } from '../../core/NodeDefinition';
import { NodeInstance } from '../../core/NodeInstance';
import { useLanguage } from '../../i18n/LanguageContext';
import { Image, Sparkles, Eye, Sliders, X } from 'lucide-react';

const CategoryIconMap: Record<string, React.ReactNode> = {
  Input: <Image size={14} style={{ color: '#3b82f6' }} />,
  Filter: <Sparkles size={14} style={{ color: '#ec4899' }} />,
  Output: <Eye size={14} style={{ color: '#10b981' }} />
};

interface NodeHeaderProps {
  definition: NodeDefinition;
  instance: NodeInstance;
  isDirty?: boolean;
  onRemoveNode?: (nodeId: string) => void;
  children?: React.ReactNode;
}

export const NodeHeader: React.FC<NodeHeaderProps> = ({
  definition,
  instance,
  isDirty,
  onRemoveNode,
  children
}) => {
  const { lang, t } = useLanguage();
  const nodeTitle = instance.titleOverride || getTranslation(definition.title, lang);
  const categoryKey = `cat${definition.category}` as keyof typeof import('../../i18n/translations').translations['zh'];
  const categoryLabel = t(categoryKey) || definition.category;

  return (
    <div className="visual-node-header">
      <div className="visual-node-title">
        {CategoryIconMap[definition.category] || <Sliders size={14} />}
        <span>{nodeTitle}</span>
        {isDirty && (
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              padding: '1px 5px',
              borderRadius: '4px',
              marginLeft: '6px'
            }}
          >
            未提交
          </span>
        )}
      </div>

      {children}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="visual-node-category-badge">{categoryLabel}</span>
        {onRemoveNode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveNode(instance.id);
            }}
            className="nodrag"
            title={t('deleteNode')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

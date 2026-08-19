import React, { useState, useRef } from 'react';
import { nodeRegistry } from '../../registry/nodeRegistry';
import { NodeDefinition, getTranslation } from '../../core/NodeDefinition';
import { Plus, Search, ChevronRight, ChevronDown, Layers, UploadCloud, FolderPlus, BookOpen } from 'lucide-react';
import { SvgGuideModal } from '../UI/SvgGuideModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { resourceStore } from '../../core/ResourceStore';
import { useToast } from '../UI/ToastContainer';

interface SidebarNodeCardProps {
  node: NodeDefinition;
  index: number;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onCardReorder?: (dragIndex: number, hoverIndex: number) => void;
  onClickAdd?: (nodeType: string) => void;
}

const SidebarNodeCard: React.FC<SidebarNodeCardProps & { onOpenGuide?: () => void }> = ({
  node,
  index,
  onDragStart,
  onCardReorder,
  onClickAdd,
  onOpenGuide
}) => {
  const { lang, t } = useLanguage();
  const title = getTranslation(node.title, lang);
  const desc = getTranslation(node.description, lang);

  const handleCardDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/sidebar-card-index', String(index));
    onDragStart(e, node.type);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDrop = (e: React.DragEvent) => {
    const sourceIdxStr = e.dataTransfer.getData('text/sidebar-card-index');
    if (sourceIdxStr !== '') {
      const sourceIdx = parseInt(sourceIdxStr, 10);
      if (!isNaN(sourceIdx) && sourceIdx !== index && onCardReorder) {
        onCardReorder(sourceIdx, index);
      }
    }
  };

  return (
    <div
      draggable
      onDragStart={handleCardDragStart}
      onDragOver={handleCardDragOver}
      onDrop={handleCardDrop}
      onClick={() => onClickAdd?.(node.type)}
      style={{
        backgroundColor: 'var(--bg-node)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        touchAction: 'manipulation'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-blue)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </span>
          {(node.type === 'output.svg' || node.type === 'filter.colorQuantization') && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                color: '#f97316',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                lineHeight: '1.2'
              }}
            >
              roll
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {node.type === 'output.svg' && onOpenGuide && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenGuide();
              }}
              title={t('svgGuideTitle')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid var(--accent-emerald)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                cursor: 'pointer'
              }}
            >
              <BookOpen size={12} />
              <span>{t('svgGuideBtn')}</span>
            </button>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--accent-blue)'
            }}
            title={t('tapToAddHint')}
          >
            <Plus size={14} />
          </div>
        </div>
      </div>
      {desc && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
          {desc}
        </span>
      )}
    </div>
  );
};

interface NodeSidebarProps {
  onAddNodeDirectly?: (nodeType: string) => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

export const NodeSidebar: React.FC<NodeSidebarProps> = ({ onAddNodeDirectly, onClose, style }) => {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const onFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await resourceStore.addResource(file.name, 'image', file);
        count++;
      }
    }

    if (count > 0) {
      showToast(`成功导入文件夹中 ${count} 张图片素材！`, 'success');
    } else {
      showToast('未在此文件夹中找到有效图片文件。', 'warning');
    }
    e.target.value = '';
  };

  // Dynamic Reorderable Node List State
  const [nodeList, setNodeList] = useState<NodeDefinition[]>(() => nodeRegistry.getAll());

  const rawCategories = nodeRegistry.getCategories();
  // Standardized Category Order: Input -> Filter -> Color -> Math -> Utility -> Output (Fixed Last)
  const categoryOrder = ['Input', 'Filter', 'Color', 'Math', 'Utility', 'Output'];
  const categories = rawCategories.sort((a, b) => {
    const idxA = categoryOrder.indexOf(a);
    const idxB = categoryOrder.indexOf(b);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const handleCardReorder = (dragIndex: number, hoverIndex: number) => {
    setNodeList((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  };


  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredNodes = nodeList.filter((node: NodeDefinition) => {
    const title = getTranslation(node.title, lang).toLowerCase();
    const desc = getTranslation(node.description, lang).toLowerCase();
    const term = searchTerm.toLowerCase();
    return title.includes(term) || desc.includes(term) || node.type.toLowerCase().includes(term);
  });

  return (
    <aside
      style={{
        width: '280px',
        height: '100%',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        userSelect: 'none',
        boxShadow: '2px 0 12px rgba(0,0,0,0.2)',
        ...style
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: 'var(--accent-blue)' }} />
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t('nodeLibrary')}
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '12px'
            }}
            title={t('collapseSidebar')}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>


      {/* Search Input */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '6px 10px'
          }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={t('searchNodes')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Category List & Draggable Nodes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {searchTerm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredNodes.map((node, idx) => (
              <SidebarNodeCard
                key={node.type}
                node={node}
                index={idx}
                onDragStart={onDragStart}
                onCardReorder={handleCardReorder}
                onClickAdd={onAddNodeDirectly}
              />
            ))}
            {filteredNodes.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                {t('noNodesFound')}
              </div>
            )}
          </div>
        ) : (
          categories.map((category) => {
            const categoryNodes = nodeList.filter((n) => n.category === category);
            const isCollapsed = collapsedCategories[category];
            const categoryKey = `cat${category}` as keyof typeof import('../../i18n/translations').translations['zh'];
            const categoryLabel = t(categoryKey) || category;

            return (
              <div key={category} style={{ marginBottom: '16px' }}>
                <div
                  onClick={() => toggleCategory(category)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>{categoryLabel} ({categoryNodes.length})</span>
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </div>

                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    {categoryNodes.map((node: NodeDefinition, idx: number) => (
                      <SidebarNodeCard
                        key={node.type}
                        node={node}
                        index={idx}
                        onDragStart={onDragStart}
                        onCardReorder={handleCardReorder}
                        onClickAdd={onAddNodeDirectly}
                        onOpenGuide={() => setIsGuideOpen(true)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      {/* SuzuSVG Guide Modal */}
      <SvgGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </aside>
  );
};

import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, Cpu, Play, Languages, Palette, ZoomIn, Zap, FileCode, Github } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { WorkflowJsonModal } from './WorkflowJsonModal';

interface HeaderProps {
  onExport: () => string;
  onImport: (json: string) => boolean;
  onClear: () => void;
  enableMagnifier: boolean;
  onToggleMagnifier: () => void;
  enableEdgeAnimation: boolean;
  onToggleEdgeAnimation: () => void;
  canvasBgVariant?: 'dots' | 'lines' | 'cross';
  onChangeCanvasBgVariant?: (variant: 'dots' | 'lines' | 'cross') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onExport,
  onImport,
  onClear,
  enableMagnifier,
  onToggleMagnifier,
  enableEdgeAnimation,
  onToggleEdgeAnimation,
  canvasBgVariant = 'dots',
  onChangeCanvasBgVariant
}) => {
  const { lang, toggleLang, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Feature 1 & 5: Background Picker Popover & Custom Color Input State
  const [showBgPopover, setShowBgPopover] = useState(false);
  const [customColor, setCustomColor] = useState('#1a1c23');
  const [activePreset, setActivePreset] = useState<'checker' | 'white' | 'gray' | 'black' | 'custom'>('checker');

  // Text JSON Modal State
  const [showJsonModal, setShowJsonModal] = useState(false);

  const applyCanvasBg = (preset: 'checker' | 'white' | 'gray' | 'black' | 'custom', hex?: string) => {
    setActivePreset(preset);
    if (preset === 'checker') {
      document.documentElement.style.setProperty('--preview-box-bg', 'transparent');
      document.documentElement.style.setProperty('--preview-box-image', 'none');
    } else {
      const color = hex || (preset === 'white' ? '#ffffff' : preset === 'gray' ? '#1a1c23' : preset === 'black' ? '#000000' : customColor);
      document.documentElement.style.setProperty('--preview-box-bg', color);
      document.documentElement.style.setProperty('--preview-box-image', 'none');
    }
  };

  const handleExportClick = () => {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suzuvisual_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workflowData = (window as any).__SUZU_WORKFLOW_DATA__;
    const hasNodes = Array.isArray(workflowData?.nodes) && workflowData.nodes.length > 0;

    if (hasNodes && !window.confirm(t('importConfirm'))) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          onImport(content);
        } catch (err: any) {
          alert(err.message || t('importError'));
        }
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  return (
    <header
      style={{
        height: '48px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 20,
        userSelect: 'none'
      }}
    >
      {/* Brand & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src="./ico.svg"
          alt="Suzu Visual Lab Icon"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            objectFit: 'contain'
          }}
        />
        <div>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.3px', color: 'var(--text-primary)' }}>
            {t('appTitle')}
          </span>
        </div>
        <a
          href="https://github.com/IxinorTyan/SuzuVisualLab"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub Repository"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '8px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-blue)';
            e.currentTarget.style.color = 'var(--accent-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          <Github size={14} />
          <span>GitHub</span>
        </a>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Feature 5: Canvas Background Picker Popover */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowBgPopover((prev) => !prev)}
            title={t('canvasBg')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <Palette size={14} style={{ color: 'var(--accent-amber)' }} />
            <span>{t('canvasBg')}</span>
          </button>

          {showBgPopover && (
            <div
              style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                width: '210px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: 100
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{t('gridStyle')}</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => onChangeCanvasBgVariant?.('dots')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    border: canvasBgVariant === 'dots' ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    backgroundColor: canvasBgVariant === 'dots' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                    color: canvasBgVariant === 'dots' ? 'var(--accent-blue)' : 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {t('dots')}
                </button>
                <button
                  onClick={() => onChangeCanvasBgVariant?.('lines')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    border: canvasBgVariant === 'lines' ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    backgroundColor: canvasBgVariant === 'lines' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                    color: canvasBgVariant === 'lines' ? 'var(--accent-blue)' : 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {t('lines')}
                </button>
                <button
                  onClick={() => onChangeCanvasBgVariant?.('cross')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    borderRadius: '4px',
                    border: canvasBgVariant === 'cross' ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    backgroundColor: canvasBgVariant === 'cross' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                    color: canvasBgVariant === 'cross' ? 'var(--accent-blue)' : 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {t('cross')}
                </button>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '2px 0' }} />

              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>{t('previewPreset')}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => applyCanvasBg('checker')}
                  title="Checkerboard"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: activePreset === 'checker' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    backgroundColor: '#121316',
                    backgroundImage: 'radial-gradient(#242731 1px, transparent 1px)',
                    backgroundSize: '8px 8px',
                    cursor: 'pointer'
                  }}
                />
                <button
                  onClick={() => applyCanvasBg('white', '#ffffff')}
                  title="White"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: activePreset === 'white' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                />
                <button
                  onClick={() => applyCanvasBg('gray', '#1a1c23')}
                  title="Dark Gray"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: activePreset === 'gray' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    backgroundColor: '#1a1c23',
                    cursor: 'pointer'
                  }}
                />
                <button
                  onClick={() => applyCanvasBg('black', '#000000')}
                  title="Black"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: activePreset === 'black' ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    backgroundColor: '#000000',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Custom Color Input */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('customColor')}</span>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    applyCanvasBg('custom', e.target.value);
                  }}
                  style={{
                    width: '32px',
                    height: '24px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Feature 2: Magnifier Switch Button */}
        <button
          onClick={onToggleMagnifier}
          title={t('magnifier')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '6px',
            backgroundColor: enableMagnifier ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
            border: `1px solid ${enableMagnifier ? 'var(--accent-blue)' : 'var(--border-color)'}`,
            color: enableMagnifier ? 'var(--accent-blue)' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <ZoomIn size={14} />
          <span>{t('magnifier')} {enableMagnifier ? 'ON' : 'OFF'}</span>
        </button>

        {/* Feature 2: Edge Flow Animation Switch Button */}
        <button
          onClick={onToggleEdgeAnimation}
          title={t('animation')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '6px',
            backgroundColor: enableEdgeAnimation ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
            border: `1px solid ${enableEdgeAnimation ? 'var(--accent-emerald)' : 'var(--border-color)'}`,
            color: enableEdgeAnimation ? 'var(--accent-emerald)' : 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Zap size={14} />
          <span>{t('animation')} {enableEdgeAnimation ? 'ON' : 'OFF'}</span>
        </button>

        {/* Language Switch Capsule Button */}
        <button
          onClick={toggleLang}
          title="Switch Language / 切换语言"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        >
          <Languages size={14} style={{ color: 'var(--accent-blue)' }} />
          <span>{lang === 'zh' ? '🇨🇳 中文' : '🇬🇧 English'}</span>
        </button>

        <div style={{ height: '18px', width: '1px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          accept=".json,application/json"
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        >
          <Upload size={14} />
          <span>{t('importJson')}</span>
        </button>

        <button
          onClick={handleExportClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        >
          <Download size={14} />
          <span>{t('exportJson')}</span>
        </button>

        {/* Text JSON Code View / Import / Export Modal Toggle Button */}
        <button
          onClick={() => setShowJsonModal(true)}
          title={t('jsonText')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            color: 'var(--accent-purple)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-purple)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        >
          <FileCode size={14} />
          <span>{t('jsonText')}</span>
        </button>

        <button
          onClick={onClear}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <Trash2 size={14} />
          <span>{t('clearCanvas')}</span>
        </button>

      </div>

      {/* Workflow JSON Text Modal */}
      <WorkflowJsonModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        jsonString={onExport()}
        onImport={onImport}
      />
    </header>
  );
};

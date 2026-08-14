import React from 'react';
import { BookOpen, X, CheckCircle, AlertTriangle, Layers, Zap } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface SvgGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SvgGuideModal: React.FC<SvgGuideModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 11, 14, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-emerald)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('svgGuideTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Scrollable Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Target Scope */}
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {t('targetScopeTitle')}
            </h3>
            <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              {t('targetScopeDesc')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                <CheckCircle size={14} />
                <span>{t('recGood')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                <AlertTriangle size={14} />
                <span>{t('recBad')}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Real Test Cases with Images from /eg */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('testCasesTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#121316', border: '1px solid var(--border-color)' }}>
                  <img src="/eg/svga.png" alt="Case A" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  {t('caseATitle')}
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('caseADesc')}</p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                  {t('caseAResult')}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#121316', border: '1px solid var(--border-color)' }}>
                  <img src="/eg/svgb.png" alt="Case B" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  {t('caseBTitle')}
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('caseBDesc')}</p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>
                  {t('caseBResult')}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Parameter Guides */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('paramGuideTitle')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <div>{t('paramModeDesc')}</div>
              <div>{t('paramScaleDesc')}</div>
              <div>{t('paramColorDesc')}</div>
              <div>{t('paramDenoiseDesc')}</div>
              <div>{t('paramDespeckleDesc')}</div>
              <div>{t('paramRdpDesc')}</div>
              <div>{t('paramCornerDesc')}</div>
              <div>{t('paramBezierDesc')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

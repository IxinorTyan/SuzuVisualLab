import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'error' | 'success';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string | null;
  imageUrl?: string;
}

interface ToastContextType {
  showToast: (message: string | null, type?: ToastType, imageUrl?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string | null, type: ToastType = 'info', imageUrl?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message, imageUrl }]);

    // Easter egg image toasts stay slightly longer (3.5s)
    const duration = imageUrl ? 3500 : 3000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  // Mount global window.__showToast helper
  useEffect(() => {
    (window as any).__showToast = showToast;
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Overlay */}
      <div
        style={{
          position: 'fixed',
          top: '60px',
          right: '20px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error' || toast.type === 'warning';
          const bgColor = isError ? '#2a1a1f' : '#1a2621';
          const borderColor = isError ? '#ef4444' : '#10b981';

          return (
            <div
              key={toast.id}
              style={{
                pointerEvents: 'auto',
                backgroundColor: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '260px',
                maxWidth: '380px',
                fontSize: '13px',
                animation: 'fadeIn 0.2s ease'
              }}
            >
              {isError ? (
                <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              ) : (
                <CheckCircle size={18} style={{ color: '#10b981', flexShrink: 0 }} />
              )}
              <span style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

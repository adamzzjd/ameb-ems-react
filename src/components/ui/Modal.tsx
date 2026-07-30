import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = '740px' }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(11,11,20,.7)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, maxWidth, width: '100%',
        maxHeight: '94vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,.18)',
      }}>
        {/* Header */}
        {(title || subtitle) && (
          <div style={{
            background: 'linear-gradient(145deg,#0b0b14,#12121f)',
            color: '#fff', padding: '18px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            <div>
              {title && <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>}
              {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{subtitle}</div>}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,.08)', border: 'none', color: '#fff',
                width: 30, height: 30, borderRadius: 6, fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: 22 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '14px 22px', borderTop: '1px solid #efebe4',
            display: 'flex', gap: 8, justifyContent: 'flex-end',
            background: '#f8f6f2', position: 'sticky', bottom: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

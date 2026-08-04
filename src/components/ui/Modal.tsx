/* Restyled from scratch - Adamawa State Mass Education Board
   Official Government Website */

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'var(--color-overlay)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl overflow-hidden w-full max-h-[94vh] overflow-y-auto shadow-xl"
        style={{
          background: 'var(--color-surface)',
          maxWidth,
          boxShadow: '0 8px 32px var(--color-shadow), 0 2px 8px var(--color-shadow)',
        }}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div
            className="flex items-center justify-between sticky top-0 z-10"
            style={{
              background: 'var(--color-primary)',
              padding: '18px 22px',
            }}
          >
            <div>
              {title && (
                <div className="text-[15px] font-heading font-bold" style={{ color: 'var(--color-text-inverse)' }}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {subtitle}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-200 hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'var(--color-text-inverse)',
              }}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5 md:p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex gap-2 justify-end sticky bottom-0"
            style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-surface-warm)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

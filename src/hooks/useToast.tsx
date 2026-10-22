import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastContextValue {
  toasts: never[];
  toast: (message: string, isError?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  // Stable identity: components list `toast` in effect dependencies, and a
  // fresh function on every render would re-run those effects in a loop.
  const toast = useCallback((message: string, isError = false) => {
    if (isError) {
      sonnerToast.error(message);
    } else {
      sonnerToast.success(message);
    }
  }, []);

  const value = useMemo(() => ({ toasts: [] as never[], toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

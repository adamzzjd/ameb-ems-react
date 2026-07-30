import { createContext, useContext, type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastContextValue {
  toasts: never[];
  toast: (message: string, isError?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = (message: string, isError = false) => {
    if (isError) {
      sonnerToast.error(message);
    } else {
      sonnerToast.success(message);
    }
  };

  return (
    <ToastContext.Provider value={{ toasts: [], toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface ToastOptions {
  id?: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number; // duration in ms, default 3500ms
}

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string, type?: ToastType) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global helper for calling outside React context
export function emitCustomToast(options: ToastOptions | string, type: ToastType = 'success') {
  if (typeof window === 'undefined') return;
  const detail: ToastOptions = typeof options === 'string'
    ? { message: options, type, title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification' }
    : { type, title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification', ...options };

  window.dispatchEvent(new CustomEvent('app-toast', { detail }));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((options: ToastOptions | string, type: ToastType = 'success') => {
    const opts: ToastOptions = typeof options === 'string' ? { message: options, type } : options;
    const toastType = opts.type || type || 'success';
    const defaultTitle = toastType === 'success' ? 'Success' : toastType === 'error' ? 'Error' : toastType === 'info' ? 'Information' : 'Warning';
    
    const id = opts.id || Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = {
      id,
      title: opts.title || defaultTitle,
      message: opts.message,
      type: toastType,
      duration: opts.duration || 3500,
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // allow up to 5 toasts
  }, []);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastOptions>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    window.addEventListener('app-toast', handleEvent);
    return () => window.removeEventListener('app-toast', handleEvent);
  }, [addToast]);

  const contextValue: ToastContextType = {
    showToast: addToast,
    success: (message: string, title?: string) => addToast({ message, title: title || 'Success', type: 'success' }),
    error: (message: string, title?: string) => addToast({ message, title: title || 'Error', type: 'error' }),
    info: (message: string, title?: string) => addToast({ message, title: title || 'Information', type: 'info' }),
    warning: (message: string, title?: string) => addToast({ message, title: title || 'Warning', type: 'warning' }),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Floating Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {toasts.map(toast => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: emitCustomToast,
      success: (message: string, title?: string) => emitCustomToast({ message, title: title || 'Success', type: 'success' }),
      error: (message: string, title?: string) => emitCustomToast({ message, title: title || 'Error', type: 'error' }),
      info: (message: string, title?: string) => emitCustomToast({ message, title: title || 'Information', type: 'info' }),
      warning: (message: string, title?: string) => emitCustomToast({ message, title: title || 'Warning', type: 'warning' }),
    };
  }
  return ctx;
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Start countdown animation on mount
    const animTimer = setTimeout(() => {
      setProgress(0);
    }, 50);

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, toast.duration);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.duration, onDismiss]);

  const config = {
    success: {
      border: 'border-l-emerald-500',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
      barBg: 'bg-emerald-50 dark:bg-emerald-950',
      barFill: 'bg-emerald-500',
    },
    info: {
      border: 'border-l-[#2F6798]',
      icon: <Info className="w-5 h-5 text-[#2F6798] shrink-0 mt-0.5" />,
      barBg: 'bg-blue-50 dark:bg-blue-950',
      barFill: 'bg-[#2F6798]',
    },
    error: {
      border: 'border-l-red-500',
      icon: <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
      barBg: 'bg-red-50 dark:bg-red-950',
      barFill: 'bg-red-500',
    },
    warning: {
      border: 'border-l-amber-500',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
      barBg: 'bg-amber-50 dark:bg-amber-950',
      barFill: 'bg-amber-500',
    },
  }[toast.type];

  return (
    <div className={cn(
      "pointer-events-auto flex flex-col bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 border-l-4 rounded-xl shadow-2xl animate-in slide-in-from-top-5 duration-200 min-w-[320px] max-w-sm overflow-hidden",
      config.border
    )}>
      <div className="flex items-start gap-3 p-4">
        {config.icon}
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {toast.title}
          </h4>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {toast.message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 shrink-0 cursor-pointer"
          title="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Animated Countdown Progress Bar */}
      <div className={cn("h-1 w-full overflow-hidden", config.barBg)}>
        <div
          className={cn("h-full transition-all ease-linear", config.barFill)}
          style={{
            width: `${progress}%`,
            transitionDuration: `${toast.duration}ms`,
          }}
        />
      </div>
    </div>
  );
}

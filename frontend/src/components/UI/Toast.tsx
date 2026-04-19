import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  success: (msg: string, duration?: number) => void;
  error:   (msg: string, duration?: number) => void;
  warning: (msg: string, duration?: number) => void;
  info:    (msg: string, duration?: number) => void;
}

// ── Context ────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ── Singleton ref so non-React files can call toast too ────────────────────
let _toastRef: ToastContextValue | null = null;
export const toast = {
  success: (msg: string, dur?: number) => _toastRef?.success(msg, dur),
  error:   (msg: string, dur?: number) => _toastRef?.error(msg, dur),
  warning: (msg: string, dur?: number) => _toastRef?.warning(msg, dur),
  info:    (msg: string, dur?: number) => _toastRef?.info(msg, dur),
};

// ── Config per type ─────────────────────────────────────────────────────────
const CONFIG: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string; iconColor: string }> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-green-400',
    text: 'text-gray-900 dark:text-gray-100',
    iconColor: 'text-green-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-red-400',
    text: 'text-gray-900 dark:text-gray-100',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-yellow-400',
    text: 'text-gray-900 dark:text-gray-100',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-blue-400',
    text: 'text-gray-900 dark:text-gray-100',
    iconColor: 'text-blue-500',
  },
};

// ── Single Toast Item ──────────────────────────────────────────────────────
function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const cfg = CONFIG[t.type];
  const Icon = cfg.icon;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(t.id), t.duration ?? 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [t.id, t.duration, onRemove]);

  return (
    <div
      className={`
        flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-lg shadow-lg border-l-4
        ${cfg.bg} ${cfg.border} ${cfg.text}
        animate-slide-in
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
      <button
        onClick={() => onRemove(t.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────
let _idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = ++_idCounter;
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]); // max 5 toasts
  }, []);

  const value: ToastContextValue = {
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur),
    warning: (msg, dur) => add('warning', msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
  };

  // Expose to singleton
  _toastRef = value;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — bottom-right */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Individual toast notification
 */
export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Default toast display duration in milliseconds */
const DEFAULT_DURATION = 4000;

/**
 * Hook to access toast notifications
 * @returns Toast context with helper methods
 * @throws Error if used outside ToastProvider
 */
export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

/**
 * Toast notification provider component
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = DEFAULT_DURATION) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
    const error = useCallback((message: string) => addToast(message, 'error', 6000), [addToast]);
    const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);
    const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

    const value: ToastContextValue = {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

/**
 * Toast container component - renders all active toasts
 */
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
    return (
        <div className="toast-container">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                ))}
            </AnimatePresence>
        </div>
    );
}

const TOAST_ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const TOAST_COLORS: Record<ToastType, string> = {
    success: 'hsl(150, 60%, 45%)',
    error: 'hsl(0, 70%, 55%)',
    warning: 'hsl(40, 90%, 50%)',
    info: 'hsl(220, 70%, 55%)',
};

/**
 * Individual toast notification component
 */
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
    const Icon = TOAST_ICONS[toast.type];
    const color = TOAST_COLORS[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="toast-item"
            style={{ borderLeftColor: color }}
        >
            <Icon size={20} color={color} style={{ flexShrink: 0 }} />
            <span className="toast-message">{toast.message}</span>
            <button onClick={onClose} className="toast-close" aria-label="Dismiss">
                <X size={16} />
            </button>
        </motion.div>
    );
}

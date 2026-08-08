import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck as CheckCircle, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

export interface ToastData {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
}

let toastId = 0;
const listeners: ((t: ToastData) => void)[] = [];

export function showToast(message: string, type: ToastData['type'] = 'success') {
  const t = { id: ++toastId, message, type };
  listeners.forEach((l) => l(t));
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastData[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`glass-card px-5 py-3 flex items-center gap-3 pointer-events-auto cursor-pointer ${
              t.type === 'success' ? 'border-status-open/30' : t.type === 'error' ? 'border-status-emergency/30' : ''
            }`}
            onClick={() => onRemove(t.id)}
          >
            <CheckCircle className={`w-5 h-5 ${t.type === 'success' ? 'text-status-open' : t.type === 'error' ? 'text-status-emergency' : 'text-brand-blue-light'}`} />
            <span className="font-tajawal text-sm font-bold">{t.message}</span>
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const listener = (t: ToastData) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3000);
    };
    listeners.push(listener);
    return () => { listeners.splice(listeners.indexOf(listener), 1); };
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return { toasts, remove };
}

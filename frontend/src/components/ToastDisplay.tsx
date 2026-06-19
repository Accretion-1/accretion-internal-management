import React from 'react';
import { useAppState } from '../contexts/StateContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastDisplay: React.FC = () => {
  const { toasts, dismissToast } = useAppState();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200/60 shadow-emerald-100/50';
      case 'warning':
        return 'bg-amber-55 text-amber-900 border-amber-200/60 shadow-amber-100/50';
      case 'error':
        return 'bg-rose-50 text-rose-900 border-rose-200/60 shadow-rose-100/50';
      default:
        return 'bg-blue-50 text-blue-900 border-blue-200/60 shadow-blue-100/50';
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all ${getColorClass(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-sm font-medium pr-2">
              {toast.message}
            </div>
            <button
              id={`close-${toast.id}`}
              onClick={() => dismissToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 rounded-lg p-0.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

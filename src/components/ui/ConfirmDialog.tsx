import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Evet, Sil',
  cancelLabel = 'İptal',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = {
    danger:  { bg: 'bg-red-500',     text: 'text-red-400',    icon: 'text-red-400'    },
    warning: { bg: 'bg-amber-500',   text: 'text-amber-400',  icon: 'text-amber-400'  },
    info:    { bg: 'bg-cyan-500',    text: 'text-cyan-400',   icon: 'text-cyan-400'   },
  }[variant];

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 ${colors.icon}`}>
              <AlertTriangle size={22} />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-xl ${colors.bg} text-white font-bold hover:opacity-90 transition-opacity`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: (data?: any) => Promise<void> | void;
  saveLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({
  title,
  children,
  onClose,
  onSave,
  saveLabel = 'Kaydet',
  size = 'md',
}: ModalProps) {
  const [saving, setSaving] = useState(false);

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }[size];

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`bg-slate-900 border border-slate-800 w-full ${sizeClass} rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={async e => {
            e.preventDefault();
            if (saving) return;
            setSaving(true);
            try {
              const fd = new FormData(e.currentTarget);
              await onSave(Object.fromEntries(fd.entries()));
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : saveLabel}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

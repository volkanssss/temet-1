import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        {...props}
        className={cn(
          'bg-slate-950 border rounded-xl px-4 py-3 text-slate-200 outline-none transition-colors',
          'placeholder:text-slate-600',
          error
            ? 'border-red-500 focus:border-red-400'
            : 'border-slate-800 focus:border-cyan-500',
          className
        )}
      />
      {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

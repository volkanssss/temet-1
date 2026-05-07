import React from 'react';
import { cn } from '../../lib/utils';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: (string | SelectOption)[];
  error?: string;
  placeholder?: string;
}

export default function Select({ label, options, error, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <select
        {...props}
        className={cn(
          'bg-slate-950 border rounded-xl px-4 py-3 text-slate-200 outline-none transition-colors appearance-none cursor-pointer',
          error
            ? 'border-red-500 focus:border-red-400'
            : 'border-slate-800 focus:border-cyan-500',
          className
        )}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt =>
          typeof opt === 'string'
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
      </select>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

// src/components/ui/Select.jsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Select — dropdown yang konsisten dengan design system ZiDu.
 *
 * @param {{ label?: string, required?: boolean, error?: string, options: Array<{value: string|number, label: string}|string>, placeholder?: string }} props
 */
export const Select = ({ label, required, error, options = [], placeholder, className = '', ...props }) => (
    <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
            <label className="text-xs font-semibold text-slate-700">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
        )}
        <div className="relative">
            <select
                {...props}
                className={`w-full appearance-none px-3 py-2.5 pr-8 rounded-lg text-sm border bg-slate-50 outline-none cursor-pointer transition-all
          focus:ring-3 focus:ring-sky-100 focus:border-sky-500 focus:bg-white
          ${error ? 'border-red-300 text-red-900' : 'border-slate-200 text-slate-900'}
          disabled:opacity-60 disabled:cursor-not-allowed`}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => {
                    const val = typeof opt === 'string' ? opt : opt.value;
                    const lbl = typeof opt === 'string' ? opt : opt.label;
                    return <option key={val} value={val}>{lbl}</option>;
                })}
            </select>
            <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
        </div>
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

export default Select;

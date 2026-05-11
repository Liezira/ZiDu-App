// src/components/ui/Badge.jsx
import React from 'react';

const VARIANTS = {
    easy: 'bg-green-50 text-green-700 border border-green-200',
    medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    hard: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    success: 'bg-green-50 text-green-700 border border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    default: 'bg-slate-50 text-slate-600 border border-slate-200',
};

/**
 * Badge — label kecil dengan warna berdasarkan variant.
 *
 * @param {{ variant?: keyof VARIANTS, children: React.ReactNode, className?: string }} props
 */
export const Badge = ({ variant = 'info', children, className = '' }) => (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full ${VARIANTS[variant] ?? VARIANTS.default} ${className}`}>
        {children}
    </span>
);

export default Badge;

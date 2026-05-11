// src/components/ui/Card.jsx
import React from 'react';

/**
 * Card — container dasar dengan background putih, rounded, border, dan shadow.
 *
 * @param {{ children: React.ReactNode, className?: string }} props
 */
export const Card = ({ children, className = '', ...props }) => (
    <div
        className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${className}`}
        {...props}
    >
        {children}
    </div>
);

export default Card;

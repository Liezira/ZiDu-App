// src/components/ui/Shimmer.jsx
import React from 'react';

/**
 * Shimmer — skeleton loader animasi untuk placeholder konten.
 *
 * @param {{ height?: number|string, width?: number|string, borderRadius?: number|string, className?: string }} props
 */
export const Shimmer = ({
    height = 14,
    width = '100%',
    borderRadius = 6,
    className = '',
}) => (
    <div
        className={`animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:800px_100%] ${className}`}
        style={{ height, width, borderRadius }}
    />
);

/**
 * ShimmerBlock — sekumpulan shimmer untuk card skeleton.
 */
export const ShimmerBlock = ({ rows = 3 }) => (
    <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: rows }).map((_, i) => (
            <Shimmer key={i} height={i === 0 ? 20 : 14} width={i === 0 ? '60%' : '100%'} />
        ))}
    </div>
);

export default Shimmer;

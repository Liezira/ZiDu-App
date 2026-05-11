// src/components/ui/Toast.jsx
import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

const ICONS = {
    success: <CheckCircle2 size={16} className="text-green-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-sky-400" />,
    warning: <AlertCircle size={16} className="text-yellow-400" />,
};

/**
 * Toast — notifikasi sementara di pojok kanan bawah.
 *
 * @param {{ message: string, type?: 'success'|'error'|'info'|'warning', onClose: () => void, duration?: number }} props
 */
export const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div
            className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium cursor-pointer"
            style={{ background: '#0F172A', boxShadow: '0 8px 30px rgba(0,0,0,.25)', animation: 'slideUp .25s ease' }}
            onClick={onClose}
        >
            {ICONS[type]}
            {message}
        </div>
    );
};

export default Toast;

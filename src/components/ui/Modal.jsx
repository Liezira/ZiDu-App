// src/components/ui/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — dialog overlay dengan backdrop blur.
 *
 * @param {{ open: boolean, onClose: () => void, title?: string, maxWidth?: string, children: React.ReactNode }} props
 */
export const Modal = ({
    open,
    onClose,
    title,
    maxWidth = '540px',
    children,
}) => {
    // Tutup dengan Escape
    useEffect(() => {
        if (!open) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[190] flex items-center justify-center p-5"
            style={{ background: 'rgba(15,23,42,.65)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="bg-white rounded-2xl w-full overflow-hidden flex flex-col"
                style={{ maxWidth, maxHeight: '92vh', animation: 'scaleIn .2s ease', boxShadow: '0 30px 80px rgba(0,0,0,.25)' }}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;

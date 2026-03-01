// src/components/ui/ConfirmDialog.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — modal konfirmasi aksi destruktif.
 *
 * @param {{ open: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void, loading?: boolean, confirmLabel?: string, confirmVariant?: 'danger'|'primary' }} props
 */
export const ConfirmDialog = ({
    open,
    title,
    message,
    onConfirm,
    onCancel,
    loading = false,
    confirmLabel = 'Ya, Hapus',
    confirmVariant = 'danger',
}) => {
    if (!open) return null;

    const confirmStyle = confirmVariant === 'danger'
        ? 'bg-red-600 hover:bg-red-700 border-red-600'
        : 'bg-sky-600 hover:bg-sky-700 border-sky-600';

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-5"
            style={{ background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)' }}
        >
            <div
                className="bg-white rounded-2xl p-7 w-full max-w-sm"
                style={{ animation: 'scaleIn .2s ease', boxShadow: '0 25px 60px rgba(0,0,0,.2)' }}
            >
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-red-50 flex items-center justify-center">
                        <AlertTriangle size={18} className="text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                            {title}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold text-white border rounded-lg transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-2 ${confirmStyle}`}
                    >
                        {loading && (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;

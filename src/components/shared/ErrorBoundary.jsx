// src/components/shared/ErrorBoundary.jsx
import React, { Component } from 'react';

/**
 * ErrorBoundary — mencegah crash seluruh aplikasi jika satu halaman throw error.
 * Bungkus lazy-loaded pages dengan komponen ini.
 *
 * @example
 * <ErrorBoundary>
 *   <Suspense fallback={<PageLoader />}>
 *     <SomeLazyPage />
 *   </Suspense>
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
        // TODO: kirim ke monitoring service (Sentry, Datadog, dsb.)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2
                        className="text-xl font-bold text-slate-900 mb-2"
                        style={{ fontFamily: 'Sora, sans-serif' }}
                    >
                        Terjadi Kesalahan
                    </h2>
                    <p className="text-slate-500 mb-6 max-w-sm text-sm leading-relaxed">
                        Halaman ini mengalami error yang tidak terduga. Silakan muat ulang atau kembali ke beranda.
                    </p>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="text-left text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-4 max-w-lg overflow-auto mb-6">
                            {this.state.error.toString()}
                        </pre>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                        >
                            Coba Lagi
                        </button>
                        <a
                            href="/"
                            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition-colors"
                        >
                            Ke Beranda
                        </a>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;

import React, { Component } from 'react';
import { logger } from '../../lib/logger';

// [FIX-C3] Sentry optional — hanya load jika VITE_SENTRY_DSN di-set di .env
// Pakai variable string agar Rollup tidak mencoba resolve package saat build.
// Kalau @sentry/react belum di-install pun, build tetap sukses.
let SentryLib = null;
const SENTRY_PKG = '@sentry/react';
if (import.meta.env.VITE_SENTRY_DSN) {
  import(/* @vite-ignore */ SENTRY_PKG)
    .then(m => { SentryLib = m; })
    .catch(() => {
      logger.warn('[ErrorBoundary] @sentry/react tidak terinstall. Jalankan: npm install @sentry/react');
    });
}

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null, eventId: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logger.error('[ErrorBoundary]', error, info);

    if (SentryLib) {
      const eventId = SentryLib.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
      this.setState({ eventId });
    }

    if (!import.meta.env.DEV) {
      console.error('[ZiDu] Unhandled error:', error?.message);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Terjadi Kesalahan
          </h2>
          <p className="text-slate-500 mb-6 max-w-sm text-sm leading-relaxed">
            Halaman ini mengalami error yang tidak terduga. Silakan muat ulang atau kembali ke beranda.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-4 max-w-lg overflow-auto mb-6">
              {this.state.error.toString()}
            </pre>
          )}
          {this.state.eventId && (
            <p className="text-xs text-slate-400 mb-4">
              Error ID: <code>{this.state.eventId}</code>
            </p>
          )}
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Coba Lagi
            </button>
            <a href="/" className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition-colors">
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

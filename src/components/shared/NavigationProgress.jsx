// src/components/shared/NavigationProgress.jsx
// [FIX-L2] Global top-of-page progress bar saat navigasi antar halaman.
// Terinspirasi NProgress — muncul otomatis saat Suspense loading,
// memberikan visual feedback yang halus tanpa block UI.
//
// Cara pakai: render sekali di root layout, di luar semua routes.
//   <NavigationProgress />

import React, { useEffect, useState, useCallback } from 'react';

/** Durasi satu "tick" progress dalam ms */
const TICK_MS      = 200;
/** Maksimum progress tanpa complete (tidak pernah sampai 100% otomatis) */
const MAX_PROGRESS = 90;
/** Kecepatan increment makin lambat mendekati MAX_PROGRESS */
const INCREMENT    = (current) => {
  if (current < 20)  return 10 + Math.random() * 10;
  if (current < 50)  return 4  + Math.random() * 6;
  if (current < 80)  return 1  + Math.random() * 3;
  return 0.5;
};

export function NavigationProgress() {
  const [progress, setProgress]   = useState(0);
  const [visible,  setVisible]    = useState(false);
  const [complete, setComplete]   = useState(false);

  // Ekspos start/done ke window agar bisa dipanggil dari lazy imports
  // dan dari service calls yang butuh manual control.
  useEffect(() => {
    window.__navProgress = {
      start: () => {
        setComplete(false);
        setProgress(0);
        setVisible(true);
      },
      done: () => {
        setProgress(100);
        setComplete(true);
        setTimeout(() => { setVisible(false); setProgress(0); }, 400);
      },
    };
    return () => { delete window.__navProgress; };
  }, []);

  // Tick progress forward saat visible dan belum complete
  useEffect(() => {
    if (!visible || complete) return;
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= MAX_PROGRESS) return p;
        return Math.min(p + INCREMENT(p), MAX_PROGRESS);
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [visible, complete]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Memuat halaman"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: '3px',
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
          borderRadius: '0 2px 2px 0',
          transition: complete
            ? 'width 0.1s ease-out, opacity 0.3s ease-out'
            : `width ${TICK_MS}ms ease-out`,
          opacity: complete ? 0 : 1,
          boxShadow: '0 0 8px rgba(79,70,229,0.6)',
        }}
      />
    </div>
  );
}

/**
 * HOC — bungkus komponen dengan progress bar trigger.
 * Digunakan di lazy-loaded routes.
 */
export function withNavigationProgress(Component) {
  return function WrappedWithProgress(props) {
    useEffect(() => {
      window.__navProgress?.done();
    }, []);
    return <Component {...props} />;
  };
}

export default NavigationProgress;

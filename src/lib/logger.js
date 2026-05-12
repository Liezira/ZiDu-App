// src/lib/logger.js
// [FIX-L1] Dev-only logger — console calls tidak muncul di production.
// Gunakan ini sebagai pengganti console.log/warn/error di seluruh codebase.
//
// Usage:
//   import { logger } from '../lib/logger';
//   logger.warn('[useExperiment] Fallback:', err?.message);
//   logger.error('[AuthContext] fetchProfile error:', err);

const isDev = import.meta.env.DEV;

export const logger = {
  log:   (...args) => { if (isDev) console.log(...args); },
  warn:  (...args) => { if (isDev) console.warn(...args); },
  error: (...args) => { if (isDev) console.error(...args); },
  info:  (...args) => { if (isDev) console.info(...args); },
  debug: (...args) => { if (isDev) console.debug(...args); },
};

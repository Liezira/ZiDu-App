// src/hooks/useTutorial.js
// Melacak status tutorial per user via localStorage.
// Key: zidu_tutorial_{userId}  →  { seen: bool, completedSteps: string[] }

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = (uid) => `zidu_tutorial_${uid}`;

function load(uid) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    return raw ? JSON.parse(raw) : { seen: false, completedSteps: [] };
  } catch {
    return { seen: false, completedSteps: [] };
  }
}

function save(uid, data) {
  try { localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(data)); } catch {}
}

/**
 * Hook untuk mengelola status tutorial.
 *
 * @param {string|null} userId
 * @returns {{
 *   hasSeenTutorial: boolean,
 *   completedSteps: string[],
 *   markSeen: () => void,
 *   toggleStep: (stepId: string) => void,
 *   resetTutorial: () => void,
 * }}
 */
export function useTutorial(userId) {
  const [state, setState] = useState(() =>
    userId ? load(userId) : { seen: false, completedSteps: [] }
  );

  // Re-load jika userId berubah (misal setelah login)
  useEffect(() => {
    if (userId) setState(load(userId));
  }, [userId]);

  const markSeen = useCallback(() => {
    if (!userId) return;
    const next = { ...state, seen: true };
    setState(next);
    save(userId, next);
  }, [userId, state]);

  const toggleStep = useCallback((stepId) => {
    if (!userId) return;
    setState(prev => {
      const already = prev.completedSteps.includes(stepId);
      const completedSteps = already
        ? prev.completedSteps.filter(s => s !== stepId)
        : [...prev.completedSteps, stepId];
      const next = { ...prev, completedSteps };
      save(userId, next);
      return next;
    });
  }, [userId]);

  const resetTutorial = useCallback(() => {
    if (!userId) return;
    const next = { seen: false, completedSteps: [] };
    setState(next);
    save(userId, next);
  }, [userId]);

  return {
    hasSeenTutorial: state.seen,
    completedSteps: state.completedSteps,
    markSeen,
    toggleStep,
    resetTutorial,
  };
}
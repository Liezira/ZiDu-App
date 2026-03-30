// src/hooks/useExperiment.js
// Hook untuk mendapatkan variant eksperimen berdasarkan class_id siswa.
// Memanggil RPC get_or_assign_variant() di Supabase — hasilnya di-cache
// di sessionStorage agar tidak double-call dalam satu sesi ujian.

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * @param {string|null} experimentId  - UUID eksperimen, null = tidak ada eksperimen aktif
 * @returns {{
 *   variant: 'control'|'treatment'|null,
 *   isLoading: boolean,
 * }}
 */
export function useExperiment(experimentId) {
  const { profile } = useAuth();
  const [variant, setVariant]     = useState(null);
  const [isLoading, setIsLoading] = useState(!!experimentId);

  useEffect(() => {
    if (!experimentId || !profile?.class_id) {
      setIsLoading(false);
      return;
    }

    const cacheKey = `zidu_exp_${experimentId}_${profile.class_id}`;

    // Coba baca dari sessionStorage dulu (cache per session browser)
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setVariant(cached);
      setIsLoading(false);
      return;
    }

    // Panggil RPC Supabase
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_or_assign_variant', {
          p_experiment_id: experimentId,
          p_class_id:      profile.class_id,
        });

        if (error) throw error;

        const resolved = data ?? 'control';
        sessionStorage.setItem(cacheKey, resolved);
        setVariant(resolved);
      } catch (err) {
        console.warn('[useExperiment] Fallback to control:', err?.message);
        setVariant('control'); // Selalu fallback ke control jika error
      } finally {
        setIsLoading(false);
      }
    })();
  }, [experimentId, profile?.class_id]);

  return { variant, isLoading };
}
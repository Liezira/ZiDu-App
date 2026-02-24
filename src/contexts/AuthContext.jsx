import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

// ── Cache helpers ─────────────────────────────────────────────────
const CACHE_KEY = 'zidu_profile_cache';
const CACHE_TTL = 30 * 60 * 1000;

const getCached = (uid) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, id, ts } = JSON.parse(raw);
    if (id !== uid || Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const setCache = (uid, data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, id: uid, ts: Date.now() }));
  } catch {}
};

const clearCache = () => {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeRef   = useRef(true);
  const fetchingRef = useRef(false);

  // Untuk melacak apakah init() sudah selesai — cegah double-fetch
  const initDoneRef = useRef(false);

  useEffect(() => () => { activeRef.current = false; }, []);

  // ── Fetch profil dari DB ──────────────────────────────────────
  const fetchFromDB = useCallback(async (authUser) => {
    // Guard: jika sudah ada fetch yang berjalan, skip
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data: p, error } = await supabase
        .from('profiles')
        .select('id, school_id, role, name, email, phone, avatar_url, nis, class_id, subject_ids, status, rejection_reason')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (!p) {
        if (activeRef.current) { setUser(authUser); setProfile(null); }
        return;
      }

      let school = null;
      if (p.role !== 'super_admin' && p.school_id) {
        const { data: s } = await supabase
          .from('schools')
          .select('id, name, subscription_status, subscription_end_date, subscription_tier, max_students, max_teachers, school_type')
          .eq('id', p.school_id)
          .maybeSingle();
        school = s;
      }

      const full = { ...p, schools: school };
      setCache(authUser.id, full);

      if (activeRef.current) {
        setUser(authUser);
        setProfile(full);
      }
    } catch (err) {
      console.error('fetchProfile error:', err.message);
      if (activeRef.current) {
        setUser(authUser);
        setProfile(null);
      }
    } finally {
      if (activeRef.current) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // ── Cache-first fetch ─────────────────────────────────────────
  const fetchProfile = useCallback(async (authUser, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached(authUser.id);
      if (cached) {
        if (activeRef.current) {
          setUser(authUser);
          setProfile(cached);
          setLoading(false);
        }
        // Refresh di background — tidak block UI, tidak set loading
        setTimeout(() => {
          if (activeRef.current) fetchFromDB(authUser).catch(console.error);
        }, 500);
        return;
      }
    }
    await fetchFromDB(authUser);
  }, [fetchFromDB]);

  // ── Init + Auth listener ──────────────────────────────────────
  useEffect(() => {
    // ── STEP 1: Cek session yang ada (user sudah login sebelumnya) ──
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!activeRef.current) return;

        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch {
        if (activeRef.current) setLoading(false);
      } finally {
        initDoneRef.current = true;
      }
    };

    // ── STEP 2: Dengarkan perubahan auth state ──────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!activeRef.current) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // FIX: Jika init() belum selesai, dia yang handle — tidak perlu double fetch
          // Jika init() sudah selesai (user baru login), baru kita handle di sini
          if (!initDoneRef.current) return;

          // FIX: TIDAK set loading=true di sini — menyebabkan Router unmount → "refresh"
          // Cukup fetch profile, loading sudah false, komponen dalam route akan render ulang
          await fetchProfile(session.user, false);

        } else if (event === 'SIGNED_OUT') {
          clearCache();
          if (activeRef.current) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token refresh tidak perlu fetch ulang profile
          if (activeRef.current) setUser(session.user);
        }
      }
    );

    init();

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Public API ────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    clearCache();
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user, true);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
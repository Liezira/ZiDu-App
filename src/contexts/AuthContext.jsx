import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

// ── Cache helpers ─────────────────────────────────────────────────
const CACHE_KEY = 'zidu_profile_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 menit

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

const invalidateCache = (uid) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.id === uid) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...parsed, ts: 0 }));
    }
  } catch {}
};

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  // loading = true saat: initial check ATAU sedang proses SIGNED_IN
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);

  const fetchFromDB = useCallback(async (authUser) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data: p, error } = await supabase
        .from('profiles')
        .select('id, school_id, role, name, email, phone, avatar_url, nis, class_id, subject_ids')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (!p) {
        setUser(authUser);
        setProfile(null);
        setLoading(false);
        return;
      }

      let school = null;
      if (p.role !== 'super_admin' && p.school_id) {
        const { data: s } = await supabase
          .from('schools')
          .select('id, name, subscription_status, subscription_end_date, subscription_tier, max_students, max_teachers')
          .eq('id', p.school_id)
          .maybeSingle();
        school = s;
      }

      const full = { ...p, schools: school };
      setCache(authUser.id, full);

      // Set semua sekaligus sebelum setLoading(false)
      // Supaya React render sekali dengan data lengkap → redirect langsung
      setUser(authUser);
      setProfile(full);
    } catch (err) {
      console.error('fetchProfile error:', err.message);
      setUser(authUser);
      setProfile(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const fetchProfile = useCallback(async (authUser, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached(authUser.id);
      if (cached) {
        // Cache hit → set SEMUA state sekaligus, loading false
        // React batch update ini → satu render → redirect langsung
        setUser(authUser);
        setProfile(cached);
        setLoading(false);
        // Background refresh cache
        setTimeout(() => fetchFromDB(authUser).catch(console.error), 200);
        return;
      }
    }
    // Tidak ada cache → fetch DB, loading tetap true sampai selesai
    await fetchFromDB(authUser);
  }, [fetchFromDB]);

  useEffect(() => {
    let active = true;

    // Initial session check
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      } finally {
        initializedRef.current = true;
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Kalau init() belum selesai, skip — init() sudah handle
          if (!initializedRef.current) return;

          // Set loading true dulu → App tahu sedang proses → tidak stuck di login page
          setLoading(true);
          await fetchProfile(session.user, false);

        } else if (event === 'SIGNED_OUT') {
          if (user?.id) invalidateCache(user.id);
          setUser(null);
          setProfile(null);
          setLoading(false);

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    if (user?.id) invalidateCache(user.id);
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  const refetchProfile = async () => {
    if (user) {
      setLoading(true);
      await fetchProfile(user, true);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
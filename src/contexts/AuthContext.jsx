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

const clearCache = () => {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ref untuk track active mount dan mencegah state update setelah unmount
  const activeRef      = useRef(true);
  const fetchingRef    = useRef(false);
  const initializedRef = useRef(false);

  // FIX: Simpan current user di ref agar SIGNED_OUT handler tidak pakai stale closure
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => () => { activeRef.current = false; }, []);

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
        if (activeRef.current) { setUser(authUser); setProfile(null); }
        return;
      }

      let school = null;
      if (p.role !== 'super_admin' && p.school_id) {
        const { data: s } = await supabase
          .from('schools')
          .select('id, name, subscription_status, subscription_end_date, subscription_tier, max_students, max_teachers, is_active')
          .eq('id', p.school_id)
          .maybeSingle();
        school = s;
      }

      const full = { ...p, schools: school };
      setCache(authUser.id, full);

      if (activeRef.current) { setUser(authUser); setProfile(full); }
    } catch (err) {
      console.error('fetchProfile error:', err.message);
      if (activeRef.current) { setUser(authUser); setProfile(null); }
    } finally {
      if (activeRef.current) setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const fetchProfile = useCallback(async (authUser, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached(authUser.id);
      if (cached) {
        if (activeRef.current) {
          setUser(authUser);
          setProfile(cached);
          setLoading(false);
        }
        // Background refresh — tidak block UI
        setTimeout(() => fetchFromDB(authUser).catch(console.error), 200);
        return;
      }
    }
    await fetchFromDB(authUser);
  }, [fetchFromDB]);

  useEffect(() => {
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
        initializedRef.current = true;
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!activeRef.current) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Skip jika init() belum selesai — init() sudah handle
          if (!initializedRef.current) return;
          setLoading(true);
          await fetchProfile(session.user, false);

        } else if (event === 'SIGNED_OUT') {
          // FIX: Pakai userRef.current bukan `user` dari closure — hindari stale value
          clearCache();
          if (activeRef.current) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          if (activeRef.current) setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    clearCache();
    // Set state dulu biar UI langsung responsif
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  }, []);

  const refetchProfile = useCallback(async () => {
    if (userRef.current) {
      setLoading(true);
      await fetchProfile(userRef.current, true);
    }
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

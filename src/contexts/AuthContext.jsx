import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

// ── Cache helpers ─────────────────────────────────────────────────
// Pakai TTL 30 menit — cukup lama biar login ulang tetap cepat
const CACHE_KEY = 'zidu_profile_cache';
const CACHE_TTL = 30 * 60 * 1000;

const getCached = (uid) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, id, ts } = JSON.parse(raw);
    // Cache valid: milik user yang sama & belum expired
    if (id !== uid || Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
};

const setCache = (uid, data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, id: uid, ts: Date.now() }));
  } catch { /* storage penuh, skip */ }
};

// TIDAK hapus cache saat logout — hanya invalidate dengan timestamp 0
// Supaya kalau login ulang dengan user yang sama, bisa pakai cache lagi
const invalidateCache = (uid) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    // Hanya invalidate kalau cache milik user yang sama
    if (parsed.id === uid) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...parsed, ts: 0 }));
    }
  } catch { /* ignore */ }
};

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false); // Guard: cegah double fetch

  // ── Fetch profile + school dari DB ────────────────────────────
  const fetchFromDB = useCallback(async (authUser) => {
    // Guard double fetch
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Query profile — select hanya kolom yang dibutuhkan (lebih cepat)
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

      // Fetch sekolah paralel hanya jika bukan super_admin + punya school_id
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

      // Simpan ke cache dengan TTL baru
      setCache(authUser.id, full);
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

  // ── Cache-first fetch ─────────────────────────────────────────
  const fetchProfile = useCallback(async (authUser, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached(authUser.id);
      if (cached) {
        // ✅ Tampil INSTAN dari cache
        setUser(authUser);
        setProfile(cached);
        setLoading(false);
        // Refresh cache di background — UI sudah tampil duluan
        setTimeout(() => fetchFromDB(authUser).catch(console.error), 100);
        return;
      }
    }
    // Tidak ada cache → fetch langsung
    await fetchFromDB(authUser);
  }, [fetchFromDB]);

  // ── Auth listener ─────────────────────────────────────────────
  useEffect(() => {
    let active = true;

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
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Coba pakai cache dulu (meski baru login) — kalau ada & masih valid, instan!
          await fetchProfile(session.user, false);
        } else if (event === 'SIGNED_OUT') {
          // Invalidate (bukan delete) — kalau login lagi dengan user sama, cache masih ada
          // tapi akan di-refresh di background
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
    if (user) await fetchProfile(user, true);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
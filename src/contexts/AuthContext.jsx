import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

// ── Cache helpers ─────────────────────────────────────────────────
const CACHE_KEY = 'zidu_profile_cache';
// [FIX-SEC-01] Kurangi TTL dari 30 menit → 5 menit untuk mempersempit
// window kerentanan bila user memanipulasi localStorage.
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

// [FIX-SEC-01] Hapus 'role' dan 'schools' dari cache:
//   - 'role'    : menentukan akses — tidak boleh bisa dimanipulasi
//   - 'schools' : berisi subscription_status — sensitif secara bisnis
// Kedua field ini selalu diambil langsung dari server (fetchFromDB).
// Field yang tersisa hanya untuk display/UI (nama, avatar, NIS) dan
// tidak dipakai untuk authorization decision apapun.
const SAFE_CACHE_FIELDS = ['id', 'name', 'email', 'avatar_url', 'class_id', 'nis'];

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
    // Hanya simpan field yang aman — hindari data sensitif yang tidak perlu di cache
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([k]) => SAFE_CACHE_FIELDS.includes(k))
    );
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: safeData, id: uid, ts: Date.now() }));
  } catch { }
};

const clearCache = () => {
  try { localStorage.removeItem(CACHE_KEY); } catch { }
};

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeRef = useRef(true);
  const fetchingRef = useRef(false);

  // Untuk melacak apakah init() sudah selesai — cegah double-fetch
  const initDoneRef = useRef(false);

  useEffect(() => () => { activeRef.current = false; }, []);

  // ── Fetch profil dari DB — satu JOIN query (bukan dua query sequential) ──
  const fetchFromDB = useCallback(async (authUser) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Single query dengan JOIN ke schools — mengurangi round-trip dari 2 menjadi 1
      const { data: p, error } = await supabase
        .from('profiles')
        .select(`
          id, school_id, role, name, email, phone,
          avatar_url, nis, class_id, subject_ids, status, rejection_reason,
          schools (
            id, name, subscription_status, subscription_end_date,
            subscription_tier, max_students, max_teachers, school_type
          )
        `)
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (!p) {
        if (activeRef.current) { setUser(authUser); setProfile(null); }
        return;
      }

      // Validasi keamanan: jika role di cache berbeda dari server, invalidate session
      const cached = getCached(authUser.id);
      if (cached && cached.role && cached.role !== p.role) {
        clearCache();
        await supabase.auth.signOut();
        return;
      }

      setCache(authUser.id, p);

      if (activeRef.current) {
        setUser(authUser);
        setProfile(p);
      }
    } catch (err) {
      logger.error('[AuthContext] fetchProfile error:', err.message);
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
  // [FIX-SEC-01] Cache hanya berisi display fields (nama, avatar, NIS).
  // role dan schools tidak dicache — selalu diambil langsung dari DB.
  // Ini mencegah user memanipulasi role via localStorage DevTools.
  const fetchProfile = useCallback(async (authUser, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached(authUser.id);
      if (cached && activeRef.current) {
        // Tampilkan display fields dulu agar tidak blank saat load
        setUser(authUser);
        setProfile(prev => prev ? { ...prev, ...cached } : cached);
      }
    }
    // Selalu fetch DB — satu-satunya sumber truth untuk role + schools
    await fetchFromDB(authUser);
  }, [fetchFromDB]);

  // ── Init + Auth listener ──────────────────────────────────────
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
        initDoneRef.current = true;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!activeRef.current) return;

        if (event === 'SIGNED_IN' && session?.user) {
          if (!initDoneRef.current) return;
          await fetchProfile(session.user, false);

        } else if (event === 'SIGNED_OUT') {
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
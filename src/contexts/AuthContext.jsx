import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

// ── Profile Cache (localStorage, TTL 5 menit) ─────────────────────
const CACHE_KEY = 'zidu_profile_cache';
const CACHE_TTL = 5 * 60 * 1000;

const getCached = (uid) => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, id, ts } = JSON.parse(raw);
    if (id !== uid || Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
};

const setCache = (uid, data) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, id: uid, ts: Date.now() })
    );
  } catch {
    /* storage penuh, skip */
  }
};

const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
};

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch dari Supabase (tanpa cache)
  const fetchFromDB = async (authUser) => {
    try {
      const { data: p, error } = await supabase
        .from('profiles')
        .select(
          'id, school_id, role, name, email, phone, avatar_url, nis, class_id, subject_ids'
        )
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;
      if (!p) {
        setUser(authUser);
        setProfile(null);
        return;
      }

      // Fetch sekolah hanya jika perlu
      let school = null;
      if (p.role !== 'super_admin' && p.school_id) {
        const { data: s } = await supabase
          .from('schools')
          .select(
            'id, name, subscription_status, subscription_end_date, subscription_tier, max_students, max_teachers'
          )
          .eq('id', p.school_id)
          .maybeSingle();
        school = s;
      }

      const full = { ...p, schools: school };
      setCache(authUser.id, full);
      setUser(authUser);
      setProfile(full);
    } catch (err) {
      console.error('fetchProfile error:', err.message);
      setUser(authUser);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dengan cache-first strategy
  const fetchProfile = useCallback(async (authUser, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCached(authUser.id);
      if (cached) {
        // Tampil instan dari cache
        setUser(authUser);
        setProfile(cached);
        setLoading(false);
        // Update cache di background (tanpa block UI)
        fetchFromDB(authUser).catch(console.error);
        return;
      }
    }
    await fetchFromDB(authUser);
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user) await fetchProfile(session.user);
        else setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;
      if (event === 'SIGNED_IN' && session?.user) {
        // Login baru → force refresh biar dapat data terbaru
        await fetchProfile(session.user, true);
      } else if (event === 'SIGNED_OUT') {
        clearCache();
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Hanya update user object, tidak perlu re-fetch profile
        setUser(session.user);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    clearCache();
    await supabase.auth.signOut();
  };

  const refetchProfile = async () => {
    if (user) await fetchProfile(user, true);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, refetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

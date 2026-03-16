import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getInviteByToken, useInviteLink } from '../../services/inviteService';
import {
  Mail, Lock, Eye, EyeOff, User, AlertCircle,
  CheckCircle2, GraduationCap, BookOpen, School,
  Loader2, Link as LinkIcon, Clock, Users,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────
const getStrength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

const mapAuthError = (msg) => {
  if (msg.includes('already registered') || msg.includes('already in use'))
    return 'Email ini sudah terdaftar. Gunakan email lain atau login.';
  if (msg.includes('invalid-email') || msg.includes('invalid email'))
    return 'Format email tidak valid.';
  if (msg.includes('weak-password') || msg.includes('password'))
    return 'Password terlalu lemah. Gunakan minimal 8 karakter.';
  if (msg.includes('network'))
    return 'Koneksi bermasalah. Coba lagi.';
  return 'Terjadi kesalahan. Coba lagi.';
};

const ROLE_META = {
  student: { label: 'Siswa', icon: GraduationCap, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  teacher: { label: 'Guru',  icon: BookOpen,      color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
};

const strengthColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
const strengthLabels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat'];

// ─── Input component ──────────────────────────────────────────────
const Field = ({ label, required, error, hint, icon: Icon, right, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
          {label}{required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focused ? '#4F46E5' : '#CBD5E1', transition: 'color .15s' }} />}
        <input {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e); }}
          onBlur={e => { setFocused(false); props.onBlur?.(e); }}
          style={{
            width: '100%', padding: Icon ? '11px 40px 11px 40px' : '11px 14px',
            paddingRight: right ? '44px' : (Icon ? '14px' : '14px'),
            borderRadius: '10px', fontSize: '13.5px',
            border: `1.5px solid ${error ? '#FCA5A5' : focused ? '#4F46E5' : '#E2E8F0'}`,
            background: focused ? '#FAFBFF' : '#F8FAFC',
            color: '#0F172A', outline: 'none',
            boxShadow: focused ? '0 0 0 3px rgba(79,70,229,.1)' : 'none',
            transition: 'all .18s', boxSizing: 'border-box',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }} />
        {right}
      </div>
      {error && <span style={{ fontSize: '11px', color: '#EF4444' }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: '11px', color: '#94A3B8' }}>{hint}</span>}
    </div>
  );
};

// ─── State screens ────────────────────────────────────────────────
const ScreenShell = ({ children }) => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);} }
      @keyframes spin   { to{transform:rotate(360deg);} }
      .join-card { animation: fadeIn .4s cubic-bezier(0.16,1,0.3,1) both; }
      input::placeholder { color: rgba(148,163,184,0.5); }
    `}</style>
    <div style={{
      minHeight: '100vh', background: '#0D0F1A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {children}
    </div>
  </>
);

// ─── Main Component ───────────────────────────────────────────────
const JoinPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('invite') ?? '';

  // Invite state
  const [invite, setInvite]           = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  // Form state
  const [name, setName]           = useState('');
  const [nis, setNis]             = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  // Load invite
  useEffect(() => {
    if (!token) {
      setInviteError('Link undangan tidak valid atau tidak lengkap.');
      setLoadingInvite(false);
      return;
    }
    getInviteByToken(token).then(inv => {
      if (!inv) setInviteError('Link undangan tidak valid, sudah kadaluarsa, atau kuota penuh.');
      else setInvite(inv);
      setLoadingInvite(false);
    });
  }, [token]);

  const validate = () => {
    const e = {};
    if (!name.trim())          e.name = 'Nama lengkap wajib diisi';
    if (invite?.target_role === 'student' && !nis.trim()) e.nis = 'NIS wajib diisi';
    if (!email.includes('@'))  e.email = 'Format email tidak valid';
    if (password.length < 8)   e.password = 'Password minimal 8 karakter';
    if (getStrength(password) < 2) e.password = 'Password terlalu lemah. Tambah huruf besar atau angka.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invite) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      // 1. Buat auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });
      if (authError) throw authError;
      const uid = authData.user?.id;
      if (!uid) throw new Error('Gagal mendapatkan user ID.');

      // 2. Upsert profile — RLS: user baru bisa insert profilnya sendiri
      const profilePayload = {
        id:         uid,
        name:       name.trim(),
        email:      email.trim().toLowerCase(),
        role:       invite.target_role,
        school_id:  invite.school_id,
        class_id:   invite.class_id ?? null,
        nis:        invite.target_role === 'student' ? nis.trim() : null,
        status:     invite.target_role === 'student' ? 'active' : 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([profilePayload]);
      if (profileError) throw profileError;

      // 3. Increment use_count via RPC (atomic, aman race condition)
      await useInviteLink(token, uid);

      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setErrors(prev => ({ ...prev, _form: mapAuthError(err.message || '') }));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loadingInvite) {
    return (
      <ScreenShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <span style={{ fontSize: '13px', color: '#475569' }}>Memverifikasi link undangan...</span>
        </div>
      </ScreenShell>
    );
  }

  // ── Invalid invite ──
  if (inviteError) {
    return (
      <ScreenShell>
        <div className="join-card" style={{
          width: '100%', maxWidth: '400px',
          background: '#161823', borderRadius: '20px',
          border: '1px solid rgba(255,255,255,.07)',
          padding: '40px 32px', textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,.5)',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(239,68,68,.12)', border: '2px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <LinkIcon size={22} color="#F87171" />
          </div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '10px' }}>
            Link Tidak Valid
          </h2>
          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.65, marginBottom: '24px' }}>{inviteError}</p>
          <Link to="/login" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', background: '#5B6CF6', color: '#fff', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>
            Ke Halaman Login
          </Link>
        </div>
      </ScreenShell>
    );
  }

  // ── Success ──
  if (done) {
    return (
      <ScreenShell>
        <div className="join-card" style={{
          width: '100%', maxWidth: '400px',
          background: '#161823', borderRadius: '20px',
          border: '1px solid rgba(255,255,255,.07)',
          padding: '40px 32px', textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,.5)',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(16,185,129,.1)', border: '2px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={24} color="#10B981" />
          </div>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '10px' }}>
            Akun Berhasil Dibuat!
          </h2>
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65 }}>
            {invite?.class_name
              ? <>Kamu berhasil bergabung ke <strong style={{ color: '#818CF8' }}>{invite.class_name}</strong>.</>
              : 'Akunmu sudah aktif.'}
            <br />Mengarahkan ke halaman login...
          </p>
        </div>
      </ScreenShell>
    );
  }

  const meta = ROLE_META[invite.target_role] || ROLE_META.student;
  const RoleIcon = meta.icon;
  const strength = getStrength(password);

  // ── Form ──
  return (
    <ScreenShell>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#5B6CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: '800', fontSize: '15px', color: '#fff' }}>Z</div>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: '800', fontSize: '17px', color: '#E2E8F0', letterSpacing: '-0.3px' }}>ZiDu</span>
      </div>

      {/* Invite info card */}
      <div className="join-card" style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.08)',
        borderRadius: '14px', padding: '14px 18px',
        marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RoleIcon size={18} color={meta.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#E2E8F0' }}>
              Kamu diundang sebagai
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
              {meta.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {invite.class_name && (
              <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <School size={11} /> {invite.class_name}
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} />
              Berlaku hingga {new Date(invite.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {invite.max_uses > 0 && (
              <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={11} />
                {invite.use_count}/{invite.max_uses} terpakai
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="join-card" style={{
        width: '100%', maxWidth: '420px',
        background: '#161823', borderRadius: '20px',
        border: '1px solid rgba(255,255,255,.07)',
        boxShadow: '0 24px 64px rgba(0,0,0,.5)',
        padding: '32px 28px',
      }}>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '20px', fontWeight: '800', color: '#F1F5F9', marginBottom: '5px' }}>
          Buat Akun
        </h1>
        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '24px' }}>
          Isi data di bawah untuk bergabung
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Nama */}
          <Field
            label="Nama Lengkap" required
            icon={User} type="text"
            placeholder="Nama lengkap kamu"
            value={name} onChange={e => setName(e.target.value)}
            error={errors.name}
          />

          {/* NIS (hanya untuk student) */}
          {invite.target_role === 'student' && (
            <Field
              label="NIS (Nomor Induk Siswa)" required
              icon={GraduationCap} type="text"
              placeholder="Contoh: 2024001"
              value={nis} onChange={e => setNis(e.target.value)}
              error={errors.nis}
              hint="NIS sesuai data sekolah"
            />
          )}

          {/* Email */}
          <Field
            label="Alamat Email" required
            icon={Mail} type="email"
            placeholder="email@kamu.com"
            value={email} onChange={e => setEmail(e.target.value)}
            error={errors.email}
          />

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
              Password <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#CBD5E1' }} />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '11px 44px 11px 42px',
                  borderRadius: '10px', fontSize: '13.5px',
                  border: `1.5px solid ${errors.password ? '#FCA5A5' : '#E2E8F0'}`,
                  background: '#F8FAFC', color: '#0F172A', outline: 'none',
                  boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'all .18s',
                }}
                onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = errors.password ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Strength bar */}
            {password && (
              <div>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ flex: 1, height: '3px', borderRadius: '99px', background: i < strength ? strengthColors[strength - 1] : 'rgba(255,255,255,.08)', transition: 'background .3s' }} />
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: strength > 0 ? strengthColors[strength - 1] : '#94A3B8' }}>
                  {strength > 0 ? strengthLabels[strength - 1] : ''}
                </span>
              </div>
            )}
            {errors.password && <span style={{ fontSize: '11px', color: '#EF4444' }}>{errors.password}</span>}
          </div>

          {/* Global form error */}
          {errors._form && (
            <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#F87171', display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errors._form}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={submitting}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
              background: submitting ? '#4338CA' : '#5B6CF6', color: '#fff',
              fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background .18s', marginTop: '4px',
            }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#4F46E5'; }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#5B6CF6'; }}>
            {submitting && <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
            {submitting ? 'Membuat akun...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#475569', marginTop: '18px' }}>
          Sudah punya akun?{' '}
          <Link to="/login" style={{ color: '#818CF8', fontWeight: '700', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.color = '#A5B4FC'}
            onMouseLeave={e => e.target.style.color = '#818CF8'}>
            Masuk di sini
          </Link>
        </p>
      </div>

      <p style={{ marginTop: '20px', fontSize: '12px', color: '#1E2535' }}>
        © 2026 ZiDu · RuangSimulasi
      </p>
    </ScreenShell>
  );
};

export default JoinPage;
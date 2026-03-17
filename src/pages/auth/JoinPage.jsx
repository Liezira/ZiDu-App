import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getInviteByToken, useInviteLink } from '../../services/inviteService';
import {
  Mail, Lock, Eye, EyeOff, User, AlertCircle,
  CheckCircle2, GraduationCap, BookOpen, School,
  Clock, Users, ChevronRight, ChevronLeft,
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
  if (msg.includes('network')) return 'Koneksi bermasalah. Coba lagi.';
  return 'Terjadi kesalahan. Coba lagi.';
};

const ROLE_META = {
  student: { label: 'Siswa', icon: GraduationCap, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  teacher: { label: 'Guru',  icon: BookOpen,       color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
};

const strengthColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'];
const strengthLabels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat'];

// ─── Field atom ───────────────────────────────────────────────────
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
            paddingRight: right ? '44px' : '14px',
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

// ─── Shell ────────────────────────────────────────────────────────
const Shell = ({ children }) => (
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
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#5B6CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", fontWeight: '800', fontSize: '15px', color: '#fff' }}>Z</div>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: '800', fontSize: '17px', color: '#E2E8F0', letterSpacing: '-0.3px' }}>ZiDu</span>
      </div>
      {children}
      <p style={{ marginTop: '20px', fontSize: '12px', color: '#1E2535' }}>© 2026 ZiDu · RuangSimulasi</p>
    </div>
  </>
);

// ─── Step indicator (for teacher flow) ───────────────────────────
const StepBar = ({ step }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, width: '100%', maxWidth: 420 }}>
    {[1, 2].map((s, i) => (
      <React.Fragment key={s}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
            background: step >= s ? '#5B6CF6' : 'rgba(255,255,255,.08)',
            color: step >= s ? '#fff' : '#475569',
            transition: 'all .3s',
          }}>{step > s ? <CheckCircle2 size={14}/> : s}</div>
          <span style={{ fontSize: 12, color: step >= s ? '#E2E8F0' : '#475569', fontWeight: step === s ? 600 : 400 }}>
            {s === 1 ? 'Informasi Akun' : 'Setup Mengajar'}
          </span>
        </div>
        {i < 1 && <div style={{ flex: 1, height: 2, borderRadius: 99, background: step > 1 ? '#5B6CF6' : 'rgba(255,255,255,.08)', transition: 'background .3s' }} />}
      </React.Fragment>
    ))}
  </div>
);

// ─── Main ────────────────────────────────────────────────────────
const JoinPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('invite') ?? '';

  const [invite, setInvite]           = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  // Step 1 — akun dasar
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState('');
  const [nis, setNis]             = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [errors, setErrors]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState(false);

  // Step 2 — teacher setup
  const [subjects, setSubjects]       = useState([]);   // available subjects
  const [classes, setClasses]         = useState([]);   // available classes
  const [selSubjects, setSelSubjects] = useState([]);   // selected subject IDs
  const [selClasses, setSelClasses]   = useState([]);   // selected class IDs (wali kelas none, just teaching)
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Err, setStep2Err]       = useState('');
  const [newUserId, setNewUserId]     = useState(null); // UID setelah step 1

  // Load invite
  useEffect(() => {
    if (!token) { setInviteError('Link undangan tidak valid atau tidak lengkap.'); setLoadingInvite(false); return; }
    getInviteByToken(token).then(inv => {
      if (!inv) setInviteError('Link undangan tidak valid, sudah kadaluarsa, atau kuota penuh.');
      else setInvite(inv);
      setLoadingInvite(false);
    });
  }, [token]);

  // When step 2 for teacher — load subjects & classes
  useEffect(() => {
    if (step !== 2 || !invite?.school_id) return;
    setStep2Loading(true);
    Promise.all([
      supabase.from('subjects').select('id, name, code').eq('school_id', invite.school_id).order('name'),
      supabase.from('classes').select('id, name, grade_level').eq('school_id', invite.school_id).order('name'),
    ]).then(([subjRes, clsRes]) => {
      setSubjects(subjRes.data || []);
      setClasses(clsRes.data || []);
    }).finally(() => setStep2Loading(false));
  }, [step, invite?.school_id]);

  const toggleSubject = (id) => setSelSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleClass   = (id) => setSelClasses(prev  => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const validateStep1 = () => {
    const e = {};
    if (!name.trim())         e.name     = 'Nama lengkap wajib diisi';
    if (invite?.target_role === 'student' && !nis.trim()) e.nis = 'NIS wajib diisi';
    if (!email.includes('@')) e.email    = 'Format email tidak valid';
    if (password.length < 8)  e.password = 'Password minimal 8 karakter';
    if (getStrength(password) < 2) e.password = 'Password terlalu lemah. Tambah huruf besar atau angka.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!invite) return;
    if (!validateStep1()) return;
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: name.trim() } },
      });
      if (authError) throw authError;
      const uid = authData.user?.id;
      if (!uid) throw new Error('Gagal mendapatkan user ID.');

      // Upsert profile basic info
      const profilePayload = {
        id: uid, name: name.trim(), email: email.trim().toLowerCase(),
        role: invite.target_role, school_id: invite.school_id,
        class_id: invite.class_id ?? null,
        nis: invite.target_role === 'student' ? nis.trim() : null,
        status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase.from('profiles').upsert([profilePayload]);
      if (profileError) throw profileError;

      await useInviteLink(token, uid);

      // Teacher → go to step 2 for subject/class setup
      if (invite.target_role === 'teacher') {
        setNewUserId(uid);
        setStep(2);
      } else {
        setDone(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, _form: mapAuthError(err.message || '') }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2 = async () => {
    if (selSubjects.length === 0) { setStep2Err('Pilih minimal 1 mata pelajaran yang kamu ajar.'); return; }
    setSubmitting(true); setStep2Err('');
    try {
      const { error } = await supabase.from('profiles').update({
        subject_ids: selSubjects,
        updated_at: new Date().toISOString(),
      }).eq('id', newUserId);
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStep2Err(err.message || 'Gagal menyimpan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loadingInvite) return (
    <Shell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <span style={{ fontSize: '13px', color: '#475569' }}>Memverifikasi link undangan...</span>
      </div>
    </Shell>
  );

  // ── Invalid ──
  if (inviteError) return (
    <Shell>
      <div className="join-card" style={{ width: '100%', maxWidth: '400px', background: '#161823', borderRadius: '20px', border: '1px solid rgba(255,255,255,.07)', padding: '40px 32px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.5)' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(239,68,68,.12)', border: '2px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={22} color="#F87171" />
        </div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '10px' }}>Link Tidak Valid</h2>
        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.65, marginBottom: '24px' }}>{inviteError}</p>
        <Link to="/login" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '10px', background: '#5B6CF6', color: '#fff', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}>Ke Halaman Login</Link>
      </div>
    </Shell>
  );

  // ── Done ──
  if (done) return (
    <Shell>
      <div className="join-card" style={{ width: '100%', maxWidth: '400px', background: '#161823', borderRadius: '20px', border: '1px solid rgba(255,255,255,.07)', padding: '40px 32px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.5)' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(16,185,129,.1)', border: '2px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle2 size={24} color="#10B981" />
        </div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '10px' }}>Akun Berhasil Dibuat!</h2>
        <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65 }}>
          {invite?.class_name ? <>Kamu berhasil bergabung ke <strong style={{ color: '#818CF8' }}>{invite.class_name}</strong>.<br/></> : ''}
          Mengarahkan ke halaman login...
        </p>
      </div>
    </Shell>
  );

  const meta = ROLE_META[invite.target_role] || ROLE_META.student;
  const RoleIcon = meta.icon;
  const strength = getStrength(password);
  const isTeacher = invite.target_role === 'teacher';

  return (
    <Shell>
      {/* Step bar — only for teacher */}
      {isTeacher && <StepBar step={step} />}

      {/* Invite info chip */}
      {step === 1 && (
        <div className="join-card" style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '14px', padding: '14px 18px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RoleIcon size={18} color={meta.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#E2E8F0' }}>Diundang sebagai</span>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px', background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>{meta.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {invite.class_name && (
                <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}><School size={11}/>{invite.class_name}</span>
              )}
              <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11}/>Berlaku hingga {new Date(invite.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1: Akun dasar ── */}
      {step === 1 && (
        <div className="join-card" style={{ width: '100%', maxWidth: '420px', background: '#161823', borderRadius: '20px', border: '1px solid rgba(255,255,255,.07)', boxShadow: '0 24px 64px rgba(0,0,0,.5)', padding: '32px 28px' }}>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '20px', fontWeight: '800', color: '#F1F5F9', marginBottom: '5px' }}>Buat Akun</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '24px' }}>Isi data di bawah untuk bergabung</p>

          <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Field label="Nama Lengkap" required icon={User} type="text" placeholder="Nama lengkap kamu"
              value={name} onChange={e => setName(e.target.value)} error={errors.name} />

            {!isTeacher && (
              <Field label="NIS (Nomor Induk Siswa)" required icon={GraduationCap} type="text" placeholder="Contoh: 2024001"
                value={nis} onChange={e => setNis(e.target.value)} error={errors.nis} hint="NIS sesuai data sekolah" />
            )}

            <Field label="Alamat Email" required icon={Mail} type="email" placeholder="email@kamu.com"
              value={email} onChange={e => setEmail(e.target.value)} error={errors.email} />

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Password <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#CBD5E1' }} />
                <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 karakter" value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '11px 44px 11px 42px', borderRadius: '10px', fontSize: '13.5px', border: `1.5px solid ${errors.password ? '#FCA5A5' : '#E2E8F0'}`, background: '#F8FAFC', color: '#0F172A', outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all .18s' }}
                  onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,.1)'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = errors.password ? '#FCA5A5' : '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {password && (
                <div>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
                    {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: '3px', borderRadius: '99px', background: i < strength ? strengthColors[strength-1] : 'rgba(255,255,255,.08)', transition: 'background .3s' }} />)}
                  </div>
                  <span style={{ fontSize: '11px', color: strength > 0 ? strengthColors[strength-1] : '#94A3B8' }}>{strength > 0 ? strengthLabels[strength-1] : ''}</span>
                </div>
              )}
              {errors.password && <span style={{ fontSize: '11px', color: '#EF4444' }}>{errors.password}</span>}
            </div>

            {errors._form && (
              <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#F87171', display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }}/><span>{errors._form}</span>
              </div>
            )}

            <button type="submit" disabled={submitting}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#5B6CF6', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px', opacity: submitting ? 0.8 : 1, transition: 'all .18s' }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#4F46E5'; }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#5B6CF6'; }}>
              {submitting
                ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Membuat akun...</>
                : isTeacher ? <>Lanjut: Setup Mengajar <ChevronRight size={15}/></> : 'Daftar Sekarang'
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#475569', marginTop: '18px' }}>
            Sudah punya akun?{' '}
            <Link to="/login" style={{ color: '#818CF8', fontWeight: '700', textDecoration: 'none' }}>Masuk di sini</Link>
          </p>
        </div>
      )}

      {/* ── STEP 2: Teacher setup (mapel + kelas) ── */}
      {step === 2 && isTeacher && (
        <div className="join-card" style={{ width: '100%', maxWidth: '480px', background: '#161823', borderRadius: '20px', border: '1px solid rgba(255,255,255,.07)', boxShadow: '0 24px 64px rgba(0,0,0,.5)', padding: '32px 28px' }}>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '20px', fontWeight: '800', color: '#F1F5F9', marginBottom: '5px' }}>Setup Mengajar</h1>
          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '24px' }}>
            Pilih mapel yang kamu ajar. Admin sekolah bisa mengubah ini nanti.
          </p>

          {step2Loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Mata Pelajaran */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '10px' }}>
                  Mata Pelajaran yang Diajar <span style={{ color: '#EF4444' }}>*</span>
                </label>
                {subjects.length === 0 ? (
                  <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', fontSize: '13px', color: '#475569', textAlign: 'center' }}>
                    Belum ada mata pelajaran yang didaftarkan di sekolah ini.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {subjects.map(s => {
                      const active = selSubjects.includes(s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggleSubject(s.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: '9px', border: `2px solid ${active ? '#5B6CF6' : 'rgba(255,255,255,.1)'}`, background: active ? 'rgba(91,108,246,.15)' : 'rgba(255,255,255,.04)', color: active ? '#A5B4FC' : '#64748B', fontSize: '13px', fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all .15s', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                          <BookOpen size={13} color={active ? '#818CF8' : '#475569'} />
                          {s.name}{s.code && <span style={{ fontSize: '11px', opacity: .6 }}>({s.code})</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selSubjects.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#10B981', marginTop: 8 }}>✓ {selSubjects.length} mapel dipilih</p>
                )}
              </div>

              {/* Kelas yang diajar (opsional) */}
              {classes.length > 0 && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' }}>
                    Kelas yang Diajar <span style={{ color: '#475569', fontWeight: 400, textTransform: 'none', fontSize: '11px', letterSpacing: 0 }}>(opsional, bisa diatur admin)</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {classes.map(cls => {
                      const active = selClasses.includes(cls.id);
                      return (
                        <button key={cls.id} type="button" onClick={() => toggleClass(cls.id)}
                          style={{ padding: '6px 12px', borderRadius: '8px', border: `2px solid ${active ? '#10B981' : 'rgba(255,255,255,.1)'}`, background: active ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.04)', color: active ? '#34D399' : '#64748B', fontSize: '12px', fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all .15s', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                          Kelas {cls.grade_level} – {cls.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step2Err && (
                <div style={{ padding: '11px 14px', borderRadius: '10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#F87171', display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }}/><span>{step2Err}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep(1)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,.1)', background: 'none', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'}>
                  <ChevronLeft size={14}/> Kembali
                </button>
                <button onClick={handleStep2} disabled={submitting}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#5B6CF6', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submitting ? 0.8 : 1, transition: 'all .18s' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#4F46E5'; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#5B6CF6'; }}>
                  {submitting
                    ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Menyimpan...</>
                    : <><CheckCircle2 size={15}/> Selesai & Masuk</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
};

export default JoinPage;
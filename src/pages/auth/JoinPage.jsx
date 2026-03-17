import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getInviteByToken, useInviteLink } from '../../services/inviteService';
import {
  Mail, Lock, Eye, EyeOff, User, AlertCircle,
  CheckCircle2, GraduationCap, BookOpen, School,
  Clock, ChevronRight, ChevronLeft, Sparkles,
} from 'lucide-react';

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
  student: { label: 'Siswa',  icon: GraduationCap, accent: '#F59E0B', soft: '#FFFBEB', border: '#FDE68A', glow: 'rgba(245,158,11,.18)' },
  teacher: { label: 'Guru',   icon: BookOpen,       accent: '#10B981', soft: '#ECFDF5', border: '#A7F3D0', glow: 'rgba(16,185,129,.18)' },
};

const strengthColors = ['#EF4444','#F59E0B','#3B82F6','#10B981'];
const strengthLabels = ['Sangat Lemah','Lemah','Cukup','Kuat'];

// ── AddSubjectInput component ─────────────────────────────────────
const AddSubjectInput = ({ customSubjects, onAdd, onRemove }) => {
  const [val, setVal]   = useState('');
  const [focused, setFocused] = useState(false);

  const submit = () => {
    if (!val.trim()) return;
    onAdd(val.trim());
    setVal('');
  };

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Input row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: customSubjects.length > 0 ? 10 : 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <BookOpen size={14} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focused ? '#818CF8' : 'rgba(148,163,184,.4)', transition: 'color .15s' }} />
          <input
            type="text"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ketik nama mapel, lalu Enter..."
            style={{
              width: '100%', padding: '10px 14px 10px 40px', borderRadius: 10, fontSize: 13.5,
              border: `1.5px solid ${focused ? '#6366F1' : 'rgba(255,255,255,.1)'}`,
              background: focused ? 'rgba(99,102,241,.06)' : 'rgba(255,255,255,.04)',
              color: '#F1F5F9', outline: 'none', boxSizing: 'border-box',
              boxShadow: focused ? '0 0 0 4px rgba(99,102,241,.1)' : 'none',
              transition: 'all .2s', fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!val.trim()}
          style={{
            padding: '10px 16px', borderRadius: 10, border: 'none',
            background: val.trim() ? 'linear-gradient(135deg,#4F46E5,#6366F1)' : 'rgba(255,255,255,.06)',
            color: val.trim() ? '#fff' : '#475569',
            fontSize: 13, fontWeight: 700, cursor: val.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .2s',
            whiteSpace: 'nowrap', flexShrink: 0,
            boxShadow: val.trim() ? '0 0 14px rgba(99,102,241,.3)' : 'none',
          }}>
          + Tambah
        </button>
      </div>

      {/* Custom pills */}
      {customSubjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {customSubjects.map(s => (
            <div key={s.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: '2px solid #6366F1', background: 'rgba(99,102,241,.14)', color: '#C7D2FE', fontSize: 13, fontWeight: 700, boxShadow: '0 0 12px rgba(99,102,241,.2)' }}>
              <BookOpen size={11} color="#818CF8" />
              {s.name}
              <button type="button" onClick={() => onRemove(s.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', display: 'flex', alignItems: 'center', padding: 0, marginLeft: 2 }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const JoinPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('invite') ?? '';

  const [invite, setInvite]               = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError]     = useState('');

  const [step, setStep]             = useState(1);
  const [name, setName]             = useState('');
  const [nis, setNis]               = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [focused, setFocused]       = useState('');
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);

  const [subjects, setSubjects]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [selSubjects, setSelSubjects]   = useState([]);
  const [selClasses, setSelClasses]     = useState([]);
  const [customSubjects, setCustomSubjects] = useState([]); // mapel yang diketik manual
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Err, setStep2Err]         = useState('');
  const [newUserId, setNewUserId]       = useState(null);

  useEffect(() => {
    if (!token) { setInviteError('Link undangan tidak valid atau tidak lengkap.'); setLoadingInvite(false); return; }
    getInviteByToken(token).then(inv => {
      if (!inv) setInviteError('Link undangan tidak valid, sudah kadaluarsa, atau kuota penuh.');
      else setInvite(inv);
      setLoadingInvite(false);
    });
  }, [token]);

  useEffect(() => {
    if (step !== 2 || !invite?.school_id) return;
    setStep2Loading(true);
    Promise.all([
      supabase.from('subjects').select('id,name,code').eq('school_id', invite.school_id).order('name'),
      supabase.from('classes').select('id,name,grade_level').eq('school_id', invite.school_id).order('name'),
    ]).then(([s, cl]) => { setSubjects(s.data || []); setClasses(cl.data || []); })
      .finally(() => setStep2Loading(false));
  }, [step, invite?.school_id]);

  const toggleSubject      = id => setSelSubjects(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleClass        = id => setSelClasses(p  => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const addCustomSubject   = name => {
    const trimmed = name.trim();
    if (!trimmed || customSubjects.find(s => s.name.toLowerCase() === trimmed.toLowerCase())) return;
    setCustomSubjects(p => [...p, { id: `custom_${Date.now()}`, name: trimmed, isCustom: true }]);
  };
  const removeCustomSubject = id => setCustomSubjects(p => p.filter(s => s.id !== id));

  const validateStep1 = () => {
    const e = {};
    if (!name.trim())         e.name     = 'Nama lengkap wajib diisi';
    if (invite?.target_role === 'student' && !nis.trim()) e.nis = 'NIS wajib diisi';
    if (!email.includes('@')) e.email    = 'Format email tidak valid';
    if (password.length < 8)  e.password = 'Password minimal 8 karakter';
    if (getStrength(password) < 2) e.password = 'Password terlalu lemah';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleStep1 = async e => {
    e.preventDefault();
    if (!invite || !validateStep1()) return;
    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { full_name: name.trim() } },
      });
      if (authError) throw authError;
      const uid = authData.user?.id;
      if (!uid) throw new Error('Gagal mendapatkan user ID.');
      await supabase.from('profiles').upsert([{
        id: uid, name: name.trim(), email: email.trim().toLowerCase(),
        role: invite.target_role, school_id: invite.school_id,
        class_id: invite.class_id ?? null,
        nis: invite.target_role === 'student' ? nis.trim() : null,
        status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }]);
      await useInviteLink(token, uid);
      if (invite.target_role === 'teacher') { setNewUserId(uid); setStep(2); }
      else { setDone(true); setTimeout(() => navigate('/login'), 3000); }
    } catch (err) {
      setErrors(p => ({ ...p, _form: mapAuthError(err.message || '') }));
    } finally { setSubmitting(false); }
  };

  const handleStep2 = async () => {
    const allSelected = selSubjects.length + customSubjects.length;
    if (allSelected === 0) { setStep2Err('Pilih atau tambah minimal 1 mata pelajaran yang kamu ajar.'); return; }
    setSubmitting(true); setStep2Err('');
    try {
      // Insert custom subjects ke DB sekolah dulu
      let finalSubjectIds = [...selSubjects];
      if (customSubjects.length > 0) {
        const inserts = customSubjects.map(s => ({
          school_id: invite.school_id,
          name: s.name,
          code: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        const { data: newSubjs, error: subjErr } = await supabase
          .from('subjects')
          .insert(inserts)
          .select('id');
        if (subjErr) throw subjErr;
        finalSubjectIds = [...finalSubjectIds, ...(newSubjs || []).map(s => s.id)];
      }
      await supabase.from('profiles').update({
        subject_ids: finalSubjectIds,
        updated_at: new Date().toISOString(),
      }).eq('id', newUserId);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) { setStep2Err(err.message || 'Gagal menyimpan.'); }
    finally { setSubmitting(false); }
  };

  // ── Computed ──────────────────────────────────────────────────
  const isTeacher = invite?.target_role === 'teacher';
  const meta = ROLE_META[invite?.target_role || 'student'];
  const RoleIcon = meta.icon;
  const strength = getStrength(password);

  const INPUT = name => ({
    width: '100%', padding: '13px 16px 13px 44px',
    borderRadius: '12px', fontSize: '14px',
    border: `1.5px solid ${errors[name] ? '#FECACA' : focused === name ? '#6366F1' : 'rgba(255,255,255,.1)'}`,
    background: focused === name ? 'rgba(99,102,241,.06)' : 'rgba(255,255,255,.04)',
    color: '#F1F5F9', outline: 'none',
    boxShadow: focused === name ? '0 0 0 4px rgba(99,102,241,.12)' : 'none',
    transition: 'all .2s', boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  });

  const ICON_STYLE = name => ({
    position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
    pointerEvents: 'none', transition: 'color .2s',
    color: focused === name ? '#818CF8' : 'rgba(148,163,184,.5)',
  });

  // ── CSS ───────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #070B14; }
    @keyframes fadeUp   { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
    @keyframes spin     { to{transform:rotate(360deg);} }
    @keyframes pulse    { 0%,100%{opacity:.6;}50%{opacity:1;} }
    @keyframes shimmer  { 0%{background-position:-600px 0;}100%{background-position:600px 0;} }
    .join-in            { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
    .join-in-d1         { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) .07s both; }
    .join-in-d2         { animation: fadeUp .5s cubic-bezier(.16,1,.3,1) .14s both; }
    input::placeholder  { color: rgba(100,116,139,.6); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
  `;

  // ── Loading ───────────────────────────────────────────────────
  if (loadingInvite) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ width: 16, height: 16, border: '2px solid rgba(99,102,241,.3)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <span style={{ fontSize: 14, color: '#475569' }}>Memverifikasi link...</span>
      </div>
    </>
  );

  // ── Invalid ───────────────────────────────────────────────────
  if (inviteError) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div className="join-in" style={{ width: '100%', maxWidth: 400, background: '#0F1420', borderRadius: 24, border: '1px solid rgba(239,68,68,.2)', padding: '48px 36px', textAlign: 'center', boxShadow: '0 0 60px rgba(239,68,68,.06)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,.1)', border: '1.5px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={24} color="#F87171" />
          </div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: '#F1F5F9', marginBottom: 8 }}>Link Tidak Valid</h2>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, marginBottom: 28 }}>{inviteError}</p>
          <Link to="/login" style={{ display: 'inline-block', padding: '11px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#4F46E5,#6366F1)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Ke Halaman Login</Link>
        </div>
      </div>
    </>
  );

  // ── Done ──────────────────────────────────────────────────────
  if (done) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div className="join-in" style={{ width: '100%', maxWidth: 400, background: '#0F1420', borderRadius: 24, border: '1px solid rgba(16,185,129,.2)', padding: '48px 36px', textAlign: 'center', boxShadow: '0 0 60px rgba(16,185,129,.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,.1)', border: '1.5px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={28} color="#10B981" />
          </div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 10 }}>Selamat Datang! 🎉</h2>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
            Akun kamu sudah aktif.{invite?.class_name ? <> Kamu bergabung ke <strong style={{ color: '#818CF8' }}>{invite.class_name}</strong>.</> : null}
            <br/>Mengarahkan ke halaman login...
          </p>
          <div style={{ marginTop: 24, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg,#10B981,#34D399)', borderRadius: 99, animation: 'shimmer 1.5s ease infinite', backgroundSize: '600px 100%' }} />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* Background — mesh gradient */}
      <div style={{
        minHeight: '100vh', background: '#070B14', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {/* Decorative orbs */}
        <div style={{ position: 'fixed', top: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${meta.glow} 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 1s' }} />

        {/* Logo */}
        <div className="join-in" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4F46E5,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,.4)', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, color: '#fff' }}>Z</div>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 18, color: '#E2E8F0', letterSpacing: '-0.4px' }}>ZiDu</span>
        </div>

        {/* Step bar — teacher only */}
        {isTeacher && (
          <div className="join-in-d1" style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, width: '100%', maxWidth: 480 }}>
            {[
              { n: 1, label: 'Informasi Akun' },
              { n: 2, label: 'Setup Mengajar' },
            ].map((s, i) => (
              <React.Fragment key={s.n}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    background: step > s.n ? 'linear-gradient(135deg,#4F46E5,#6366F1)' : step === s.n ? 'linear-gradient(135deg,#4F46E5,#6366F1)' : 'rgba(255,255,255,.06)',
                    color: step >= s.n ? '#fff' : '#475569',
                    boxShadow: step >= s.n ? '0 0 14px rgba(99,102,241,.4)' : 'none',
                    transition: 'all .4s',
                  }}>
                    {step > s.n ? <CheckCircle2 size={14}/> : s.n}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: step === s.n ? 600 : 400, color: step >= s.n ? '#C7D2FE' : '#334155', whiteSpace: 'nowrap', transition: 'color .3s' }}>
                    {s.label}
                  </span>
                </div>
                {i < 1 && (
                  <div style={{ flex: 1, height: 2, borderRadius: 99, background: step > 1 ? 'linear-gradient(90deg,#4F46E5,#6366F1)' : 'rgba(255,255,255,.06)', margin: '0 8px', transition: 'background .5s' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── Invite chip ── */}
        {step === 1 && (
          <div className="join-in-d1" style={{
            width: '100%', maxWidth: 480, marginBottom: 12,
            background: 'rgba(255,255,255,.03)',
            border: `1px solid ${meta.border}22`,
            borderRadius: 16, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: meta.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 20px ${meta.glow}` }}>
              <RoleIcon size={18} color={meta.accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#CBD5E1' }}>Diundang sebagai</span>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: meta.soft, color: meta.accent, border: `1px solid ${meta.border}`, letterSpacing: '0.02em' }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {invite.class_name && (
                  <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <School size={11} color="#475569"/>{invite.class_name}
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} color="#334155"/>
                  Berlaku hingga {new Date(invite.expires_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 1 ══ */}
        {step === 1 && (
          <div className="join-in-d2" style={{ width: '100%', maxWidth: 480, background: '#0F1420', borderRadius: 24, border: '1px solid rgba(255,255,255,.07)', boxShadow: '0 32px 80px rgba(0,0,0,.5)', overflow: 'hidden' }}>

            {/* Card header accent */}
            <div style={{ height: 3, background: 'linear-gradient(90deg,#4F46E5,#818CF8,#4F46E5)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }} />

            <div style={{ padding: '32px 32px 36px' }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 6, letterSpacing: '-0.3px' }}>
                  Buat Akun {meta.label}
                </h1>
                <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
                  {isTeacher ? 'Lengkapi data dan setup jadwal mengajar kamu' : 'Isi data untuk bergabung ke kelas'}
                </p>
              </div>

              <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Nama */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Nama Lengkap <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={ICON_STYLE('name')} />
                    <input type="text" placeholder="Nama lengkap kamu" value={name} onChange={e => setName(e.target.value)}
                      onFocus={() => setFocused('name')} onBlur={() => setFocused('')}
                      style={INPUT('name')} />
                  </div>
                  {errors.name && <p style={{ fontSize: 11.5, color: '#F87171', marginTop: 5 }}>{errors.name}</p>}
                </div>

                {/* NIS — siswa saja */}
                {!isTeacher && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>NIS <span style={{ color: '#EF4444' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <GraduationCap size={15} style={ICON_STYLE('nis')} />
                      <input type="text" placeholder="Nomor Induk Siswa" value={nis} onChange={e => setNis(e.target.value)}
                        onFocus={() => setFocused('nis')} onBlur={() => setFocused('')}
                        style={INPUT('nis')} />
                    </div>
                    {errors.nis && <p style={{ fontSize: 11.5, color: '#F87171', marginTop: 5 }}>{errors.nis}</p>}
                  </div>
                )}

                {/* Email */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Email <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={ICON_STYLE('email')} />
                    <input type="email" placeholder="email@kamu.com" value={email} onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                      style={INPUT('email')} />
                  </div>
                  {errors.email && <p style={{ fontSize: 11.5, color: '#F87171', marginTop: 5 }}>{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Password <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={ICON_STYLE('password')} />
                    <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 karakter" value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                      style={{ ...INPUT('password'), paddingRight: 48 }} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: 4 }}>
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {/* Strength */}
                  {password.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                        {[0,1,2,3].map(i => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, transition: 'background .3s', background: i < strength ? strengthColors[strength-1] : 'rgba(255,255,255,.07)' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11.5, color: strength > 0 ? strengthColors[strength-1] : '#475569', fontWeight: 500 }}>
                        {strength > 0 ? strengthLabels[strength-1] : ''}
                      </span>
                    </div>
                  )}
                  {errors.password && <p style={{ fontSize: 11.5, color: '#F87171', marginTop: 5 }}>{errors.password}</p>}
                </div>

                {/* Form error */}
                {errors._form && (
                  <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, color: '#F87171' }}/>{errors._form}
                  </div>
                )}

                {/* CTA */}
                <button type="submit" disabled={submitting}
                  style={{ width: '100%', padding: '14px', marginTop: 4, borderRadius: 14, border: 'none', background: submitting ? 'rgba(99,102,241,.5)' : 'linear-gradient(135deg,#4F46E5,#6366F1)', color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, transition: 'all .2s', boxShadow: submitting ? 'none' : '0 0 24px rgba(99,102,241,.35)' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.boxShadow = '0 0 36px rgba(99,102,241,.5)'; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.boxShadow = '0 0 24px rgba(99,102,241,.35)'; }}>
                  {submitting
                    ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> Membuat akun...</>
                    : isTeacher
                      ? <>Lanjut: Setup Mengajar <ChevronRight size={16}/></>
                      : <><Sparkles size={15}/> Daftar Sekarang</>
                  }
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#334155', marginTop: 22 }}>
                Sudah punya akun?{' '}
                <Link to="/login" style={{ color: '#818CF8', fontWeight: 700, textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color = '#A5B4FC'}
                  onMouseLeave={e => e.target.style.color = '#818CF8'}>Masuk di sini</Link>
              </p>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Teacher setup ══ */}
        {step === 2 && isTeacher && (
          <div className="join-in-d2" style={{ width: '100%', maxWidth: 520, background: '#0F1420', borderRadius: 24, border: '1px solid rgba(255,255,255,.07)', boxShadow: '0 32px 80px rgba(0,0,0,.5)', overflow: 'hidden' }}>
            <div style={{ height: 3, background: `linear-gradient(90deg,${meta.accent},#34D399)` }} />

            <div style={{ padding: '32px 32px 36px' }}>
              <div style={{ marginBottom: 26 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 18px ${meta.glow}` }}>
                    <BookOpen size={17} color={meta.accent} />
                  </div>
                  <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Setup Mengajar</h1>
                </div>
                <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.55, marginLeft: 48 }}>
                  Pilih mapel yang kamu ajar. Admin bisa mengubah ini kapan saja.
                </p>
              </div>

              {step2Loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                  <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,.1)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                  {/* Mata Pelajaran */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Mata Pelajaran <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      {(selSubjects.length + customSubjects.length) > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: meta.accent, background: meta.soft, padding: '3px 10px', borderRadius: 999 }}>
                          ✓ {selSubjects.length + customSubjects.length} dipilih
                        </span>
                      )}
                    </div>
                    {/* Input tambah mapel mandiri — muncul saat kosong ATAU sebagai opsi tambah */}
                    <AddSubjectInput
                      customSubjects={customSubjects}
                      onAdd={addCustomSubject}
                      onRemove={removeCustomSubject}
                    />

                    {subjects.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {subjects.map(s => {
                          const active = selSubjects.includes(s.id);
                          return (
                            <button key={s.id} type="button" onClick={() => toggleSubject(s.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 10, border: `2px solid ${active ? '#6366F1' : 'rgba(255,255,255,.08)'}`, background: active ? 'rgba(99,102,241,.14)' : 'rgba(255,255,255,.03)', color: active ? '#C7D2FE' : '#64748B', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all .18s', fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: active ? '0 0 14px rgba(99,102,241,.2)' : 'none' }}>
                              <BookOpen size={12} color={active ? '#818CF8' : '#475569'}/>
                              {s.name}
                              {s.code && <span style={{ fontSize: 11, opacity: .5 }}>({s.code})</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Separator + add custom label when existing subjects shown */}
                    {subjects.length > 0 && (
                      <p style={{ fontSize: 12, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)', display: 'inline-block' }}/>
                        <span>Mapelmu tidak ada? Tambah di bawah</span>
                        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)', display: 'inline-block' }}/>
                      </p>
                    )}
                  </div>

                  {/* Kelas */}
                  {classes.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Kelas yang Diajar
                          <span style={{ color: '#334155', fontWeight: 400, textTransform: 'none', fontSize: 11, letterSpacing: 0, marginLeft: 6 }}>(opsional)</span>
                        </label>
                        {selClasses.length > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: meta.accent, background: meta.soft, padding: '3px 10px', borderRadius: 999 }}>
                            ✓ {selClasses.length} kelas
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {classes.map(cls => {
                          const active = selClasses.includes(cls.id);
                          return (
                            <button key={cls.id} type="button" onClick={() => toggleClass(cls.id)}
                              style={{ padding: '8px 14px', borderRadius: 9, border: `2px solid ${active ? meta.accent : 'rgba(255,255,255,.08)'}`, background: active ? `${meta.soft}22` : 'rgba(255,255,255,.03)', color: active ? meta.accent : '#64748B', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all .18s', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                              {cls.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step2Err && (
                    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                      <AlertCircle size={15} style={{ flexShrink: 0, color: '#F87171' }}/>{step2Err}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" onClick={() => setStep(1)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '12px 20px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.1)', background: 'none', color: '#64748B', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'; e.currentTarget.style.color = '#94A3B8'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#64748B'; }}>
                      <ChevronLeft size={15}/> Kembali
                    </button>
                    <button type="button" onClick={handleStep2} disabled={submitting}
                      style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: submitting ? `rgba(16,185,129,.4)` : `linear-gradient(135deg,${meta.accent},#34D399)`, color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, transition: 'all .2s', boxShadow: submitting ? 'none' : `0 0 24px ${meta.glow}` }}>
                      {submitting
                        ? <><div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/> Menyimpan...</>
                        : <><CheckCircle2 size={15}/> Selesai & Masuk</>
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: 12, color: '#1E293B' }}>© 2026 ZiDu · RuangSimulasi</p>
      </div>
    </>
  );
};

export default JoinPage;
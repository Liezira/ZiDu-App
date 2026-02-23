import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Mail, Phone, Lock, Camera, Save, AlertCircle,
  CheckCircle2, Eye, EyeOff, Shield, School, BookOpen,
  Crown, GraduationCap, LogOut, RefreshCw,
} from 'lucide-react';

const ROLE_META = {
  super_admin:  { label: 'Super Admin',   icon: Crown,         color: '#4F46E5', bg: '#EEF2FF' },
  school_admin: { label: 'Admin Sekolah', icon: Shield,        color: '#0891B2', bg: '#EFF6FF' },
  teacher:      { label: 'Guru',          icon: BookOpen,      color: '#16A34A', bg: '#F0FDF4' },
  student:      { label: 'Siswa',         icon: GraduationCap, color: '#D97706', bg: '#FFFBEB' },
};

const Field = ({ label, icon: Icon, error, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'flex', alignItems: 'center', gap: '5px', letterSpacing: '0.02em' }}>
      {Icon && <Icon size={12} style={{ color: '#94A3B8' }} />}{label}
    </label>
    {children}
    {error && <span style={{ fontSize: '11px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={10} />{error}</span>}
    {hint && !error && <span style={{ fontSize: '11px', color: '#94A3B8' }}>{hint}</span>}
  </div>
);

const TextInput = ({ error, style: propStyle, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{
        padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
        color: props.disabled ? '#94A3B8' : '#0F172A', fontFamily: "'DM Sans', sans-serif",
        border: `1.5px solid ${error ? '#FCA5A5' : focused ? '#0891B2' : '#E2E8F0'}`,
        background: props.disabled ? '#F8FAFC' : focused ? '#fff' : '#F8FAFC', outline: 'none',
        width: '100%', boxSizing: 'border-box', cursor: props.disabled ? 'not-allowed' : 'text',
        boxShadow: focused && !props.disabled ? '0 0 0 3px rgba(8,145,178,.1)' : 'none',
        transition: 'all .15s', ...propStyle,
      }} />
  );
};

const Toast = ({ msg, type, onDismiss }) => (
  <div onClick={onDismiss} style={{ position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 400, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '14px', background: type === 'error' ? '#DC2626' : '#0F172A', color: '#fff', fontSize: '14px', fontWeight: '600', boxShadow: '0 12px 40px rgba(0,0,0,.25)', fontFamily: "'DM Sans', sans-serif", animation: 'toastIn .3s cubic-bezier(.34,1.56,.64,1)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
    {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} style={{ color: '#4ADE80' }} />}
    {msg}
  </div>
);

const SaveBtn = ({ loading, onClick, children = 'Simpan Perubahan' }) => (
  <button onClick={onClick} disabled={loading}
    style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#0891B2', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif", transition: 'background .15s' }}
    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#0E7490'; }}
    onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}>
    {loading
      ? <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      : <Save size={14} />}
    {children}
  </button>
);

const SectionCard = ({ title, icon: Icon, iconColor = '#0891B2', iconBg = '#EFF6FF', children }) => (
  <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={14} style={{ color: iconColor }} />
      </div>
      <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: 0 }}>{title}</h3>
    </div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

const ProfilePage = () => {
  const { profile, refetchProfile, signOut } = useAuth();

  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd,    setShowPwd]    = useState({ current: false, new: false, confirm: false });
  const [pwdErrors,  setPwdErrors]  = useState({});
  const [savingPwd,  setSavingPwd]  = useState(false);

  const [uploading, setUploading] = useState(false);
  const [toast,     setToast]     = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (profile) { setName(profile.name || ''); setPhone(profile.phone || ''); }
  }, [profile?.id]);

  const handleSaveProfile = async () => {
    const e = {};
    if (!name.trim()) e.name = 'Nama tidak boleh kosong';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim(), phone: phone.trim() || null, updated_at: new Date().toISOString() }).eq('id', profile.id);
      if (error) throw error;
      await refetchProfile();
      showToast('Profil berhasil diperbarui ✓');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    const e = {};
    if (!currentPwd) e.currentPwd = 'Masukkan password saat ini';
    if (newPwd.length < 8) e.newPwd = 'Password minimal 8 karakter';
    if (newPwd !== confirmPwd) e.confirmPwd = 'Password tidak cocok';
    setPwdErrors(e);
    if (Object.keys(e).length) return;
    setSavingPwd(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPwd });
      if (signInErr) { setPwdErrors({ currentPwd: 'Password saat ini salah' }); return; }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      showToast('Password berhasil diubah ✓');
    } catch (err) { showToast(err.message, 'error'); }
    finally { setSavingPwd(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Ukuran foto maks 2MB', 'error'); return; }
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `avatars/${profile.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl + '?t=' + Date.now(), updated_at: new Date().toISOString() }).eq('id', profile.id);
      await refetchProfile();
      showToast('Foto profil diperbarui ✓');
    } catch (err) { showToast(err.message || 'Gagal upload foto', 'error'); }
    finally { setUploading(false); }
  };

  const rm = ROLE_META[profile?.role] || ROLE_META.student;
  const RoleIcon = rm.icon;
  const initials = (profile?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const pwdStrength = !newPwd ? 0 : newPwd.length >= 12 ? 4 : newPwd.length >= 10 ? 3 : newPwd.length >= 8 ? 2 : 1;
  const strengthColor = ['#F1F5F9', '#EF4444', '#D97706', '#FBBF24', '#16A34A'][pwdStrength];
  const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'][pwdStrength];

  const infoRows = [
    { label: 'Email',           value: profile?.email || '—' },
    profile?.role === 'student' && { label: 'NIS',     value: profile?.nis || '—' },
    profile?.schools?.name      && { label: 'Sekolah', value: profile.schools.name },
    profile?.schools            && { label: 'Paket',   value: (profile.schools.subscription_tier || '—').charAt(0).toUpperCase() + (profile.schools.subscription_tier || '').slice(1) },
    profile?.schools            && { label: 'Langganan', value: profile.schools.subscription_status, badge: true },
  ].filter(Boolean);

  const PwdEye = ({ field }) => (
    <button type="button" onClick={() => setShowPwd(s => ({ ...s, [field]: !s[field] }))}
      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex', alignItems: 'center' }}>
      {showPwd[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(12px) scale(.9);}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);} }
        .logout-btn:hover { background:#FEE2E2!important; border-color:#FCA5A5!important; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards' }}>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>Profil & Pengaturan</h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola informasi akun dan keamanan kamu</p>
        </div>

        {/* Avatar Hero */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 50ms forwards', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #0C4A6E 100%)', borderRadius: '20px', padding: '32px 28px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(8,145,178,.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-70px', left: '20%', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,.03)', pointerEvents: 'none' }} />

          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '86px', height: '86px', borderRadius: '50%', border: '3px solid rgba(255,255,255,.15)', overflow: 'hidden', background: rm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '26px', fontWeight: '700', color: rm.color }}>{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#0891B2', border: '2px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {uploading
                ? <div style={{ width: '11px', height: '11px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                : <Camera size={12} style={{ color: '#fff' }} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#F1F5F9', margin: '0 0 8px' }}>{profile?.name || 'Pengguna'}</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '999px', background: rm.bg, color: rm.color, fontSize: '12px', fontWeight: '700' }}>
                <RoleIcon size={11} />{rm.label}
              </span>
              {profile?.schools?.name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(255,255,255,.1)', color: '#CBD5E1', fontSize: '12px', fontWeight: '600' }}>
                  <School size={11} />{profile.schools.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Grid cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '18px' }}>

          {/* Edit profil */}
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease 100ms forwards' }}>
            <SectionCard title="Informasi Profil" icon={User} iconColor="#0891B2" iconBg="#EFF6FF">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Nama Lengkap" icon={User} error={errors.name}>
                  <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="Nama lengkap" error={errors.name} />
                </Field>
                <Field label="Email" icon={Mail} hint="Email tidak dapat diubah">
                  <TextInput value={profile?.email || ''} disabled />
                </Field>
                <Field label="Nomor Telepon" icon={Phone}>
                  <TextInput value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62 8xx xxxx xxxx" type="tel" />
                </Field>
                <div style={{ paddingTop: '4px' }}>
                  <SaveBtn loading={savingProfile} onClick={handleSaveProfile} />
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Info akun */}
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease 130ms forwards' }}>
            <SectionCard title="Info Akun" icon={Shield} iconColor="#4F46E5" iconBg="#EEF2FF">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {infoRows.map((row, i) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < infoRows.length - 1 ? '1px solid #F8FAFC' : 'none', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', flexShrink: 0 }}>{row.label}</span>
                    {row.badge
                      ? <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: row.value === 'active' ? '#F0FDF4' : '#FFFBEB', color: row.value === 'active' ? '#16A34A' : '#D97706' }}>
                          {row.value === 'active' ? 'Aktif' : row.value === 'trial' ? 'Trial' : row.value}
                        </span>
                      : <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '500', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                    }
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Ganti password */}
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease 160ms forwards' }}>
            <SectionCard title="Keamanan" icon={Lock} iconColor="#D97706" iconBg="#FFFBEB">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Password Saat Ini" error={pwdErrors.currentPwd}>
                  <div style={{ position: 'relative' }}>
                    <TextInput type={showPwd.current ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" error={pwdErrors.currentPwd} propStyle={{ paddingRight: '40px' }} />
                    <PwdEye field="current" />
                  </div>
                </Field>
                <Field label="Password Baru" error={pwdErrors.newPwd}>
                  <div style={{ position: 'relative' }}>
                    <TextInput type={showPwd.new ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" error={pwdErrors.newPwd} />
                    <PwdEye field="new" />
                  </div>
                  {newPwd && (
                    <div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '7px' }}>
                        {[1,2,3,4].map(l => <div key={l} style={{ flex: 1, height: '4px', borderRadius: '2px', background: l <= pwdStrength ? strengthColor : '#F1F5F9', transition: 'background .3s' }} />)}
                      </div>
                      <div style={{ fontSize: '11px', color: strengthColor, fontWeight: '600', marginTop: '4px' }}>{strengthLabel}</div>
                    </div>
                  )}
                </Field>
                <Field label="Konfirmasi Password" error={pwdErrors.confirmPwd}>
                  <div style={{ position: 'relative' }}>
                    <TextInput type={showPwd.confirm ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" error={pwdErrors.confirmPwd} />
                    <PwdEye field="confirm" />
                  </div>
                </Field>
                <div style={{ paddingTop: '4px' }}>
                  <SaveBtn loading={savingPwd} onClick={handleChangePassword}>Ubah Password</SaveBtn>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Sesi & keluar */}
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease 190ms forwards' }}>
            <SectionCard title="Sesi & Akun" icon={RefreshCw} iconColor="#64748B" iconBg="#F8FAFC">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', marginBottom: '2px' }}>Sesi Saat Ini</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Login sejak {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: '#F0FDF4', color: '#16A34A' }}>● Aktif</span>
                </div>

                <button className="logout-btn" onClick={signOut}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s', width: '100%', textAlign: 'left' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LogOut size={16} style={{ color: '#DC2626' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>Keluar dari Akun</div>
                    <div style={{ fontSize: '12px', color: '#F87171' }}>Akhiri sesi login kamu</div>
                  </div>
                </button>
              </div>
            </SectionCard>
          </div>

        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
};

export default ProfilePage;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();

  const [password,        setPassword]        = useState('');
  const [confirm,         setConfirm]         = useState('');
  const [showPass,        setShowPass]         = useState(false);
  const [showConfirm,     setShowConfirm]      = useState(false);
  const [loading,         setLoading]          = useState(false);
  const [error,           setError]            = useState('');
  const [success,         setSuccess]          = useState(false);
  const [sessionReady,    setSessionReady]     = useState(false);
  const [sessionError,    setSessionError]     = useState('');
  const [focusPass,       setFocusPass]        = useState(false);
  const [focusConfirm,    setFocusConfirm]     = useState(false);

  // Supabase mengirim token via URL hash (#access_token=...&type=recovery)
  // onAuthStateChange akan menangkap event PASSWORD_RECOVERY secara otomatis
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Cek juga apakah sudah ada session aktif (misal user reload halaman)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Timeout — kalau 8 detik token tidak terdeteksi, tampilkan error
    const timeout = setTimeout(() => {
      if (!sessionReady) {
        setSessionError('Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.');
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Validasi kekuatan password
  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
    match:   password === confirm && confirm.length > 0,
  };
  const allValid = Object.values(checks).every(Boolean);

  const handleSubmit = async () => {
    if (!allValid) {
      setError('Pastikan semua syarat password terpenuhi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      // Auto redirect ke login setelah 3 detik
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err.message || 'Gagal mengubah password. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────
  const C = {
    brand:      '#4F46E5',
    brandLight: '#EEF2FF',
    brandMid:   'rgba(79,70,229,0.12)',
    text:       '#0D1117',
    textSub:    '#4B5563',
    textMuted:  '#9CA3AF',
    border:     '#E2E8F0',
    surface:    '#FFFFFF',
    bg:         '#F7F8FA',
    green:      '#16A34A',
    greenLight: '#F0FDF4',
    red:        '#DC2626',
    redLight:   '#FEF2F2',
    amber:      '#D97706',
  };

  const inputStyle = (focused, hasError) => ({
    width: '100%',
    padding: '11px 42px 11px 14px',
    borderRadius: '10px',
    border: `1.5px solid ${hasError ? C.red : focused ? C.brand : C.border}`,
    background: focused ? C.surface : '#F8FAFC',
    fontSize: '14px',
    color: C.text,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: focused ? `0 0 0 3px ${C.brandMid}` : 'none',
    transition: 'border-color .15s, box-shadow .15s, background .15s',
  });

  const CheckItem = ({ ok, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: ok ? C.greenLight : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s' }}>
        <CheckCircle2 size={11} style={{ color: ok ? C.green : C.textMuted, transition: 'color .2s' }} />
      </div>
      <span style={{ fontSize: '12px', color: ok ? C.green : C.textMuted, fontFamily: "'DM Sans', sans-serif", transition: 'color .2s' }}>{label}</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin     { to{transform:rotate(360deg);} }
        @keyframes scalein  { from{opacity:0;transform:scale(0.96);}to{opacity:1;transform:scale(1);} }
        @keyframes pulse    { 0%,100%{opacity:1;}50%{opacity:0.4;} }
      `}</style>

      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Background decoration */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.04) 0%, transparent 70%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', animation: 'scalein .3s ease' }}>

          {/* Card */}
          <div style={{ background: C.surface, borderRadius: '20px', border: '1px solid #EAECF0', boxShadow: '0 8px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

            {/* Top accent */}
            <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.brand}, #818CF8)` }} />

            <div style={{ padding: '36px 32px 32px' }}>

              {/* Logo / Brand */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '22px' }}>
                  🔐
                </div>
                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: '20px', fontWeight: '700', color: C.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Buat Password Baru
                </h1>
                <p style={{ fontSize: '13px', color: C.textSub, margin: 0 }}>
                  Password lama kamu akan digantikan sepenuhnya
                </p>
              </div>

              {/* ── Session belum ready ── */}
              {!sessionReady && !sessionError && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Loader2 size={28} style={{ color: C.brand, animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                  <p style={{ fontSize: '13px', color: C.textSub, margin: 0 }}>Memverifikasi link reset...</p>
                </div>
              )}

              {/* ── Session error (link expired) ── */}
              {sessionError && (
                <div style={{ animation: 'fadeUp .3s ease' }}>
                  <div style={{ padding: '16px', background: C.redLight, border: '1px solid #FECACA', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertCircle size={16} style={{ color: C.red, flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: C.red, marginBottom: '3px' }}>Link Tidak Valid</div>
                      <div style={{ fontSize: '12px', color: '#B91C1C' }}>{sessionError}</div>
                    </div>
                  </div>
                  <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: C.brand, color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Kembali ke Login
                  </button>
                </div>
              )}

              {/* ── Success state ── */}
              {success && (
                <div style={{ textAlign: 'center', padding: '8px 0', animation: 'fadeUp .3s ease' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={28} style={{ color: C.green }} />
                  </div>
                  <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '17px', fontWeight: '700', color: C.text, margin: '0 0 8px' }}>Password Berhasil Diubah!</h2>
                  <p style={{ fontSize: '13px', color: C.textSub, margin: '0 0 20px' }}>Kamu akan diarahkan ke halaman login dalam 3 detik...</p>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green, animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Form ── */}
              {sessionReady && !success && !sessionError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeUp .3s ease' }}>

                  {/* Password baru */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '7px' }}>
                      Password Baru
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: focusPass ? C.brand : C.textMuted, transition: 'color .15s', pointerEvents: 'none' }} />
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        onFocus={() => setFocusPass(true)}
                        onBlur={() => setFocusPass(false)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        style={{ ...inputStyle(focusPass, false), paddingLeft: '40px' }}
                      />
                      <button onClick={() => setShowPass(v => !v)} tabIndex={-1}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '2px', display: 'flex', alignItems: 'center' }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: C.text, marginBottom: '7px' }}>
                      Konfirmasi Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: focusConfirm ? C.brand : C.textMuted, transition: 'color .15s', pointerEvents: 'none' }} />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Ulangi password baru"
                        value={confirm}
                        onChange={e => { setConfirm(e.target.value); setError(''); }}
                        onFocus={() => setFocusConfirm(true)}
                        onBlur={() => setFocusConfirm(false)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        style={{ ...inputStyle(focusConfirm, confirm.length > 0 && !checks.match), paddingLeft: '40px' }}
                      />
                      <button onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '2px', display: 'flex', alignItems: 'center' }}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Password checklist */}
                  {password.length > 0 && (
                    <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #EAECF0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <CheckItem ok={checks.length} label="Minimal 8 karakter" />
                      <CheckItem ok={checks.upper}  label="Mengandung huruf kapital" />
                      <CheckItem ok={checks.number} label="Mengandung angka" />
                      <CheckItem ok={checks.match}  label="Password cocok" />
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div style={{ padding: '11px 13px', background: C.redLight, border: '1px solid #FECACA', borderRadius: '9px', color: C.red, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={14} />{error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !allValid}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: allValid ? C.brand : '#C7D2FE', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: allValid && !loading ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background .2s, opacity .2s', opacity: loading ? 0.75 : 1 }}>
                    {loading
                      ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Menyimpan...</>
                      : '🔒 Simpan Password Baru'
                    }
                  </button>

                  <p style={{ textAlign: 'center', fontSize: '12px', color: C.textMuted, margin: 0 }}>
                    Ingat password lama?{' '}
                    <span onClick={() => navigate('/login')} style={{ color: C.brand, fontWeight: '600', cursor: 'pointer' }}>
                      Kembali ke Login
                    </span>
                  </p>

                </div>
              )}

            </div>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '11px', color: C.textMuted, marginTop: '16px' }}>
            ZiDu · Sistem Manajemen Ujian Sekolah
          </p>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
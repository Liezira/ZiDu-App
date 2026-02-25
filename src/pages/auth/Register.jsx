import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight,
  User, Building2, Phone, MapPin, CheckCircle2, Sun, Moon, ArrowLeft,
} from 'lucide-react';

/* ── Theme hook ─────────────────────────────────────────────────── */
const useTheme = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zidu-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  useEffect(() => {
    localStorage.setItem('zidu-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark(d => !d)];
};

const getStrength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

/* ── Register ───────────────────────────────────────────────────── */
const Register = () => {
  const [dark, toggleTheme] = useTheme();
  const [step, setStep]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    schoolName: '', schoolPhone: '', schoolCity: '',
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setErrorMsg('');
  };

  const T = {
    panelBg:  dark ? '#09090f' : '#0d1117',
    accent:   '#7aa2f7',
    bg:       dark ? '#0f1117' : '#f8fafc',
    card:     dark ? '#16181f' : '#ffffff',
    border:   dark ? '#252832' : '#e5e7eb',
    text:     dark ? '#e2e8f0' : '#111827',
    muted:    dark ? '#5a6278' : '#6b7280',
    inputBg:  dark ? '#12141c' : '#f9fafb',
    brand:    '#3b74d4',
    focus:    'rgba(59,116,212,0.14)',
  };

  const inputStyle = (name) => ({
    width: '100%',
    padding: '11px 14px 11px 42px',
    fontSize: '14px', borderRadius: '10px',
    border: `1px solid ${focused === name ? T.brand : T.border}`,
    background: T.inputBg, color: T.text, outline: 'none',
    boxShadow: focused === name ? `0 0 0 3px ${T.focus}` : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
  });

  const iconStyle = (name) => ({
    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
    pointerEvents: 'none', color: focused === name ? T.brand : T.muted,
    transition: 'color 0.15s',
  });

  const validateStep0 = () => {
    if (!form.fullName.trim()) return 'Nama lengkap wajib diisi.';
    if (!form.email.includes('@')) return 'Format email tidak valid.';
    if (getStrength(form.password) < 2) return 'Password terlalu lemah. Gunakan minimal 8 karakter.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep0();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg('');
    setStep(1);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.schoolName.trim()) { setErrorMsg('Nama sekolah wajib diisi.'); return; }
    setLoading(true); setErrorMsg('');
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: {
          full_name: form.fullName, school_name: form.schoolName,
          school_phone: form.schoolPhone, school_city: form.schoolCity,
          role: 'school_admin',
        }},
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.message === 'User already registered' ? 'Email ini sudah terdaftar.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.password);
  const strengthColor = ['#ef4444', '#f97316', '#3b82f6', '#10b981'][strength - 1] || T.border;

  const steps = ['Akun', 'Sekolah'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(-14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounceIn {
          0%  { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.06); }
          100%{ transform: scale(1); opacity: 1; }
        }

        .zr-enter  { animation: fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .zr-enter2 { animation: fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .zr-enter3 { animation: fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.16s both; }
        .zr-slide-r { animation: slideRight 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .zr-slide-l { animation: slideLeft  0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .zr-bounce  { animation: bounceIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both; }

        .zr-btn {
          background: #1d4ed8; border: none; cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .zr-btn:hover:not(:disabled) {
          background: #1a46c8; transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(29,78,216,0.32);
        }
        .zr-btn:active:not(:disabled) { transform: translateY(0); }
        .zr-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .zr-btn-ghost {
          background: none; cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .zr-btn-ghost:hover { opacity: 0.75; }

        .zr-toggle { border: none; cursor: pointer; transition: opacity 0.2s; }
        .zr-toggle:hover { opacity: 0.7; }
        .zr-showpass { background: none; border: none; cursor: pointer; display: flex; align-items: center; }
        .zr-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        .zr-link { color: #3b74d4; text-decoration: none; font-weight: 500; transition: color 0.15s; }
        .zr-link:hover { color: #2563eb; text-decoration: underline; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── LEFT PANEL ── */}
        {!isMobile && (
          <div style={{
            width: '42%', flexShrink: 0,
            background: T.panelBg, color: '#fff',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: '52px 54px', position: 'relative', overflow: 'hidden',
          }}>
            {/* Glows */}
            <div style={{
              position: 'absolute', top: '-60px', right: '-60px',
              width: '400px', height: '400px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,116,212,0.09) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: '-60px', left: '-40px',
              width: '340px', height: '340px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(122,162,247,0.06) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            {/* Logo */}
            <div className="zr-enter" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
                  fontSize: '17px', color: '#fff',
                }}>Z</div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', fontWeight: '500' }}>ZiDu</span>
              </div>
              <p style={{ marginTop: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                Platform Ujian · RuangSimulasi
              </p>
            </div>

            {/* Hero */}
            <div className="zr-enter2" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '4px 12px', borderRadius: '999px', marginBottom: '28px',
                border: '1px solid rgba(122,162,247,0.22)',
                background: 'rgba(122,162,247,0.07)',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: T.accent, display: 'block' }} />
                <span style={{ fontSize: '11.5px', color: T.accent, letterSpacing: '0.04em', fontWeight: '500' }}>
                  Gratis 30 hari pertama
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(30px, 3vw, 44px)',
                fontWeight: '400', lineHeight: 1.2,
                color: '#ffffff', marginBottom: '18px',
                letterSpacing: '-0.02em',
              }}>
                Daftarkan sekolahmu,<br />
                <span style={{ fontStyle: 'italic', color: T.accent }}>mulai hari ini.</span>
              </h1>

              <p style={{
                fontSize: '14px', lineHeight: 1.8,
                color: 'rgba(255,255,255,0.40)', maxWidth: '290px', fontWeight: '300',
              }}>
                Bergabung dengan ratusan sekolah yang sudah memoderasi ujian mereka bersama ZiDu.
              </p>

              {/* Progress steps */}
              <div style={{ marginTop: '44px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Proses pendaftaran
                </p>
                {steps.map((label, i) => {
                  const done    = i < step;
                  const current = i === step;
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < steps.length - 1 ? '14px' : 0 }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? T.accent : current ? 'rgba(122,162,247,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${done || current ? T.accent : 'rgba(255,255,255,0.1)'}`,
                        fontSize: '11px', fontWeight: '600',
                        color: done ? '#0d1117' : current ? T.accent : 'rgba(255,255,255,0.25)',
                        transition: 'all 0.3s ease',
                      }}>
                        {done ? <CheckCircle2 size={13} /> : i + 1}
                      </div>
                      <span style={{
                        fontSize: '13px', fontWeight: done || current ? '500' : '300',
                        color: done || current ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)',
                        transition: 'all 0.3s ease',
                      }}>
                        {label === 'Akun' ? 'Buat akun admin' : 'Lengkapi data sekolah'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom note */}
            <div className="zr-enter3" style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
                Sudah punya akun?{' '}
                <Link to="/login" className="zr-link" style={{ color: T.accent, opacity: 0.7 }}>Masuk di sini</Link>
              </p>
            </div>
          </div>
        )}

        {/* ── RIGHT PANEL ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '36px 20px' : '48px',
          background: T.bg, position: 'relative',
        }}>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="zr-toggle" style={{
            position: 'absolute', top: '22px', right: '22px',
            width: '33px', height: '33px', borderRadius: '8px',
            background: dark ? '#1a1d26' : '#f1f5f9',
            color: dark ? '#64748b' : '#9ca3af',
            border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <div style={{ width: '100%', maxWidth: '400px' }}>

            {/* Mobile logo */}
            {isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '7px', background: '#1d4ed8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: '#fff', fontSize: '14px',
                }}>Z</div>
                <span style={{ fontWeight: '500', fontSize: '15px', color: T.text }}>ZiDu</span>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {success ? (
              <div className="zr-enter" style={{ textAlign: 'center' }}>
                <div className="zr-bounce" style={{
                  width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
                  background: dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4',
                  border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={28} color="#10b981" />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: T.text, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                  Pendaftaran berhasil!
                </h2>
                <p style={{ fontSize: '13.5px', color: T.muted, lineHeight: 1.65, marginBottom: '24px' }}>
                  Email verifikasi dikirim ke <strong style={{ color: T.text, fontWeight: '500' }}>{form.email}</strong>.
                  Cek inbox untuk mengaktifkan akun kamu.
                </p>
                <Link to="/login" className="zr-btn" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '11px 24px', borderRadius: '10px', color: '#fff',
                  fontSize: '14px', fontWeight: '500', textDecoration: 'none',
                }}>
                  Ke halaman masuk <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <>
                {/* Step header */}
                <div style={{ marginBottom: '28px' }}>
                  {/* Progress bar */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '22px' }}>
                    {steps.map((_, i) => (
                      <div key={i} style={{
                        height: '3px', borderRadius: '999px',
                        flex: i === step ? 2 : 1,
                        background: i <= step ? T.brand : T.border,
                        transition: 'all 0.4s ease',
                      }} />
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    {step === 1 && (
                      <button type="button" onClick={() => setStep(0)} className="zr-btn-ghost"
                        style={{ color: T.muted, padding: '2px', border: 'none', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={16} />
                      </button>
                    )}
                    <h2 style={{ fontSize: '22px', fontWeight: '600', color: T.text, letterSpacing: '-0.02em' }}>
                      {step === 0 ? 'Buat akun' : 'Data sekolah'}
                    </h2>
                  </div>
                  <p style={{ fontSize: '13.5px', color: T.muted }}>
                    {step === 0
                      ? 'Langkah 1 dari 2 — informasi akun'
                      : 'Langkah 2 dari 2 — hampir selesai!'}
                  </p>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div style={{
                    marginBottom: '16px', padding: '11px 13px', borderRadius: '8px',
                    background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
                    border: '1px solid rgba(239,68,68,0.18)', color: '#dc2626',
                    display: 'flex', alignItems: 'flex-start', gap: '9px',
                    fontSize: '13px', lineHeight: 1.5,
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* ── STEP 0: ACCOUNT ── */}
                {step === 0 && (
                  <div className="zr-slide-r" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8, marginBottom: '7px' }}>Nama Lengkap</label>
                      <div style={{ position: 'relative' }}>
                        <User size={14} style={iconStyle('fullName')} />
                        <input type="text" placeholder="Nama lengkap kamu" required value={form.fullName} onChange={set('fullName')}
                          onFocus={() => setFocused('fullName')} onBlur={() => setFocused('')} style={inputStyle('fullName')} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8, marginBottom: '7px' }}>Email</label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={14} style={iconStyle('email')} />
                        <input type="email" placeholder="email@sekolah.sch.id" required value={form.email} onChange={set('email')}
                          onFocus={() => setFocused('email')} onBlur={() => setFocused('')} style={inputStyle('email')} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8, marginBottom: '7px' }}>Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={14} style={iconStyle('password')} />
                        <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 karakter" required value={form.password} onChange={set('password')}
                          onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                          style={{ ...inputStyle('password'), paddingRight: '42px' }} />
                        <button type="button" onClick={() => setShowPass(s => !s)} className="zr-showpass"
                          style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', color: T.muted }}>
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {form.password && (
                        <div style={{ marginTop: '8px' }}>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                            {[0,1,2,3].map(i => (
                              <div key={i} style={{
                                flex: 1, height: '3px', borderRadius: '999px',
                                background: i < strength ? strengthColor : T.border,
                                transition: 'background 0.3s',
                              }} />
                            ))}
                          </div>
                          <p style={{ fontSize: '11px', color: strengthColor }}>
                            {['Sangat lemah','Lemah','Cukup kuat','Kuat'][strength - 1] || ''}
                          </p>
                        </div>
                      )}
                    </div>

                    <button type="button" onClick={handleNext} className="zr-btn" style={{
                      width: '100%', padding: '11.5px', borderRadius: '10px', color: '#fff',
                      fontSize: '14px', fontWeight: '500', letterSpacing: '0.01em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px',
                    }}>
                      Lanjut ke data sekolah <ArrowRight size={14} />
                    </button>
                  </div>
                )}

                {/* ── STEP 1: SCHOOL ── */}
                {step === 1 && (
                  <form onSubmit={handleRegister} className="zr-slide-l" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8, marginBottom: '7px' }}>Nama Sekolah</label>
                      <div style={{ position: 'relative' }}>
                        <Building2 size={14} style={iconStyle('schoolName')} />
                        <input type="text" placeholder="SMA Negeri 1 Contoh" required value={form.schoolName} onChange={set('schoolName')}
                          onFocus={() => setFocused('schoolName')} onBlur={() => setFocused('')} style={inputStyle('schoolName')} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8, marginBottom: '7px' }}>
                        No. Telepon <span style={{ color: T.muted, fontWeight: '400' }}>(opsional)</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={14} style={iconStyle('schoolPhone')} />
                        <input type="tel" placeholder="021-xxxxxxx" value={form.schoolPhone} onChange={set('schoolPhone')}
                          onFocus={() => setFocused('schoolPhone')} onBlur={() => setFocused('')} style={inputStyle('schoolPhone')} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8, marginBottom: '7px' }}>
                        Kota / Kabupaten <span style={{ color: T.muted, fontWeight: '400' }}>(opsional)</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={14} style={iconStyle('schoolCity')} />
                        <input type="text" placeholder="Jakarta Selatan" value={form.schoolCity} onChange={set('schoolCity')}
                          onFocus={() => setFocused('schoolCity')} onBlur={() => setFocused('')} style={inputStyle('schoolCity')} />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="zr-btn" style={{
                      width: '100%', padding: '11.5px', borderRadius: '10px', color: '#fff',
                      fontSize: '14px', fontWeight: '500', letterSpacing: '0.01em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px',
                    }}>
                      {loading
                        ? <><div className="zr-spinner" />Mendaftar...</>
                        : <>Daftar sekarang <ArrowRight size={14} /></>
                      }
                    </button>
                  </form>
                )}

                <p style={{ textAlign: 'center', fontSize: '13px', color: T.muted, marginTop: '22px' }}>
                  Sudah punya akun?{' '}
                  <Link to="/login" className="zr-link">Masuk di sini</Link>
                </p>
              </>
            )}
          </div>

          <p style={{ marginTop: '40px', fontSize: '11.5px', color: dark ? '#252836' : '#d1d5db', letterSpacing: '0.01em' }}>
            © 2025 ZiDu · RuangSimulasi
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;
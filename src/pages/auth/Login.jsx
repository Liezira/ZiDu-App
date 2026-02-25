import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Sun, Moon } from 'lucide-react';

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

/* ── Login ──────────────────────────────────────────────────────── */
const Login = () => {
  const [dark, toggleTheme] = useTheme();
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState('');
  const [form, setForm]         = useState({ email: '', password: '' });
  const [isMobile, setIsMobile] = useState(false);
  const [tIdx, setTIdx]         = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const testimonials = [
    { quote: 'Pengelolaan ujian jadi jauh lebih efisien. Tim kami menghemat berjam-jam setiap minggunya.', name: 'Sari Rahayu', role: 'Koordinator Akademik · SMAN 3 Jakarta' },
    { quote: 'Bank soal yang terstruktur membantu guru fokus mengajar, bukan mengurus administrasi.', name: 'Budi Santoso', role: 'Kepala Sekolah · SMP Islam Al-Azhar' },
  ];

  useEffect(() => {
    const t = setInterval(() => setTIdx(i => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(
        err.message === 'Invalid login credentials'
          ? 'Email atau password salah. Silakan coba lagi.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const T = {
    panelBg:    dark ? '#09090f' : '#0d1117',
    panelLine:  'rgba(255,255,255,0.07)',
    accent:     '#7aa2f7',
    accentDim:  'rgba(122,162,247,0.10)',
    bg:         dark ? '#0f1117' : '#f8fafc',
    card:       dark ? '#16181f' : '#ffffff',
    border:     dark ? '#252832' : '#e5e7eb',
    text:       dark ? '#e2e8f0' : '#111827',
    muted:      dark ? '#5a6278' : '#6b7280',
    inputBg:    dark ? '#12141c' : '#f9fafb',
    brand:      '#3b74d4',
    focus:      'rgba(59,116,212,0.14)',
  };

  const inputStyle = (name) => ({
    width: '100%',
    padding: '11px 14px 11px 42px',
    fontSize: '14px',
    borderRadius: '10px',
    border: `1px solid ${focused === name ? T.brand : T.border}`,
    background: T.inputBg,
    color: T.text,
    outline: 'none',
    boxShadow: focused === name ? `0 0 0 3px ${T.focus}` : 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', sans-serif",
  });

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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes testi {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .zl-enter  { animation: fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) both; }
        .zl-enter2 { animation: fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .zl-enter3 { animation: fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) 0.16s both; }
        .zl-testi  { animation: testi 0.45s ease both; }

        .zl-btn {
          background: #1d4ed8; border: none; cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .zl-btn:hover:not(:disabled) {
          background: #1a46c8;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(29,78,216,0.32);
        }
        .zl-btn:active:not(:disabled) { transform: translateY(0); }
        .zl-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .zl-toggle { border: none; cursor: pointer; transition: opacity 0.2s; }
        .zl-toggle:hover { opacity: 0.7; }
        .zl-showpass { background: none; border: none; cursor: pointer; display: flex; align-items: center; }
        .zl-spinner {
          width: 14px; height: 14px; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        .zl-link { color: #3b74d4; text-decoration: none; font-weight: 500; transition: color 0.15s; }
        .zl-link:hover { color: #2563eb; text-decoration: underline; }
        .zl-dot-btn { border: none; cursor: pointer; padding: 0; transition: all 0.3s ease; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── LEFT PANEL ── */}
        {!isMobile && (
          <div style={{
            width: '45%', flexShrink: 0,
            background: T.panelBg,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: '52px 54px', position: 'relative', overflow: 'hidden',
          }}>
            {/* Glow top-right */}
            <div style={{
              position: 'absolute', top: '-60px', right: '-60px',
              width: '420px', height: '420px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,116,212,0.10) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />
            {/* Glow bottom-left */}
            <div style={{
              position: 'absolute', bottom: '-80px', left: '-40px',
              width: '340px', height: '340px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(122,162,247,0.06) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            {/* Logo */}
            <div className="zl-enter" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
                  fontSize: '17px', color: '#fff',
                }}>Z</div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', fontWeight: '500', letterSpacing: '0.01em' }}>
                  ZiDu
                </span>
              </div>
              <p style={{ marginTop: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em' }}>
                Platform Ujian · RuangSimulasi
              </p>
            </div>

            {/* Hero */}
            <div className="zl-enter2" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '4px 12px', borderRadius: '999px', marginBottom: '28px',
                border: '1px solid rgba(122,162,247,0.22)',
                background: 'rgba(122,162,247,0.07)',
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: T.accent, display: 'block', flexShrink: 0 }} />
                <span style={{ fontSize: '11.5px', color: T.accent, letterSpacing: '0.04em', fontWeight: '500' }}>
                  Dipercaya 500+ sekolah
                </span>
              </div>

              <h1 style={{
                fontFamily: "'Instrument Serif', serif",
                fontSize: 'clamp(32px, 3.2vw, 46px)',
                fontWeight: '400', lineHeight: 1.2,
                color: '#ffffff', marginBottom: '18px',
                letterSpacing: '-0.02em',
              }}>
                Ujian digital<br />
                yang <span style={{ fontStyle: 'italic', color: T.accent }}>terasa mudah.</span>
              </h1>

              <p style={{
                fontSize: '14px', lineHeight: 1.8,
                color: 'rgba(255,255,255,0.42)',
                maxWidth: '310px', fontWeight: '300',
              }}>
                Kelola soal, jadwalkan ujian, dan analisis hasil siswa — semuanya terpusat dalam satu platform.
              </p>

              {/* Stats */}
              <div style={{
                display: 'flex',
                marginTop: '44px', paddingTop: '32px',
                borderTop: `1px solid ${T.panelLine}`,
                gap: '0',
              }}>
                {[
                  { val: '50K+',  label: 'Soal tersedia' },
                  { val: '120K+', label: 'Ujian selesai' },
                  { val: '99.9%', label: 'Uptime' },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1,
                    paddingRight: i < 2 ? '28px' : 0,
                    marginRight: i < 2 ? '28px' : 0,
                    borderRight: i < 2 ? `1px solid ${T.panelLine}` : 'none',
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em' }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', letterSpacing: '0.01em' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div className="zl-enter3" style={{ position: 'relative', zIndex: 1 }}>
              <div key={tIdx} className="zl-testi" style={{
                borderLeft: `2px solid rgba(122,162,247,0.35)`,
                paddingLeft: '16px',
              }}>
                <p style={{
                  fontSize: '13px', lineHeight: 1.75, fontStyle: 'italic', fontWeight: '300',
                  color: 'rgba(255,255,255,0.50)', marginBottom: '10px',
                }}>
                  "{testimonials[tIdx].quote}"
                </p>
                <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.35)', fontWeight: '400' }}>
                  {testimonials[tIdx].name} &nbsp;·&nbsp; <span style={{ fontWeight: '300' }}>{testimonials[tIdx].role}</span>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '5px', marginTop: '14px' }}>
                {testimonials.map((_, i) => (
                  <button key={i} className="zl-dot-btn" onClick={() => setTIdx(i)}
                    style={{
                      width: i === tIdx ? '18px' : '5px', height: '5px',
                      borderRadius: '999px', background: i === tIdx ? T.accent : 'rgba(255,255,255,0.18)',
                    }}
                  />
                ))}
              </div>
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
          <button onClick={toggleTheme} className="zl-toggle" style={{
            position: 'absolute', top: '22px', right: '22px',
            width: '33px', height: '33px', borderRadius: '8px',
            background: dark ? '#1a1d26' : '#f1f5f9',
            color: dark ? '#64748b' : '#9ca3af',
            border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <div className="zl-enter2" style={{ width: '100%', maxWidth: '390px' }}>

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

            {/* Heading */}
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{
                fontSize: '22px', fontWeight: '600', color: T.text,
                marginBottom: '5px', letterSpacing: '-0.02em',
              }}>
                Selamat datang kembali
              </h2>
              <p style={{ fontSize: '13.5px', color: T.muted, lineHeight: 1.5 }}>
                Masuk ke akun ZiDu untuk melanjutkan
              </p>
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{
                marginBottom: '18px', padding: '11px 13px',
                borderRadius: '8px', background: dark ? 'rgba(239,68,68,0.08)' : '#fef2f2',
                border: '1px solid rgba(239,68,68,0.18)', color: '#dc2626',
                display: 'flex', alignItems: 'flex-start', gap: '9px',
                fontSize: '13px', lineHeight: 1.5,
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8, marginBottom: '7px' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: focused === 'email' ? T.brand : T.muted, transition: 'color 0.15s',
                  }} />
                  <input
                    type="email" placeholder="nama@sekolah.sch.id" required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused('')}
                    style={inputStyle('email')}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '500', color: T.text, opacity: 0.8 }}>Password</label>
                  <a href="#" className="zl-link" style={{ fontSize: '12px', opacity: 0.85 }}>Lupa password?</a>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{
                    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: focused === 'password' ? T.brand : T.muted, transition: 'color 0.15s',
                  }} />
                  <input
                    type={showPass ? 'text' : 'password'} placeholder="••••••••" required
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                    style={{ ...inputStyle('password'), paddingRight: '42px' }}
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="zl-showpass"
                    style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', color: T.muted }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="zl-btn" style={{
                width: '100%', padding: '11.5px', borderRadius: '10px', color: '#fff',
                fontSize: '14px', fontWeight: '500', letterSpacing: '0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '4px',
              }}>
                {loading
                  ? <><div className="zl-spinner" />Memverifikasi...</>
                  : <>Masuk <ArrowRight size={14} /></>
                }
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '22px 0' }}>
              <div style={{ flex: 1, height: '1px', background: T.border }} />
              <span style={{ fontSize: '12px', color: T.muted }}>atau</span>
              <div style={{ flex: 1, height: '1px', background: T.border }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: '13px', color: T.muted }}>
              Sekolah belum terdaftar?{' '}
              <Link to="/register" className="zl-link">Daftar gratis</Link>
            </p>
          </div>

          <p style={{ marginTop: '40px', fontSize: '11.5px', color: dark ? '#252836' : '#d1d5db', letterSpacing: '0.01em' }}>
            © 2025 ZiDu · RuangSimulasi
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Building2,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  MapPin,
} from 'lucide-react';

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
  return [dark, () => setDark((d) => !d)];
};

const getStrength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

const Register = () => {
  const [dark, toggleTheme] = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    schoolName: '',
    schoolPhone: '',
    schoolCity: '',
  });

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrorMsg('');
  };

  const C = {
    bg: dark ? '#0f1117' : '#f8fafc',
    card: dark ? '#161823' : '#ffffff',
    border: dark ? '#2a2d3e' : '#e2e8f0',
    text: dark ? '#e2e8f0' : '#0f172a',
    muted: dark ? '#64748b' : '#94a3b8',
    inputBg: dark ? '#1e2130' : '#f8fafc',
    brand: '#5B6CF6',
    brandGlow: 'rgba(91,108,246,0.18)',
    panelBg: dark ? '#13152a' : '#4338CA',
  };

  const inputStyle = (name) => ({
    width: '100%',
    padding: '10px 12px 10px 40px',
    fontSize: '14px',
    borderRadius: '12px',
    border: `1.5px solid ${focused === name ? C.brand : C.border}`,
    background: C.inputBg,
    color: C.text,
    outline: 'none',
    boxShadow: focused === name ? `0 0 0 3px ${C.brandGlow}` : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', sans-serif",
  });

  const validateStep0 = () => {
    if (!form.fullName.trim()) return 'Nama lengkap wajib diisi.';
    if (!form.email.includes('@')) return 'Format email tidak valid.';
    if (getStrength(form.password) < 2)
      return 'Password terlalu lemah. Gunakan min. 8 karakter.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep0();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg('');
    setStep(1);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.schoolName.trim()) {
      setErrorMsg('Nama sekolah wajib diisi.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            school_name: form.schoolName,
            school_phone: form.schoolPhone,
            school_city: form.schoolCity,
            role: 'school_admin',
          },
        },
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      setErrorMsg(
        error.message === 'User already registered'
          ? 'Email ini sudah terdaftar.'
          : error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.password);
  const strengthColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  const strengthLabels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat'];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'DM Sans',sans-serif; }

        @keyframes scaleIn { from{opacity:0;transform:scale(0.96) translateY(10px);} to{opacity:1;transform:scale(1) translateY(0);} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px);} to{opacity:1;transform:translateY(0);} }
        @keyframes slideR  { from{opacity:0;transform:translateX(20px);} to{opacity:1;transform:translateX(0);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes bounceIn {
          0%{transform:scale(0.3);opacity:0;}
          50%{transform:scale(1.1);}
          70%{transform:scale(0.9);}
          100%{transform:scale(1);opacity:1;}
        }

        .zidu-card     { animation: scaleIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .zidu-fadeup   { opacity:0; animation: fadeUp 0.5s ease forwards; }
        .zidu-slide    { animation: slideR 0.35s ease both; }
        .zidu-bounce   { animation: bounceIn 0.6s cubic-bezier(0.68,-0.55,0.27,1.55) both; }

        .zidu-btn {
          background: linear-gradient(90deg,#4338CA,#5B6CF6,#818CF8,#5B6CF6);
          background-size:200% auto; border:none; cursor:pointer;
          transition: background-position 0.5s,transform 0.15s,box-shadow 0.2s;
        }
        .zidu-btn:hover:not(:disabled) { background-position:right center; transform:translateY(-1px); box-shadow:0 8px 24px rgba(91,108,246,0.35); }
        .zidu-btn:disabled { opacity:0.6; cursor:not-allowed; }

        .zidu-back {
          background:none; cursor:pointer; transition:transform 0.15s,background 0.2s;
          display:flex; align-items:center; gap:6px;
        }
        .zidu-back:hover { transform:translateX(-2px); }

        .zidu-toggle { cursor:pointer; border:none; transition:transform 0.3s; }
        .zidu-toggle:hover { transform:rotate(20deg); }

        .zidu-spinner {
          width:16px; height:16px;
          border:2px solid rgba(255,255,255,0.3);
          border-top-color:white; border-radius:50%;
          animation:spin 0.7s linear infinite;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: C.bg,
          color: C.text,
        }}
      >
        {/* ══ LEFT PANEL ══ */}
        {!isMobile && (
          <div
            style={{
              width: '40%',
              flexShrink: 0,
              color: '#fff',
              background: `linear-gradient(145deg, ${C.panelBg} 0%, ${
                dark ? '#1a1f45' : '#5B6CF6'
              } 50%, ${dark ? '#0f1020' : '#6D28D9'} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '48px 40px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '240px',
                height: '240px',
                borderRadius: '50%',
                background: 'rgba(129,140,248,0.2)',
                filter: 'blur(70px)',
                top: '-50px',
                right: '-50px',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'rgba(251,191,36,0.12)',
                filter: 'blur(60px)',
                bottom: '80px',
                left: '-30px',
                pointerEvents: 'none',
              }}
            />

            {/* Logo */}
            <div
              className="zidu-fadeup"
              style={{
                animationDelay: '100ms',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Sora',
                    fontWeight: '700',
                    fontSize: '18px',
                  }}
                >
                  Z
                </div>
                <span
                  style={{
                    fontFamily: 'Sora',
                    fontWeight: '600',
                    fontSize: '17px',
                  }}
                >
                  ZiDu
                </span>
              </div>
              <p
                style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  opacity: 0.55,
                  fontWeight: 300,
                }}
              >
                Platform Ujian by RuangSimulasi
              </p>
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  background: 'rgba(251,191,36,0.18)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  color: '#FCD34D',
                  fontSize: '12px',
                  fontWeight: '500',
                  marginBottom: '20px',
                }}
              >
                <Sparkles size={12} /> Gratis 30 hari pertama
              </div>

              <h1
                className="zidu-fadeup"
                style={{
                  fontFamily: 'Sora',
                  fontSize: '32px',
                  fontWeight: '700',
                  lineHeight: 1.3,
                  animationDelay: '200ms',
                }}
              >
                Daftarkan
                <br />
                <span
                  style={{
                    background: 'linear-gradient(90deg,#FCD34D,#F59E0B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  sekolahmu
                </span>
                <br />
                sekarang
              </h1>
              <p
                className="zidu-fadeup"
                style={{
                  marginTop: '14px',
                  fontSize: '13px',
                  opacity: 0.65,
                  lineHeight: 1.7,
                  maxWidth: '260px',
                  fontWeight: 300,
                  animationDelay: '300ms',
                }}
              >
                Bergabung bersama sekolah-sekolah yang telah menggunakan ZiDu
                untuk ujian yang lebih modern.
              </p>

              {/* Steps */}
              <div
                style={{
                  marginTop: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {[
                  { n: '1', t: 'Buat akun admin sekolah', done: step >= 0 },
                  { n: '2', t: 'Lengkapi data sekolah', done: step >= 1 },
                  { n: '3', t: 'Langsung bisa digunakan!', done: false },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="zidu-fadeup"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      animationDelay: `${400 + i * 100}ms`,
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        background:
                          i <= step ? '#5B6CF6' : 'rgba(255,255,255,0.12)',
                        transition: 'background 0.3s',
                      }}
                    >
                      {i < step ? <CheckCircle2 size={14} /> : s.n}
                    </div>
                    <span
                      style={{ fontSize: '13px', opacity: i <= step ? 1 : 0.6 }}
                    >
                      {s.t}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                fontSize: '12px',
                opacity: 0.4,
              }}
            >
              Sudah punya akun?{' '}
              <Link to="/login" style={{ color: '#fff', fontWeight: '600' }}>
                Masuk di sini
              </Link>
            </div>
          </div>
        )}

        {/* ══ RIGHT FORM PANEL ══ */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '32px 20px' : '48px',
            position: 'relative',
            background: C.bg,
          }}
        >
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="zidu-toggle"
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: dark ? '#1e2130' : '#f1f5f9',
              color: dark ? '#a5b4fc' : '#4F46E5',
              border: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              marginBottom: '20px',
              display: 'flex',
              gap: '6px',
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  height: '4px',
                  borderRadius: '99px',
                  flex: i === step ? 2 : 1,
                  background: i <= step ? C.brand : C.border,
                  transition: 'all 0.4s ease',
                }}
              />
            ))}
          </div>

          {/* SUCCESS */}
          {success ? (
            <div
              className="zidu-card"
              style={{
                width: '100%',
                maxWidth: '420px',
                background: C.card,
                borderRadius: '20px',
                border: `1px solid ${C.border}`,
                boxShadow: dark
                  ? '0 20px 60px rgba(0,0,0,0.5)'
                  : '0 20px 60px rgba(0,0,0,0.08)',
                padding: '48px 36px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                className="zidu-bounce"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  border: '2px solid #10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={38} color="#10b981" />
              </div>
              <h2
                style={{
                  fontFamily: 'Sora',
                  fontSize: '22px',
                  fontWeight: '700',
                  color: C.text,
                }}
              >
                Pendaftaran Berhasil!
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: C.muted,
                  lineHeight: 1.7,
                  maxWidth: '300px',
                }}
              >
                Email verifikasi dikirim ke{' '}
                <strong style={{ color: C.text }}>{form.email}</strong>. Cek
                inbox untuk mengaktifkan akun.
              </p>
              <Link
                to="/login"
                className="zidu-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 28px',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: 'Sora',
                  textDecoration: 'none',
                  marginTop: '8px',
                }}
              >
                Ke Halaman Login →
              </Link>
            </div>
          ) : (
            <div
              className="zidu-card"
              style={{
                width: '100%',
                maxWidth: '420px',
                background: C.card,
                borderRadius: '20px',
                border: `1px solid ${C.border}`,
                boxShadow: dark
                  ? '0 20px 60px rgba(0,0,0,0.5)'
                  : '0 20px 60px rgba(0,0,0,0.08)',
                padding: '36px 32px',
              }}
            >
              {/* Mobile Logo */}
              {isMobile && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: C.brand,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Sora',
                      fontWeight: '700',
                      color: '#fff',
                      fontSize: '15px',
                    }}
                  >
                    Z
                  </div>
                  <span style={{ fontFamily: 'Sora', fontWeight: '600' }}>
                    ZiDu
                  </span>
                </div>
              )}

              {/* Header */}
              <div style={{ marginBottom: '24px' }}>
                <h2
                  style={{
                    fontFamily: 'Sora',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: C.text,
                  }}
                >
                  {step === 0 ? '🙋 Buat akun kamu' : '🏫 Data sekolah'}
                </h2>
                <p
                  style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}
                >
                  {step === 0
                    ? 'Langkah 1 dari 2 — informasi akun'
                    : 'Langkah 2 dari 2 — hampir selesai!'}
                </p>
              </div>

              {/* Error */}
              {errorMsg && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: dark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* STEP 0 */}
              {step === 0 && (
                <div
                  className="zidu-slide"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* Full Name */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '7px',
                        color: dark ? '#cbd5e1' : '#374151',
                      }}
                    >
                      Nama Lengkap
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: focused === 'fullName' ? C.brand : C.muted,
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Nama lengkap kamu"
                        required
                        value={form.fullName}
                        onChange={set('fullName')}
                        onFocus={() => setFocused('fullName')}
                        onBlur={() => setFocused('')}
                        style={inputStyle('fullName')}
                      />
                    </div>
                  </div>
                  {/* Email */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '7px',
                        color: dark ? '#cbd5e1' : '#374151',
                      }}
                    >
                      Alamat Email
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: focused === 'email' ? C.brand : C.muted,
                        }}
                      />
                      <input
                        type="email"
                        placeholder="email@sekolah.sch.id"
                        required
                        value={form.email}
                        onChange={set('email')}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused('')}
                        style={inputStyle('email')}
                      />
                    </div>
                  </div>
                  {/* Password */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '7px',
                        color: dark ? '#cbd5e1' : '#374151',
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: focused === 'password' ? C.brand : C.muted,
                        }}
                      />
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Min. 8 karakter"
                        required
                        value={form.password}
                        onChange={set('password')}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused('')}
                        style={{
                          ...inputStyle('password'),
                          paddingRight: '42px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: C.muted,
                          display: 'flex',
                        }}
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {/* Strength */}
                    {form.password && (
                      <div style={{ marginTop: '8px' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            marginBottom: '5px',
                          }}
                        >
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                height: '3px',
                                borderRadius: '99px',
                                background:
                                  i < strength
                                    ? strengthColors[strength - 1]
                                    : C.border,
                                transition: 'background 0.3s',
                              }}
                            />
                          ))}
                        </div>
                        <p
                          style={{
                            fontSize: '11px',
                            color: strengthColors[strength - 1],
                          }}
                        >
                          {strengthLabels[strength - 1]}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="zidu-btn"
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '600',
                      fontFamily: 'Sora',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    Lanjut ke Data Sekolah →
                  </button>
                </div>
              )}

              {/* STEP 1 */}
              {step === 1 && (
                <form
                  onSubmit={handleRegister}
                  className="zidu-slide"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  {/* School Name */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '7px',
                        color: dark ? '#cbd5e1' : '#374151',
                      }}
                    >
                      Nama Sekolah
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Building2
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: focused === 'schoolName' ? C.brand : C.muted,
                        }}
                      />
                      <input
                        type="text"
                        placeholder="SMA Negeri 1 Contoh"
                        required
                        value={form.schoolName}
                        onChange={set('schoolName')}
                        onFocus={() => setFocused('schoolName')}
                        onBlur={() => setFocused('')}
                        style={inputStyle('schoolName')}
                      />
                    </div>
                  </div>
                  {/* Phone */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '7px',
                        color: dark ? '#cbd5e1' : '#374151',
                      }}
                    >
                      No. Telepon Sekolah{' '}
                      <span style={{ color: C.muted, fontWeight: 400 }}>
                        (opsional)
                      </span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: focused === 'schoolPhone' ? C.brand : C.muted,
                        }}
                      />
                      <input
                        type="tel"
                        placeholder="021-xxxxxxx"
                        value={form.schoolPhone}
                        onChange={set('schoolPhone')}
                        onFocus={() => setFocused('schoolPhone')}
                        onBlur={() => setFocused('')}
                        style={inputStyle('schoolPhone')}
                      />
                    </div>
                  </div>
                  {/* City */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        marginBottom: '7px',
                        color: dark ? '#cbd5e1' : '#374151',
                      }}
                    >
                      Kota / Kabupaten{' '}
                      <span style={{ color: C.muted, fontWeight: 400 }}>
                        (opsional)
                      </span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <MapPin
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          pointerEvents: 'none',
                          color: focused === 'schoolCity' ? C.brand : C.muted,
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Jakarta Selatan"
                        value={form.schoolCity}
                        onChange={set('schoolCity')}
                        onFocus={() => setFocused('schoolCity')}
                        onBlur={() => setFocused('')}
                        style={inputStyle('schoolCity')}
                      />
                    </div>
                  </div>

                  <div
                    style={{ display: 'flex', gap: '10px', marginTop: '4px' }}
                  >
                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="zidu-back"
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: C.muted,
                        border: `1.5px solid ${C.border}`,
                        background: C.inputBg,
                      }}
                    >
                      <ArrowLeft size={14} /> Kembali
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="zidu-btn"
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        fontFamily: 'Sora',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      {loading ? (
                        <>
                          <div className="zidu-spinner" /> Mendaftar...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> Daftar Sekarang
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <p
                style={{
                  textAlign: 'center',
                  fontSize: '13px',
                  marginTop: '20px',
                  color: C.muted,
                }}
              >
                Sudah punya akun?{' '}
                <Link
                  to="/login"
                  style={{
                    fontWeight: '600',
                    color: C.brand,
                    textDecoration: 'none',
                  }}
                >
                  Masuk di sini
                </Link>
              </p>
            </div>
          )}

          <p
            style={{
              marginTop: '24px',
              fontSize: '12px',
              color: dark ? '#334155' : '#cbd5e1',
            }}
          >
            © 2025 ZiDu · RuangSimulasi · All rights reserved
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  BookOpen,
  Zap,
  Shield,
  CheckCircle2,
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

const Login = () => {
  const [dark, toggleTheme] = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handle = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(
        error.message === 'Invalid login credentials'
          ? 'Email atau password salah. Coba lagi.'
          : error.message
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Colors ──
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .zidu-card    { animation: scaleIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .zidu-float   { animation: float 5s ease-in-out infinite; }
        .zidu-fadeup  { opacity: 0; animation: fadeUp 0.5s ease forwards; }

        .zidu-btn {
          background: linear-gradient(90deg, #4338CA, #5B6CF6, #818CF8, #5B6CF6);
          background-size: 200% auto;
          border: none;
          cursor: pointer;
          transition: background-position 0.5s ease, transform 0.15s, box-shadow 0.2s;
        }
        .zidu-btn:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(91,108,246,0.35);
        }
        .zidu-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .zidu-btn:active:not(:disabled) { transform: translateY(0); }

        .zidu-toggle {
          cursor: pointer;
          border: none;
          transition: transform 0.3s, background 0.2s;
        }
        .zidu-toggle:hover { transform: rotate(20deg); }

        .zidu-showpass {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.2s;
        }

        .zidu-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: C.bg,
          color: C.text,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ══ LEFT BRAND PANEL ══ */}
        {!isMobile && (
          <div
            style={{
              width: '44%',
              flexShrink: 0,
              background: `linear-gradient(145deg, ${C.panelBg} 0%, ${
                dark ? '#1a1f45' : '#5B6CF6'
              } 50%, ${dark ? '#0f1020' : '#7C3AED'} 100%)`,
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '48px 44px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Orbs */}
            <div
              style={{
                position: 'absolute',
                width: '280px',
                height: '280px',
                borderRadius: '50%',
                background: 'rgba(129,140,248,0.2)',
                filter: 'blur(70px)',
                top: '-60px',
                right: '-60px',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'rgba(251,191,36,0.12)',
                filter: 'blur(60px)',
                bottom: '80px',
                left: '-40px',
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
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
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
                    fontSize: '18px',
                  }}
                >
                  ZiDu
                </span>
              </div>
              <p
                style={{
                  marginTop: '6px',
                  fontSize: '13px',
                  opacity: 0.55,
                  fontWeight: 300,
                }}
              >
                Platform Ujian by RuangSimulasi
              </p>
            </div>

            {/* Hero */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="zidu-float" style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookOpen size={26} />
                </div>
              </div>

              <h1
                className="zidu-fadeup"
                style={{
                  fontFamily: 'Sora',
                  fontSize: '36px',
                  fontWeight: '700',
                  lineHeight: 1.25,
                  animationDelay: '200ms',
                }}
              >
                Belajar lebih
                <br />
                <span
                  style={{
                    background: 'linear-gradient(90deg,#FCD34D,#F59E0B)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  cerdas & efisien
                </span>
              </h1>

              <p
                className="zidu-fadeup"
                style={{
                  marginTop: '16px',
                  fontSize: '14px',
                  opacity: 0.65,
                  lineHeight: 1.7,
                  maxWidth: '280px',
                  fontWeight: 300,
                  animationDelay: '300ms',
                }}
              >
                Kelola ujian, pantau progres siswa, dan tingkatkan kualitas
                pembelajaran sekolahmu dalam satu platform.
              </p>

              {/* Features */}
              {[
                { icon: Zap, text: 'Ujian online real-time', delay: 400 },
                { icon: Shield, text: 'Data aman & terenkripsi', delay: 500 },
                { icon: BookOpen, text: 'Bank soal tak terbatas', delay: 600 },
              ].map(({ icon: Icon, text, delay }) => (
                <div
                  key={text}
                  className="zidu-fadeup"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '14px',
                    animationDelay: `${delay}ms`,
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <span style={{ fontSize: '13px', opacity: 0.8 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div
              className="zidu-fadeup"
              style={{
                animationDelay: '700ms',
                background: 'rgba(255,255,255,0.09)',
                backdropFilter: 'blur(8px)',
                borderRadius: '16px',
                padding: '18px',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  opacity: 0.8,
                  lineHeight: 1.65,
                  fontStyle: 'italic',
                  fontWeight: 300,
                }}
              >
                "ZiDu mengubah cara kami mengadakan ujian. Lebih mudah, lebih
                akurat."
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#78350f',
                    flexShrink: 0,
                  }}
                >
                  SR
                </div>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600' }}>
                    Sari Rahayu
                  </p>
                  <p style={{ fontSize: '11px', opacity: 0.5 }}>
                    Guru Matematika, SMAN 3 Jakarta
                  </p>
                </div>
              </div>
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

          {/* Card */}
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
              padding: '40px 36px',
            }}
          >
            {/* Mobile Logo */}
            {isMobile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '28px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: C.brand,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Sora',
                    fontWeight: '700',
                    color: '#fff',
                    fontSize: '16px',
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
            <div style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'Sora',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: C.text,
                  }}
                >
                  Selamat datang
                </h2>
                <span style={{ fontSize: '20px' }}>👋</span>
              </div>
              <p style={{ fontSize: '14px', color: C.muted }}>
                Masuk ke akun ZiDu kamu untuk melanjutkan
              </p>
            </div>

            {/* Error */}
            {errorMsg && (
              <div
                style={{
                  marginBottom: '20px',
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
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleLogin}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
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
                    placeholder="nama@sekolah.sch.id"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused('')}
                    style={inputStyle('email')}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '7px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: dark ? '#cbd5e1' : '#374151',
                    }}
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: C.brand,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.textDecoration = 'underline')
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.textDecoration = 'none')
                    }
                  >
                    Lupa password?
                  </a>
                </div>
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
                    placeholder="••••••••"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                    style={{ ...inputStyle('password'), paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="zidu-showpass"
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: C.muted,
                    }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
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
                {loading ? (
                  <>
                    <div className="zidu-spinner" /> Memverifikasi...
                  </>
                ) : (
                  <>
                    <LogIn size={15} /> Masuk Sekarang
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '20px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: C.border }} />
              <span style={{ fontSize: '12px', color: C.muted }}>atau</span>
              <div style={{ flex: 1, height: '1px', background: C.border }} />
            </div>

            {/* Register CTA */}
            <div
              style={{
                background: dark ? '#1e2130' : '#f8fafc',
                border: `1px solid ${C.border}`,
                borderRadius: '14px',
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '13px', color: C.muted }}>
                Sekolah belum terdaftar?{' '}
                <Link
                  to="/register"
                  style={{
                    fontWeight: '600',
                    color: C.brand,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.textDecoration = 'underline')
                  }
                  onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                >
                  Daftar gratis →
                </Link>
              </p>
            </div>
          </div>

          <p
            style={{
              marginTop: '24px',
              fontSize: '12px',
              color: dark ? '#334155' : '#cbd5e1',
            }}
          >
            © 2026 ZiDu · RuangSimulasi · All rights reserved
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
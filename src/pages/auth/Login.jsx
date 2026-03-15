import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Mail, Lock, LogIn, AlertCircle, Eye, EyeOff,
  CheckCircle2, ArrowLeft, Send,
} from 'lucide-react';

const Login = () => {
  const [loading, setLoading]     = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [focused, setFocused]     = useState('');
  const [formData, setFormData]   = useState({ email: '', password: '' });

  const [showForgot, setShowForgot]       = useState(false);
  const [forgotEmail, setForgotEmail]     = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError]     = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotFocused, setForgotFocused] = useState(false);

  useEffect(() => {
    if (!showForgot) return;
    const onKey = (e) => { if (e.key === 'Escape') closeForgot(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showForgot]);

  const openForgot = () => {
    setForgotEmail(formData.email || '');
    setForgotError('');
    setForgotSuccess(false);
    setShowForgot(true);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setForgotError('Masukkan alamat email kamu.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) { setForgotError('Format email tidak valid.'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(
        err.message === 'For security purposes, you can only request this after 60 seconds.'
          ? 'Tunggu 60 detik sebelum mengirim ulang.'
          : 'Gagal mengirim email. Coba lagi.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

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

  const INPUT = (name) => ({
    width: '100%',
    padding: '11px 14px 11px 42px',
    fontSize: '14px',
    borderRadius: '10px',
    border: `1.5px solid ${focused === name ? '#5B6CF6' : 'rgba(255,255,255,0.08)'}`,
    background: focused === name ? 'rgba(91,108,246,0.08)' : 'rgba(255,255,255,0.05)',
    color: '#E2E8F0',
    outline: 'none',
    boxShadow: focused === name ? '0 0 0 3px rgba(91,108,246,0.15)' : 'none',
    transition: 'all 0.18s ease',
    boxSizing: 'border-box',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes fadeIn { from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin   { to{transform:rotate(360deg);} }

        .z-card { animation: fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }

        .z-btn {
          background: #5B6CF6; border: none; cursor: pointer; color: #fff;
          transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
        }
        .z-btn:hover:not(:disabled) {
          background: #4F46E5;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(91,108,246,0.4);
        }
        .z-btn:active:not(:disabled) { transform: translateY(0); }
        .z-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .z-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        input::placeholder { color: rgba(148,163,184,0.5); }

        .z-showpass {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: rgba(148,163,184,0.6); transition: color 0.15s;
        }
        .z-showpass:hover { color: #94A3B8; }

        .z-forgot {
          font-size: 12px; font-weight: 600; color: #818CF8;
          background: none; border: none; cursor: pointer; padding: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: color 0.15s;
        }
        .z-forgot:hover { color: #A5B4FC; }

        .z-back {
          background: none;
          border: 1.5px solid rgba(255,255,255,0.1);
          cursor: pointer; color: #64748B;
          transition: border-color 0.15s, color 0.15s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .z-back:hover { border-color: #5B6CF6; color: #818CF8; }
      `}</style>

      {/* ── ROOT: full screen, dark bg, centered ── */}
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0D0F1A',
        padding: '24px 20px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* Logo above card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: '#5B6CF6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Sora', sans-serif", fontWeight: '800',
            fontSize: '15px', color: '#fff',
          }}>Z</div>
          <span style={{
            fontFamily: "'Sora', sans-serif", fontWeight: '800',
            fontSize: '17px', color: '#E2E8F0', letterSpacing: '-0.3px',
          }}>ZiDu</span>
        </div>

        {/* Card */}
        <div className="z-card" style={{
          width: '100%',
          maxWidth: '420px',
          background: '#161823',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          padding: '40px 36px',
        }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '22px', fontWeight: '800',
              color: '#F1F5F9', marginBottom: '6px', lineHeight: 1.2,
            }}>
              Selamat datang 👋
            </h1>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
              Masuk ke akun ZiDu kamu untuk melanjutkan
            </p>
          </div>

          {/* Error */}
          {errorMsg && (
            <div style={{
              marginBottom: '20px', padding: '11px 14px',
              borderRadius: '10px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#F87171',
              display: 'flex', alignItems: 'center', gap: '9px',
              fontSize: '13px',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: '600',
                color: '#94A3B8', marginBottom: '7px',
              }}>Alamat Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: '14px', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                  color: focused === 'email' ? '#818CF8' : 'rgba(148,163,184,0.4)',
                  transition: 'color 0.15s',
                }} />
                <input
                  type="email" placeholder="nama@sekolah.sch.id" required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  style={INPUT('email')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#94A3B8' }}>Password</label>
                <button type="button" onClick={openForgot} className="z-forgot">
                  Lupa password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: '14px', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                  color: focused === 'password' ? '#818CF8' : 'rgba(148,163,184,0.4)',
                  transition: 'color 0.15s',
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••" required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  style={{ ...INPUT('password'), paddingRight: '44px' }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="z-showpass"
                  style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="z-btn" style={{
              width: '100%', padding: '12px',
              borderRadius: '12px',
              fontSize: '14px', fontWeight: '700',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '4px',
            }}>
              {loading
                ? <><div className="z-spinner" /> Memverifikasi...</>
                : <><LogIn size={15} /> Masuk Sekarang</>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: '11px', color: '#2D3748', fontWeight: '600', letterSpacing: '0.06em' }}>atau</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Register CTA */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', padding: '14px 16px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: '#475569' }}>
              Sekolah belum terdaftar?{' '}
              <Link to="/register" style={{ fontWeight: '700', color: '#818CF8', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = '#A5B4FC'}
                onMouseLeave={e => e.target.style.color = '#818CF8'}>
                Daftar gratis →
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ marginTop: '24px', fontSize: '12px', color: '#1E2535' }}>
          © 2026 ZiDu · RuangSimulasi · All rights reserved
        </p>
      </div>

      {/* ══ FORGOT PASSWORD MODAL ══ */}
      {showForgot && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeForgot(); }}
          role="dialog" aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            width: '100%', maxWidth: '390px',
            background: '#161823',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            padding: '36px 32px',
            position: 'relative',
          }}>
            {/* Close */}
            <button onClick={closeForgot} style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '28px', height: '28px', borderRadius: '7px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', color: '#475569',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', lineHeight: 1, fontFamily: 'monospace',
            }}>×</button>

            {forgotSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'rgba(34,197,94,0.1)',
                  border: '2px solid rgba(34,197,94,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                }}>
                  <CheckCircle2 size={24} color="#22C55E" />
                </div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '10px' }}>
                  Email terkirim!
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65, marginBottom: '6px' }}>
                  Link reset password sudah dikirim ke
                </p>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#818CF8', wordBreak: 'break-all', marginBottom: '20px' }}>
                  {forgotEmail}
                </p>
                <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                  Cek folder <strong style={{ color: '#475569' }}>Spam</strong> jika tidak muncul.
                  Link berlaku <strong style={{ color: '#475569' }}>1 jam</strong>.
                </p>
                <button onClick={closeForgot} className="z-btn" style={{
                  width: '100%', marginTop: '24px', padding: '11px',
                  borderRadius: '11px', fontSize: '13.5px', fontWeight: '700',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                }}>
                  <ArrowLeft size={14} /> Kembali ke Login
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(91,108,246,0.12)',
                  border: '1.5px solid rgba(91,108,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Lock size={20} color="#818CF8" />
                </div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '18px', fontWeight: '800', color: '#F1F5F9', marginBottom: '6px' }}>
                  Lupa password?
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.65, marginBottom: '22px' }}>
                  Masukkan email akun ZiDu kamu. Kami akan kirimkan link untuk membuat password baru.
                </p>

                {forgotError && (
                  <div style={{
                    marginBottom: '16px', padding: '10px 12px', borderRadius: '9px',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#F87171', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '7px' }}>
                    Alamat Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={14} style={{
                      position: 'absolute', left: '14px', top: '50%',
                      transform: 'translateY(-50%)', pointerEvents: 'none',
                      color: forgotFocused ? '#818CF8' : 'rgba(148,163,184,0.4)',
                    }} />
                    <input
                      type="email" placeholder="nama@sekolah.sch.id" autoFocus
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); if (forgotError) setForgotError(''); }}
                      onFocus={() => setForgotFocused(true)}
                      onBlur={() => setForgotFocused(false)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
                      style={{
                        width: '100%', padding: '11px 14px 11px 42px',
                        fontSize: '14px', borderRadius: '10px',
                        border: `1.5px solid ${forgotFocused ? '#5B6CF6' : 'rgba(255,255,255,0.08)'}`,
                        background: forgotFocused ? 'rgba(91,108,246,0.08)' : 'rgba(255,255,255,0.05)',
                        color: '#E2E8F0', outline: 'none',
                        boxShadow: forgotFocused ? '0 0 0 3px rgba(91,108,246,0.15)' : 'none',
                        transition: 'all 0.18s ease', boxSizing: 'border-box',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    />
                  </div>
                </div>

                <button onClick={handleForgotPassword} disabled={forgotLoading} className="z-btn" style={{
                  width: '100%', padding: '11px', borderRadius: '11px',
                  fontSize: '14px', fontWeight: '700',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  {forgotLoading
                    ? <><div className="z-spinner" /> Mengirim...</>
                    : <><Send size={14} /> Kirim Link Reset</>
                  }
                </button>
                <button onClick={closeForgot} className="z-back" style={{
                  width: '100%', marginTop: '10px', padding: '10px',
                  borderRadius: '11px', fontSize: '13px', fontWeight: '600',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                }}>
                  <ArrowLeft size={13} /> Batal
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
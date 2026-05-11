import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Mail, Lock, Eye, EyeOff, Building2, User, Phone,
  AlertCircle, CheckCircle2, ArrowLeft, Sparkles, MapPin,
} from 'lucide-react';

const getStrength = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

const Register = () => {
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState('');
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    schoolName: '', schoolPhone: '', schoolCity: '',
  });

  const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setErrorMsg(''); };

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

  const LABEL = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#94A3B8', marginBottom: '7px' };
  const ICON  = (name) => ({ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: focused === name ? '#818CF8' : 'rgba(148,163,184,0.4)', transition: 'color 0.15s' });

  const validateStep0 = () => {
    if (!form.fullName.trim()) return 'Nama lengkap wajib diisi.';
    if (!form.email.includes('@')) return 'Format email tidak valid.';
    if (getStrength(form.password) < 2) return 'Password terlalu lemah. Min. 8 karakter.';
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
      setErrorMsg(error.message === 'User already registered' ? 'Email ini sudah terdaftar.' : error.message);
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
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes fadeIn  { from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);} }
        @keyframes slideR  { from{opacity:0;transform:translateX(16px);}to{opacity:1;transform:translateX(0);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes bounceIn {
          0%{transform:scale(0.3);opacity:0;}
          50%{transform:scale(1.1);}
          70%{transform:scale(0.9);}
          100%{transform:scale(1);opacity:1;}
        }

        .z-card   { animation: fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .z-slide  { animation: slideR 0.3s ease both; }
        .z-bounce { animation: bounceIn 0.6s cubic-bezier(0.68,-0.55,0.27,1.55) both; }

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

        .z-showpass {
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: rgba(148,163,184,0.6); transition: color 0.15s;
        }
        .z-showpass:hover { color: #94A3B8; }

        .z-back {
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.1);
          cursor: pointer; color: #64748B;
          transition: border-color 0.15s, color 0.15s;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex; align-items: center; gap: 6px;
        }
        .z-back:hover { border-color: #5B6CF6; color: #818CF8; }

        input::placeholder { color: rgba(148,163,184,0.4); }
      `}</style>

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

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '9px',
            background: '#5B6CF6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Sora', sans-serif", fontWeight: '800', fontSize: '15px', color: '#fff',
          }}>Z</div>
          <span style={{
            fontFamily: "'Sora', sans-serif", fontWeight: '800',
            fontSize: '17px', color: '#E2E8F0', letterSpacing: '-0.3px',
          }}>ZiDu</span>
        </div>

        {/* Progress bar */}
        {!success && (
          <div style={{ width: '100%', maxWidth: '420px', display: 'flex', gap: '6px', marginBottom: '20px' }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                height: '3px', borderRadius: '99px',
                flex: i === step ? 2 : 1,
                background: i <= step ? '#5B6CF6' : 'rgba(255,255,255,0.08)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
        )}

        {/* SUCCESS */}
        {success ? (
          <div className="z-card" style={{
            width: '100%', maxWidth: '420px',
            background: '#161823',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            padding: '48px 36px',
            textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          }}>
            <div className="z-bounce" style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)',
              border: '2px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={34} color="#10b981" />
            </div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '21px', fontWeight: '800', color: '#F1F5F9' }}>
              Pendaftaran Berhasil!
            </h2>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.7, maxWidth: '300px' }}>
              Email verifikasi dikirim ke{' '}
              <strong style={{ color: '#818CF8' }}>{form.email}</strong>.
              Cek inbox untuk mengaktifkan akun.
            </p>
            <Link to="/login" className="z-btn" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '11px 28px', borderRadius: '12px',
              color: '#fff', fontSize: '14px', fontWeight: '700',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textDecoration: 'none', marginTop: '8px',
            }}>
              Ke Halaman Login →
            </Link>
          </div>
        ) : (
          <div className="z-card" style={{
            width: '100%', maxWidth: '420px',
            background: '#161823',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            padding: '36px 32px',
          }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '21px', fontWeight: '800',
                color: '#F1F5F9', marginBottom: '5px', lineHeight: 1.2,
              }}>
                {step === 0 ? '🙋 Buat akun kamu' : '🏫 Data sekolah'}
              </h1>
              <p style={{ fontSize: '13px', color: '#475569' }}>
                {step === 0 ? 'Langkah 1 dari 2 — informasi akun' : 'Langkah 2 dari 2 — hampir selesai!'}
              </p>
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{
                marginBottom: '16px', padding: '11px 14px',
                borderRadius: '10px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#F87171', display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px',
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 0 */}
            {step === 0 && (
              <div className="z-slide" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Full Name */}
                <div>
                  <label style={LABEL}>Nama Lengkap</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={ICON('fullName')} />
                    <input type="text" placeholder="Nama lengkap kamu" required
                      value={form.fullName} onChange={set('fullName')}
                      onFocus={() => setFocused('fullName')} onBlur={() => setFocused('')}
                      style={INPUT('fullName')} />
                  </div>
                </div>
                {/* Email */}
                <div>
                  <label style={LABEL}>Alamat Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={ICON('email')} />
                    <input type="email" placeholder="email@sekolah.sch.id" required
                      value={form.email} onChange={set('email')}
                      onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                      style={INPUT('email')} />
                  </div>
                </div>
                {/* Password */}
                <div>
                  <label style={LABEL}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={ICON('password')} />
                    <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 karakter" required
                      value={form.password} onChange={set('password')}
                      onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                      style={{ ...INPUT('password'), paddingRight: '44px' }} />
                    <button type="button" onClick={() => setShowPass(s => !s)} className="z-showpass"
                      style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[0,1,2,3].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '3px', borderRadius: '99px',
                            background: i < strength ? strengthColors[strength - 1] : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s',
                          }} />
                        ))}
                      </div>
                      <p style={{ fontSize: '11px', color: strengthColors[strength - 1] }}>
                        {strengthLabels[strength - 1]}
                      </p>
                    </div>
                  )}
                </div>

                <button type="button" onClick={handleNext} className="z-btn" style={{
                  width: '100%', padding: '12px', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '4px',
                }}>
                  Lanjut ke Data Sekolah →
                </button>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <form onSubmit={handleRegister} className="z-slide"
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* School Name */}
                <div>
                  <label style={LABEL}>Nama Sekolah</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={15} style={ICON('schoolName')} />
                    <input type="text" placeholder="SMA Negeri 1 Contoh" required
                      value={form.schoolName} onChange={set('schoolName')}
                      onFocus={() => setFocused('schoolName')} onBlur={() => setFocused('')}
                      style={INPUT('schoolName')} />
                  </div>
                </div>
                {/* Phone */}
                <div>
                  <label style={LABEL}>
                    No. Telepon Sekolah{' '}
                    <span style={{ color: '#334155', fontWeight: '400' }}>(opsional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} style={ICON('schoolPhone')} />
                    <input type="tel" placeholder="021-xxxxxxx"
                      value={form.schoolPhone} onChange={set('schoolPhone')}
                      onFocus={() => setFocused('schoolPhone')} onBlur={() => setFocused('')}
                      style={INPUT('schoolPhone')} />
                  </div>
                </div>
                {/* City */}
                <div>
                  <label style={LABEL}>
                    Kota / Kabupaten{' '}
                    <span style={{ color: '#334155', fontWeight: '400' }}>(opsional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={15} style={ICON('schoolCity')} />
                    <input type="text" placeholder="Jakarta Selatan"
                      value={form.schoolCity} onChange={set('schoolCity')}
                      onFocus={() => setFocused('schoolCity')} onBlur={() => setFocused('')}
                      style={INPUT('schoolCity')} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button type="button" onClick={() => setStep(0)} className="z-back" style={{
                    padding: '10px 16px', borderRadius: '11px',
                    fontSize: '13px', fontWeight: '600',
                  }}>
                    <ArrowLeft size={14} /> Kembali
                  </button>
                  <button type="submit" disabled={loading} className="z-btn" style={{
                    flex: 1, padding: '11px', borderRadius: '11px',
                    fontSize: '14px', fontWeight: '700',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    {loading
                      ? <><div className="z-spinner" /> Mendaftar...</>
                      : <><Sparkles size={14} /> Daftar Sekarang</>
                    }
                  </button>
                </div>
              </form>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '20px', color: '#475569' }}>
              Sudah punya akun?{' '}
              <Link to="/login" style={{ fontWeight: '700', color: '#818CF8', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = '#A5B4FC'}
                onMouseLeave={e => e.target.style.color = '#818CF8'}>
                Masuk di sini
              </Link>
            </p>
          </div>
        )}

        <p style={{ marginTop: '24px', fontSize: '12px', color: '#1E2535' }}>
          © 2026 ZiDu · RuangSimulasi · All rights reserved
        </p>
      </div>
    </>
  );
};

export default Register;
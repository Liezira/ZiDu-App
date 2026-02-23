// src/pages/onboarding/Menunggu.jsx
// Halaman setelah user pilih Trial (menunggu approval super admin)
// atau setelah payment pending (menunggu transfer)

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, MessageCircle, RefreshCw, LogOut, CheckCircle2, CreditCard } from 'lucide-react';

const Menunggu = () => {
  const { profile, signOut, refetchProfile } = useAuth();
  const location  = useNavigate();
  const navigate  = useNavigate();

  const isPendingPayment = window.location.pathname.includes('menunggu-bayar');
  const [checking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const schoolName = profile?.schools?.name || 'Sekolah Anda';
  const status     = profile?.schools?.subscription_status;

  // Auto-redirect kalau sudah aktif
  useEffect(() => {
    if (status === 'active' || status === 'trial') {
      navigate('/school', { replace: true });
    }
  }, [status, navigate]);

  // Auto-check setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          handleRefresh();
          return 30;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setChecking(true);
    await refetchProfile();
    setChecking(false);
    setSecondsLeft(30);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes pulse   { 0%,100%{opacity:1;}50%{opacity:0.5;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes orbit   {
          0%  {transform:rotate(0deg)   translateX(36px) rotate(0deg);}
          100%{transform:rotate(360deg) translateX(36px) rotate(-360deg);}
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>

        <div style={{
          background: '#fff',
          borderRadius: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          padding: '48px 40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          opacity: 0,
          animation: 'fadeUp 0.5s ease forwards',
        }}>

          {/* Animated icon */}
          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: isPendingPayment ? '#EFF6FF' : '#FFFBEB', border: `3px solid ${isPendingPayment ? '#93C5FD' : '#FDE68A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPendingPayment
                ? <CreditCard size={34} style={{ color: '#3B82F6' }} />
                : <Clock size={34} style={{ color: '#F59E0B', animation: 'pulse 2s ease-in-out infinite' }} />
              }
            </div>
            {/* Orbiting dot */}
            <div style={{
              position: 'absolute',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: isPendingPayment ? '#3B82F6' : '#F59E0B',
              animation: 'orbit 3s linear infinite',
              top: '50%',
              left: '50%',
              marginTop: '-7px',
              marginLeft: '-7px',
            }} />
          </div>

          <h1 style={{ fontFamily: 'Sora', fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: '0 0 12px' }}>
            {isPendingPayment ? 'Menunggu Pembayaran' : 'Permintaan Dikirim!'}
          </h1>

          <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.7, margin: '0 0 32px' }}>
            {isPendingPayment
              ? <>Selesaikan pembayaran untuk <strong style={{ color: '#0F172A' }}>{schoolName}</strong>. Akun akan aktif otomatis setelah pembayaran terkonfirmasi.</>
              : <>Permintaan trial untuk <strong style={{ color: '#0F172A' }}>{schoolName}</strong> sudah kami terima. Tim kami akan menghubungimu via WhatsApp untuk konfirmasi.</>
            }
          </p>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '32px', padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #F1F5F9' }}>
            {(isPendingPayment ? [
              { n: 1, text: 'Selesaikan pembayaran sebelum batas waktu', done: false },
              { n: 2, text: 'Midtrans akan kirim konfirmasi ke emailmu', done: false },
              { n: 3, text: 'Akun aktif otomatis — tidak perlu approval', done: false },
            ] : [
              { n: 1, text: 'Permintaan dikirim ke tim ZiDu', done: true },
              { n: 2, text: 'Tim kami akan hubungi via WhatsApp', done: false },
              { n: 3, text: 'Setelah deal, akun langsung aktif', done: false },
            ]).map((step) => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: step.done ? '#DCFCE7' : '#F1F5F9', border: `2px solid ${step.done ? '#16A34A' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {step.done
                    ? <CheckCircle2 size={13} style={{ color: '#16A34A' }} />
                    : <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8' }}>{step.n}</span>
                  }
                </div>
                <span style={{ fontSize: '13px', color: step.done ? '#374151' : '#94A3B8', paddingTop: '2px' }}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          {/* Auto-refresh countdown */}
          <p style={{ fontSize: '12px', color: '#CBD5E1', marginBottom: '20px' }}>
            Cek otomatis dalam {secondsLeft} detik
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleRefresh}
              disabled={checking}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: '#4F46E5', color: '#fff', border: 'none',
                fontSize: '14px', fontWeight: '600', fontFamily: 'Sora',
                cursor: checking ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: checking ? 0.7 : 1,
              }}
            >
              {checking
                ? <><div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Mengecek...</>
                : <><RefreshCw size={15} /> Cek Status Sekarang</>
              }
            </button>

            {!isPendingPayment && (
              <a
                href={`https://wa.me/${import.meta.env.VITE_WA_NUMBER || '6281234567890'}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px',
                  background: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0',
                  fontSize: '14px', fontWeight: '600', fontFamily: 'Sora',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={15} /> Chat WhatsApp
              </a>
            )}

            <button
              onClick={signOut}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94A3B8', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px',
              }}
            >
              <LogOut size={13} /> Keluar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Menunggu;
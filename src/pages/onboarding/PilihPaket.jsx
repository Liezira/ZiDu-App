// src/pages/onboarding/PilihPaket.jsx
// Halaman setelah register — user pilih Trial (WA) atau Pro (Midtrans)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckCircle2, MessageCircle, CreditCard, Zap,
  Users, GraduationCap, BarChart2, Shield,
  Sparkles, ArrowRight, Loader2, AlertCircle, LogOut,
} from 'lucide-react';

// ── Config ────────────────────────────────────────────────────────
const WA_NUMBER   = '6281234567890'; // ← ganti nomor WA kamu
const WA_MESSAGE  = (schoolName) =>
  `Halo, saya ingin mencoba ZiDu Trial untuk sekolah *${schoolName}*. Mohon informasi lebih lanjut.`;

const PLANS = [
  {
    tier:        'trial',
    name:        'Trial',
    badge:       'Negosiasi Langsung',
    badgeBg:     '#FEF3C7',
    badgeColor:  '#92400E',
    price:       null,
    priceLabel:  'Gratis',
    priceNote:   'Hubungi via WhatsApp untuk negosiasi',
    color:       '#F59E0B',
    colorLight:  '#FFFBEB',
    border:      '#FDE68A',
    icon:        MessageCircle,
    cta:         'Hubungi via WhatsApp',
    ctaBg:       '#F59E0B',
    ctaHover:    '#D97706',
    limits:      { students: 100, teachers: 10 },
    features: [
      { text: 'Hingga 100 siswa' },
      { text: 'Hingga 10 guru' },
      { text: 'Bank soal unlimited' },
      { text: 'Laporan dasar' },
      { text: 'Support via WhatsApp' },
      { text: 'Durasi sesuai negosiasi' },
    ],
  },
  {
    tier:        'pro',
    name:        'Pro',
    badge:       'Paling Populer',
    badgeBg:     '#EEF2FF',
    badgeColor:  '#4338CA',
    price:       2990000,
    priceLabel:  'Rp 2.990.000',
    priceNote:   'per tahun (hemat 17%)',
    color:       '#4F46E5',
    colorLight:  '#EEF2FF',
    border:      '#C7D2FE',
    icon:        Zap,
    cta:         'Bayar Sekarang',
    ctaBg:       '#4F46E5',
    ctaHover:    '#4338CA',
    limits:      { students: 1000, teachers: 100 },
    features: [
      { text: 'Hingga 1.000 siswa' },
      { text: 'Hingga 100 guru' },
      { text: 'Bank soal unlimited' },
      { text: 'Laporan lengkap + export Excel' },
      { text: 'Import CSV siswa masal' },
      { text: 'Priority support' },
      { text: '1 tahun penuh' },
    ],
    highlighted: true,
  },
];

// Format Rupiah
const fmt = (n) => `Rp ${n.toLocaleString('id-ID')}`;

// ── Komponen utama ────────────────────────────────────────────────
const PilihPaket = () => {
  const { profile, signOut, refetchProfile } = useAuth();
  const navigate = useNavigate();

  const [loading,  setLoading]  = useState(false);
  const [loadPlan, setLoadPlan] = useState(null); // 'trial' | 'pro'
  const [error,    setError]    = useState('');
  const [hovered,  setHovered]  = useState(null);

  // Kalau sudah aktif, redirect ke dashboard
  useEffect(() => {
    const status = profile?.schools?.subscription_status;
    if (status === 'active' || status === 'trial') {
      navigate('/school', { replace: true });
    }
  }, [profile, navigate]);

  const schoolName = profile?.schools?.name || 'Sekolah Anda';

  // ── Handle pilih Trial → buka WA ────────────────────────────────
  const handleTrial = async () => {
    setLoadPlan('trial');
    setError('');
    try {
      // Update status jadi 'trial_requested' supaya super admin bisa lihat
      await supabase
        .from('schools')
        .update({
          subscription_tier:    'trial',
          subscription_status:  'trial_requested',
          trial_requested_at:   new Date().toISOString(),
        })
        .eq('id', profile.schools.id);

      // Buka WhatsApp
      const msg = encodeURIComponent(WA_MESSAGE(schoolName));
      window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');

      // Tampilkan halaman menunggu
      navigate('/onboarding/menunggu', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoadPlan(null);
    }
  };

  // ── Handle pilih Pro → Midtrans Snap ────────────────────────────
  const handlePro = async () => {
    setLoadPlan('pro');
    setError('');
    try {
      // 1. Buat order di database kita
      const orderId = `ZIDU-${profile.schools.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
      const amount  = 2990000;

      const { error: orderErr } = await supabase
        .from('orders')
        .insert([{
          school_id:         profile.schools.id,
          midtrans_order_id: orderId,
          tier:              'pro',
          amount,
          duration_months:   12,
          status:            'pending',
        }]);

      if (orderErr) throw orderErr;

      // 2. Minta Snap Token dari backend (Edge Function create-payment)
      const { data: tokenData, error: tokenErr } = await supabase.functions.invoke('create-payment', {
        body: {
          order_id:    orderId,
          amount,
          school_name: schoolName,
          email:       profile.email,
          name:        profile.name,
        },
      });

      if (tokenErr || !tokenData?.snap_token) {
        throw new Error(tokenErr?.message || 'Gagal membuat sesi pembayaran');
      }

      // 3. Buka Midtrans Snap popup
      window.snap.pay(tokenData.snap_token, {
        onSuccess: async () => {
          // Webhook sudah handle aktivasi, tapi kita refetch untuk update UI
          await refetchProfile();
          navigate('/school', { replace: true });
        },
        onPending: () => {
          navigate('/onboarding/menunggu-bayar', { replace: true });
        },
        onError: (result) => {
          setError('Pembayaran gagal: ' + (result?.status_message || 'Coba lagi'));
          setLoadPlan(null);
        },
        onClose: () => {
          setLoadPlan(null);
        },
      });
    } catch (err) {
      setError(err.message);
      setLoadPlan(null);
    }
  };

  const handleClick = (tier) => {
    if (tier === 'trial') handleTrial();
    else handlePro();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        /* Load Midtrans Snap JS */
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        .pp-card { transition: transform 0.2s, box-shadow 0.2s; }
        .pp-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* Load Midtrans Snap SDK */}
      <script
        type="text/javascript"
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={import.meta.env.VITE_MIDTRANS_CLIENT_KEY}
      />

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 20px',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px', opacity: 0, animation: 'fadeUp 0.5s ease 0ms forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Sora', fontWeight: '700', fontSize: '18px' }}>Z</div>
            <span style={{ fontFamily: 'Sora', fontWeight: '600', fontSize: '18px', color: '#0F172A' }}>ZiDu</span>
          </div>
          <h1 style={{ fontFamily: 'Sora', fontSize: '32px', fontWeight: '700', color: '#0F172A', margin: '0 0 12px' }}>
            Pilih Paket untuk {schoolName}
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', margin: 0 }}>
            Mulai perjalanan digitalisasi ujian sekolahmu. Pilih paket yang sesuai kebutuhan.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ maxWidth: '800px', width: '100%', marginBottom: '24px', padding: '13px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 380px))',
          gap: '24px',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '850px',
          marginBottom: '48px',
        }}>
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isLoading = loadPlan === plan.tier;
            const isDisabled = loading || loadPlan !== null;
            return (
              <div
                key={plan.tier}
                className="pp-card"
                style={{
                  background: '#fff',
                  borderRadius: '20px',
                  border: `2px solid ${plan.highlighted ? plan.color : plan.border}`,
                  padding: '32px',
                  position: 'relative',
                  boxShadow: plan.highlighted
                    ? '0 20px 60px rgba(79,70,229,0.15)'
                    : '0 4px 20px rgba(0,0,0,0.06)',
                  opacity: 0,
                  animation: `fadeUp 0.5s ease ${i * 120 + 100}ms forwards`,
                }}
              >
                {/* Badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '4px 12px', borderRadius: '999px',
                  background: plan.badgeBg, color: plan.badgeColor,
                  fontSize: '11px', fontWeight: '700',
                  marginBottom: '20px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  <Sparkles size={10} />
                  {plan.badge}
                </div>

                {/* Plan name & icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: plan.colorLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} style={{ color: plan.color }} />
                  </div>
                  <h2 style={{ fontFamily: 'Sora', fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    {plan.name}
                  </h2>
                </div>

                {/* Price */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: plan.color, fontFamily: 'Sora', lineHeight: 1.2 }}>
                    {plan.priceLabel}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
                    {plan.priceNote}
                  </div>
                </div>

                {/* Limits pills */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                    <GraduationCap size={13} style={{ color: '#4F46E5' }} />
                    Max {plan.limits.students.toLocaleString('id-ID')} Siswa
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                    <Users size={13} style={{ color: '#0891B2' }} />
                    Max {plan.limits.teachers} Guru
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <CheckCircle2 size={16} style={{ color: plan.color, flexShrink: 0, marginTop: '1px' }} />
                      <span style={{ fontSize: '14px', color: '#374151' }}>{f.text}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => !isDisabled && handleClick(plan.tier)}
                  disabled={isDisabled}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    background: isDisabled && !isLoading ? '#E2E8F0' : plan.ctaBg,
                    color: isDisabled && !isLoading ? '#94A3B8' : '#fff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '700',
                    fontFamily: 'Sora',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.2s, transform 0.1s',
                  }}
                  onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.background = plan.ctaHover; }}
                  onMouseLeave={e => { if (!isDisabled) e.currentTarget.style.background = plan.ctaBg; }}
                >
                  {isLoading ? (
                    <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Memproses...</>
                  ) : plan.tier === 'trial' ? (
                    <><MessageCircle size={16} /> {plan.cta}</>
                  ) : (
                    <><CreditCard size={16} /> {plan.cta}</>
                  )}
                </button>

                {plan.tier === 'trial' && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '10px', marginBottom: 0 }}>
                    Akan membuka WhatsApp otomatis
                  </p>
                )}
                {plan.tier === 'pro' && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '10px', marginBottom: 0 }}>
                    Bisa bayar via transfer, QRIS, kartu kredit
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Security note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '13px', marginBottom: '24px' }}>
          <Shield size={14} />
          Pembayaran diamankan oleh Midtrans (PCI-DSS certified)
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '13px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#64748B'}
          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </>
  );
};

export default PilihPaket;
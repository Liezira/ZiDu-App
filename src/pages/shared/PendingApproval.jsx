import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, LogOut, Mail, RefreshCw } from 'lucide-react';

const PendingApproval = () => {
  const { profile, signOut, refetchProfile } = useAuth();
  const [checking, setChecking] = React.useState(false);

  const handleCheck = async () => {
    setChecking(true);
    await refetchProfile();
    setTimeout(() => setChecking(false), 1500);
  };

  const isRejected = profile?.status === 'rejected';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes pulse   { 0%,100%{opacity:1;}50%{opacity:.4;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        @keyframes float   { 0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);} }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#F8FAFC 0%,#EFF6FF 50%,#F0FDF4 100%)', fontFamily: "'DM Sans', sans-serif", padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center', opacity: 0, animation: 'fadeUp .5s ease forwards' }}>

          {/* Icon */}
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: isRejected ? '#FEF2F2' : '#FFFBEB', border: `2px solid ${isRejected ? '#FECACA' : '#FDE68A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: isRejected ? 'none' : 'float 3s ease-in-out infinite' }}>
            {isRejected
              ? <span style={{ fontSize: '36px' }}>❌</span>
              : <Clock size={36} style={{ color: '#D97706' }} />}
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '26px', fontWeight: '700', color: '#0F172A', margin: '0 0 10px' }}>
            {isRejected ? 'Pendaftaran Ditolak' : 'Menunggu Persetujuan'}
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.7, margin: '0 0 24px' }}>
            {isRejected
              ? 'Pendaftaranmu ke sekolah ini tidak disetujui oleh admin.'
              : `Hei ${profile?.name?.split(' ')[0] || 'kamu'}, akunmu sudah terdaftar! Admin sekolah sedang memverifikasi pendaftaranmu.`}
          </p>

          {/* Rejection reason */}
          {isRejected && profile?.rejection_reason && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', marginBottom: '6px' }}>ALASAN DARI ADMIN</div>
              <div style={{ fontSize: '14px', color: '#B91C1C', lineHeight: 1.6 }}>{profile.rejection_reason}</div>
            </div>
          )}

          {/* Info card */}
          {!isRejected && (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)', textAlign: 'left' }}>
              {[
                { icon: '📧', text: `Email terdaftar: ${profile?.email || '—'}` },
                { icon: '🏫', text: 'Admin akan mengirim link aktivasi ke emailmu setelah disetujui' },
                { icon: '⏱️', text: 'Proses biasanya 1×24 jam pada hari kerja' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none' }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {!isRejected && (
              <button onClick={handleCheck} disabled={checking}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 24px', borderRadius: '12px', border: 'none', background: '#D97706', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: checking ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: checking ? 0.7 : 1 }}>
                <RefreshCw size={15} style={{ animation: checking ? 'spin .7s linear infinite' : 'none' }} />
                {checking ? 'Memeriksa status...' : 'Cek Status Sekarang'}
              </button>
            )}
            <button onClick={signOut}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <LogOut size={15} />Keluar dari Akun
            </button>
          </div>

          <p style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '24px' }}>
            Ada pertanyaan? Hubungi admin sekolahmu via email atau langsung.
          </p>
        </div>
      </div>
    </>
  );
};

export default PendingApproval;
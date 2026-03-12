import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ClipboardCheck, CheckCircle2, AlertCircle, Hash } from 'lucide-react';

const StudentCheckin = () => {
  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null); // { status, session_title, date } | { error }

  const handleCheckin = async () => {
    if (token.trim().length < 6) return;
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.rpc('student_checkin', { p_token: token.trim().toUpperCase() });
      if (error) throw error;
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = result?.status === 'success';
  const isAlready = result?.status === 'already_checkin';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes pop     { 0%{transform:scale(.8);}60%{transform:scale(1.1);}100%{transform:scale(1);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '440px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', textAlign: 'center', paddingTop: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <ClipboardCheck size={26} style={{ color: '#16A34A' }} />
          </div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px' }}>Check-in Absensi</h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Masukkan token 6 karakter dari gurumu</p>
        </div>

        {/* Token input */}
        {!isSuccess && (
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease 60ms forwards', background: '#fff', borderRadius: '16px', border: '1.5px solid #F1F5F9', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Hash size={12} />TOKEN ABSENSI
            </label>
            <input
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              onKeyDown={e => e.key === 'Enter' && handleCheckin()}
              placeholder="A1B2C3"
              maxLength={6}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: `2px solid ${token.length === 6 ? '#16A34A' : '#E2E8F0'}`,
                fontSize: '28px', fontFamily: 'Sora, sans-serif', fontWeight: '800',
                color: '#0F172A', textAlign: 'center', letterSpacing: '0.4em',
                outline: 'none', transition: 'border-color .2s', boxSizing: 'border-box',
                background: '#F8FAFC',
              }} />

            {/* Character dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i < token.length ? '#16A34A' : '#E2E8F0', transition: 'background .15s' }} />
              ))}
            </div>

            <button onClick={handleCheckin} disabled={loading || token.length < 6}
              style={{ width: '100%', marginTop: '18px', padding: '13px', borderRadius: '12px', border: 'none', background: loading || token.length < 6 ? '#E2E8F0' : '#16A34A', fontSize: '14px', fontWeight: '700', color: loading || token.length < 6 ? '#94A3B8' : '#fff', cursor: loading || token.length < 6 ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background .15s' }}>
              {loading
                ? <><div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />Memproses...</>
                : <><ClipboardCheck size={15} />Check-in Sekarang</>}
            </button>

            {/* Error */}
            {result?.error && (
              <div style={{ marginTop: '12px', padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '13px', color: '#DC2626' }}>{result.error}</span>
              </div>
            )}

            {/* Already checked in */}
            {isAlready && (
              <div style={{ marginTop: '12px', padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#D97706' }}>Sudah Check-in</div>
                  <div style={{ fontSize: '12px', color: '#92400E' }}>Kamu sudah tercatat <strong>{result.current_status}</strong> di sesi "{result.session_title}"</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success state */}
        {isSuccess && (
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', background: '#F0FDF4', borderRadius: '20px', border: '2px solid #86EFAC', padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ animation: 'pop .4s ease forwards', display: 'inline-block', marginBottom: '16px' }}>
              <CheckCircle2 size={56} style={{ color: '#16A34A' }} />
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: '#14532D', margin: '0 0 8px' }}>Berhasil Check-in! ✅</h2>
            <p style={{ fontSize: '14px', color: '#166534', margin: '0 0 4px' }}><strong>{result.session_title}</strong></p>
            <p style={{ fontSize: '13px', color: '#16A34A', margin: 0 }}>Kehadiranmu telah tercatat</p>
            <button onClick={() => { setResult(null); setToken(''); }}
              style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#16A34A', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Check-in Lagi (Sesi Lain)
            </button>
          </div>
        )}

        {/* Info card */}
        {!isSuccess && (
          <div style={{ opacity: 0, animation: 'fadeUp .4s ease 120ms forwards', background: '#F8FAFC', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.08em' }}>CARA CHECK-IN</div>
            {[
              { icon: '1️⃣', text: 'Minta token 6 karakter dari gurumu' },
              { icon: '2️⃣', text: 'Ketik token di kolom di atas' },
              { icon: '3️⃣', text: 'Tekan tombol Check-in' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', color: '#475569' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default StudentCheckin;
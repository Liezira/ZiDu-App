import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft, Send } from 'lucide-react';

const T = {
  bg:'#f4f3f0', surface:'#ffffff', surface2:'#f9f8f5',
  border:'#ddd9d2', border2:'#c5c2bc',
  text1:'#1a1c26', text2:'#4a4c5e', text3:'#9a9790',
  indigo:'#6366f1', indigoBg:'#ede9ff',
  red:'#E24B4A', redBg:'#FCEBEB', green:'#1D9E75',
  mono:'JetBrains Mono, monospace', heading:'Sora, sans-serif',
};

const inp = (focus,err) => ({
  width:'100%', height:'38px', padding:'0 10px 0 36px', borderRadius:'6px',
  border:`0.5px solid ${err?T.red:focus?T.indigo:T.border2}`,
  background: focus?'#f8f8ff':T.surface, color:T.text1,
  fontSize:'13px', fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box',
  boxShadow: focus?`0 0 0 2px ${err?'rgba(226,75,74,.1)':'rgba(99,102,241,.12)'}`:'none',
  transition:'all .15s',
});

const Login = () => {
  const [loading,setLoading]   = useState(false);
  const [errorMsg,setErrorMsg] = useState('');
  const [showPass,setShowPass] = useState(false);
  const [focused,setFocused]   = useState('');
  const [form,setForm]         = useState({ email:'', password:'' });
  const [showForgot,setShowForgot]     = useState(false);
  const [forgotEmail,setForgotEmail]   = useState('');
  const [forgotLoading,setForgotLoading] = useState(false);
  const [forgotError,setForgotError]   = useState('');
  const [forgotSuccess,setForgotSuccess] = useState(false);

  useEffect(() => {
    if (!showForgot) return;
    const h = e => { if(e.key==='Escape') closeForgot(); };
    window.addEventListener('keydown',h);
    return () => window.removeEventListener('keydown',h);
  },[showForgot]);

  const openForgot = () => { setForgotEmail(form.email||''); setForgotError(''); setForgotSuccess(false); setShowForgot(true); };
  const closeForgot = () => { setShowForgot(false); setForgotEmail(''); setForgotError(''); setForgotSuccess(false); };

  const handleForgot = async () => {
    if (!forgotEmail.trim()) { setForgotError('Masukkan alamat email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) { setForgotError('Format email tidak valid.'); return; }
    setForgotLoading(true); setForgotError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), { redirectTo: window.location.origin+'/reset-password' });
      if (error) throw error;
      setForgotSuccess(true);
    } catch(e) {
      setForgotError(e.message?.includes('60 seconds') ? 'Tunggu 60 detik sebelum mengirim ulang.' : 'Gagal mengirim email. Coba lagi.');
    } finally { setForgotLoading(false); }
  };

  const handleLogin = async e => {
    e.preventDefault(); setErrorMsg(''); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (error) throw error;
    } catch(e) {
      const m = e.message||'';
      setErrorMsg(
        m.includes('Invalid login') ? 'Email atau password salah.' :
        m.includes('Too Many') ? 'Terlalu banyak percobaan. Tunggu beberapa menit.' :
        m.includes('network')||m.includes('fetch') ? 'Koneksi bermasalah. Periksa internet kamu.' :
        'Gagal masuk. Coba lagi.'
      );
    } finally { setLoading(false); }
  };

  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErrorMsg(''); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes scaleIn{ from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none} }
        .zd-auth-page { animation: fadeUp .28s ease both; }
        .zd-auth-link { color:${T.indigo}; font-weight:500; text-decoration:none; transition:opacity .12s; }
        .zd-auth-link:hover { opacity:.7; }
        *{ box-sizing:border-box; margin:0; padding:0; }
      `}</style>

      <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center',
        justifyContent:'center', padding:'24px 16px', fontFamily:'DM Sans, sans-serif' }}>
        <div className="zd-auth-page" style={{ width:'100%', maxWidth:'380px', display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* Logo + brand */}
          <div style={{ textAlign:'center' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:T.indigo,
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 14px', fontFamily:T.heading, fontWeight:'800', fontSize:'22px', color:'#fff' }}>Z</div>
            <h1 style={{ fontFamily:T.heading, fontSize:'22px', fontWeight:'700',
              color:T.text1, marginBottom:'4px', letterSpacing:'-.02em' }}>Masuk ke ZiDu</h1>
            <p style={{ fontSize:'12px', color:T.text3, fontFamily:T.mono, letterSpacing:'.02em' }}>
              Platform ujian digital sekolahmu
            </p>
          </div>

          {/* Card */}
          <div style={{ background:T.surface, border:`0.5px solid ${T.border}`,
            borderRadius:'10px', padding:'22px 22px' }}>

            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {/* Email */}
              <div>
                <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
                  color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
                  display:'block', marginBottom:'5px' }}>Email</label>
                <div style={{ position:'relative' }}>
                  <Mail size={13} style={{ position:'absolute', left:'10px', top:'50%',
                    transform:'translateY(-50%)', color: focused==='email'?T.indigo:T.text3,
                    transition:'color .15s', pointerEvents:'none' }} />
                  <input type="email" required value={form.email} onChange={set('email')}
                    onFocus={()=>setFocused('email')} onBlur={()=>setFocused('')}
                    placeholder="email@sekolah.com"
                    style={inp(focused==='email', false)} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
                  color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
                  display:'block', marginBottom:'5px' }}>Password</label>
                <div style={{ position:'relative' }}>
                  <Lock size={13} style={{ position:'absolute', left:'10px', top:'50%',
                    transform:'translateY(-50%)', color: focused==='password'?T.indigo:T.text3,
                    pointerEvents:'none', transition:'color .15s' }} />
                  <input type={showPass?'text':'password'} required value={form.password} onChange={set('password')}
                    onFocus={()=>setFocused('password')} onBlur={()=>setFocused('')}
                    placeholder="••••••••"
                    style={{ ...inp(focused==='password', false), paddingRight:'36px' }} />
                  <button type="button" onClick={()=>setShowPass(p=>!p)}
                    style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', color:T.text3, padding:'2px',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <div style={{ textAlign:'right', marginTop:'5px' }}>
                  <span onClick={openForgot} className="zd-auth-link" style={{ fontSize:'10px', fontFamily:T.mono, cursor:'pointer' }}>
                    Lupa password?
                  </span>
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div style={{ display:'flex', alignItems:'center', gap:'7px',
                  padding:'9px 11px', background:T.redBg, borderRadius:'6px',
                  border:`0.5px solid #F7C1C1` }}>
                  <AlertCircle size={12} style={{ color:T.red, flexShrink:0 }} />
                  <span style={{ fontSize:'11px', color:T.red, fontWeight:'500' }}>{errorMsg}</span>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                width:'100%', padding:'9px 0', borderRadius:'6px',
                background: loading?'#b0b3f5':T.indigo, color:'#fff', border:'none',
                fontSize:'13px', fontWeight:'600', fontFamily:'DM Sans, sans-serif',
                cursor:loading?'not-allowed':'pointer', transition:'background .15s',
                letterSpacing:'.01em',
              }}
                onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background='#4f51c9'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=loading?'#b0b3f5':T.indigo; }}
              >
                {loading
                  ? <><div style={{ width:'13px', height:'13px', border:'2px solid rgba(255,255,255,.3)',
                      borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Masuk...</>
                  : <><LogIn size={13} />Masuk</>}
              </button>
            </form>

            <div style={{ marginTop:'16px', paddingTop:'14px', borderTop:`0.5px solid ${T.border}`,
              textAlign:'center', fontSize:'11px', color:T.text3, fontFamily:T.mono }}>
              Belum punya akun?{' '}
              <a href="/register" className="zd-auth-link">Daftar sekolah</a>
            </div>
          </div>

          <p style={{ textAlign:'center', fontSize:'10px', color:T.text3, fontFamily:T.mono }}>
            © 2025 ZiDu · Platform Ujian Digital
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div onClick={e=>e.target===e.currentTarget&&closeForgot()}
          style={{ position:'fixed', inset:0, zIndex:200,
            background:'rgba(15,23,42,.45)', backdropFilter:'blur(4px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:T.surface, borderRadius:'10px', width:'100%', maxWidth:'340px',
            border:`0.5px solid ${T.border}`, padding:'22px',
            animation:'scaleIn .18s ease', boxShadow:'0 8px 32px rgba(0,0,0,.1)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
              <div>
                <h3 style={{ fontFamily:T.heading, fontSize:'14px', fontWeight:'600', color:T.text1, marginBottom:'2px' }}>
                  Reset Password
                </h3>
                <p style={{ fontSize:'10px', color:T.text3, fontFamily:T.mono }}>
                  Link dikirim ke email kamu
                </p>
              </div>
              <button onClick={closeForgot} style={{
                width:'26px', height:'26px', borderRadius:'5px', border:`0.5px solid ${T.border}`,
                background:'transparent', cursor:'pointer', color:T.text3,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px',
              }}>×</button>
            </div>

            {forgotSuccess ? (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <CheckCircle2 size={32} style={{ color:T.green, margin:'0 auto 10px', display:'block' }} />
                <div style={{ fontSize:'12px', color:T.text2, lineHeight:1.6 }}>
                  Email dikirim ke <strong>{forgotEmail}</strong>.<br />Cek inbox atau folder spam kamu.
                </div>
                <button onClick={closeForgot} style={{
                  marginTop:'14px', padding:'6px 18px', borderRadius:'5px',
                  background:T.indigo, color:'#fff', border:'none', fontSize:'12px',
                  fontWeight:'500', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                }}>Tutup</button>
              </div>
            ) : (
              <>
                <div style={{ position:'relative', marginBottom:'10px' }}>
                  <Mail size={12} style={{ position:'absolute', left:'10px', top:'50%',
                    transform:'translateY(-50%)', color:T.text3, pointerEvents:'none' }} />
                  <input type="email" value={forgotEmail} onChange={e=>{ setForgotEmail(e.target.value); setForgotError(''); }}
                    placeholder="email@sekolah.com"
                    style={{ ...inp(false,!!forgotError), paddingLeft:'32px' }}
                    onKeyDown={e=>e.key==='Enter'&&handleForgot()} />
                </div>
                {forgotError && (
                  <div style={{ fontSize:'10px', color:T.red, fontFamily:T.mono, marginBottom:'10px',
                    padding:'6px 10px', background:T.redBg, borderRadius:'4px' }}>{forgotError}</div>
                )}
                <div style={{ display:'flex', gap:'7px', justifyContent:'flex-end' }}>
                  <button onClick={closeForgot} style={{
                    padding:'6px 12px', borderRadius:'5px', border:`0.5px solid ${T.border}`,
                    background:'transparent', fontSize:'11px', color:T.text2, cursor:'pointer',
                    fontFamily:'DM Sans, sans-serif',
                  }}>Batal</button>
                  <button onClick={handleForgot} disabled={forgotLoading} style={{
                    display:'inline-flex', alignItems:'center', gap:'4px',
                    padding:'6px 12px', borderRadius:'5px', border:'none',
                    background:forgotLoading?T.border:T.indigo, color:'#fff',
                    fontSize:'11px', fontWeight:'500', cursor:forgotLoading?'not-allowed':'pointer',
                    fontFamily:'DM Sans, sans-serif',
                  }}>
                    {forgotLoading
                      ? <div style={{ width:'10px', height:'10px', border:'2px solid rgba(255,255,255,.3)',
                          borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
                      : <Send size={10} />}
                    Kirim
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Login;

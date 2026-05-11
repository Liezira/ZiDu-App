import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Eye, EyeOff, Building2, User, Phone, AlertCircle, CheckCircle2, ArrowLeft, Sparkles, MapPin } from 'lucide-react';

const T = {
  bg:'#f4f3f0',surface:'#ffffff',surface2:'#f9f8f5',
  border:'#ddd9d2',border2:'#c5c2bc',
  text1:'#1a1c26',text2:'#4a4c5e',text3:'#9a9790',
  indigo:'#6366f1',indigoBg:'#ede9ff',
  red:'#E24B4A',redBg:'#FCEBEB',green:'#1D9E75',greenBg:'#E1F5EE',
  mono:'JetBrains Mono, monospace',heading:'Sora, sans-serif',
};

const getStrength = p => {
  let s=0;
  if(p.length>=8) s++; if(/[A-Z]/.test(p)) s++;
  if(/[0-9]/.test(p)) s++; if(/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

const inpStyle = (focus,err) => ({
  width:'100%', height:'36px', padding:'0 10px 0 34px', borderRadius:'6px',
  border:`0.5px solid ${err?T.red:focus?T.indigo:T.border2}`,
  background:focus?'#f8f8ff':T.surface, color:T.text1,
  fontSize:'12px', fontFamily:'DM Sans, sans-serif', outline:'none',
  boxSizing:'border-box',
  boxShadow:focus?`0 0 0 2px rgba(99,102,241,.12)`:'none',
  transition:'all .15s',
});

const STEPS = ['Akun Admin','Data Sekolah','Konfirmasi'];
const STR_COLORS = ['#E24B4A','#f59e0b','#6366f1','#1D9E75'];
const STR_LABELS = ['Lemah','Cukup','Kuat','Sangat kuat'];

const Register = () => {
  const [step,setStep]       = useState(0);
  const [loading,setLoading] = useState(false);
  const [success,setSuccess] = useState(false);
  const [errorMsg,setErrorMsg] = useState('');
  const [showPass,setShowPass] = useState(false);
  const [focused,setFocused] = useState('');
  const [form,setForm] = useState({
    fullName:'',email:'',password:'',
    schoolName:'',schoolPhone:'',schoolCity:'',
  });

  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErrorMsg(''); };
  const str = getStrength(form.password);

  const validateStep0 = () => {
    if (!form.fullName.trim()) return 'Nama lengkap wajib diisi.';
    if (!form.email.includes('@')) return 'Format email tidak valid.';
    if (str < 2) return 'Password terlalu lemah. Minimal 8 karakter.';
    return null;
  };
  const validateStep1 = () => {
    if (!form.schoolName.trim()) return 'Nama sekolah wajib diisi.';
    if (!form.schoolCity.trim()) return 'Kota wajib diisi.';
    return null;
  };

  const handleNext = () => {
    const err = step===0 ? validateStep0() : step===1 ? validateStep1() : null;
    if (err) { setErrorMsg(err); return; }
    setErrorMsg(''); setStep(s=>s+1);
  };

  const handleRegister = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const { data:auth, error:authErr } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password });
      if (authErr) throw authErr;
      if (auth.user) {
        const { error:profileErr } = await supabase.from('profiles').upsert({
          id: auth.user.id, email: auth.user.email,
          name: form.fullName.trim(), full_name: form.fullName.trim(),
          role: 'school_admin', status: 'active',
        });
        if (profileErr) console.warn('Profile upsert:', profileErr.message);
        const { error:schoolErr } = await supabase.rpc('create_school_with_admin', {
          p_user_id: auth.user.id,
          p_school_name: form.schoolName.trim(),
          p_phone: form.schoolPhone.trim()||null,
          p_city: form.schoolCity.trim(),
          p_admin_name: form.fullName.trim(),
        });
        if (schoolErr) console.warn('School RPC:', schoolErr.message);
      }
      setSuccess(true);
    } catch(e) {
      const m = e.message||'';
      setErrorMsg(
        m.includes('already registered')||m.includes('already in use') ? 'Email ini sudah terdaftar. Silakan login.' :
        m.includes('weak-password')||m.includes('password') ? 'Password terlalu lemah.' :
        m.includes('Too Many') ? 'Terlalu banyak percobaan. Tunggu beberapa menit.' :
        'Terjadi kesalahan. Coba lagi.'
      );
      setStep(0);
    } finally { setLoading(false); }
  };

  const FieldRow = ({ label,name,type='text',icon:Icon,placeholder,noPrefix }) => (
    <div>
      <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
        color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
        display:'block', marginBottom:'4px' }}>{label}</label>
      <div style={{ position:'relative' }}>
        {Icon && <Icon size={12} style={{ position:'absolute', left:'10px', top:'50%',
          transform:'translateY(-50%)', color:focused===name?T.indigo:T.text3,
          pointerEvents:'none', transition:'color .15s' }} />}
        <input type={type==='password'?(showPass?'text':'password'):type}
          value={form[name]} onChange={set(name)} placeholder={placeholder}
          onFocus={()=>setFocused(name)} onBlur={()=>setFocused('')}
          style={{ ...inpStyle(focused===name,false), paddingLeft:Icon?'34px':'10px' }} />
        {type==='password' && (
          <button type="button" onClick={()=>setShowPass(p=>!p)}
            style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:T.text3,
              display:'flex', alignItems:'center' }}>
            {showPass?<EyeOff size={12}/>:<Eye size={12}/>}
          </button>
        )}
      </div>
    </div>
  );

  if (success) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex',
      alignItems:'center', justifyContent:'center', padding:'24px',
      fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ textAlign:'center', maxWidth:'360px', animation:'fadeUp .3s ease' }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
        <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:T.greenBg,
          border:`0.5px solid #a7e8d4`, display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 16px' }}>
          <CheckCircle2 size={24} style={{ color:T.green }} />
        </div>
        <h2 style={{ fontFamily:T.heading, fontSize:'20px', fontWeight:'700',
          color:T.text1, marginBottom:'8px', letterSpacing:'-.02em' }}>
          Selamat Datang di ZiDu!
        </h2>
        <p style={{ fontSize:'12px', color:T.text2, lineHeight:1.7, marginBottom:'20px' }}>
          Akun sekolahmu berhasil dibuat.<br />
          Cek email <strong>{form.email}</strong> untuk konfirmasi.
        </p>
        <a href="/login" style={{
          display:'inline-flex', alignItems:'center', justifyContent:'center',
          padding:'8px 20px', borderRadius:'6px', background:T.indigo, color:'#fff',
          fontSize:'12px', fontWeight:'500', textDecoration:'none', fontFamily:'DM Sans, sans-serif',
        }}>Masuk sekarang</a>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .zd-reg-card { animation: fadeUp .28s ease both; }
        * { box-sizing:border-box; margin:0; padding:0; }
      `}</style>

      <div style={{ minHeight:'100vh', background:T.bg, display:'flex',
        alignItems:'center', justifyContent:'center', padding:'24px 16px',
        fontFamily:'DM Sans, sans-serif' }}>
        <div className="zd-reg-card" style={{ width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', gap:'18px' }}>

          {/* Logo */}
          <div style={{ textAlign:'center' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:T.indigo,
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 14px', fontFamily:T.heading, fontWeight:'800', fontSize:'22px', color:'#fff' }}>Z</div>
            <h1 style={{ fontFamily:T.heading, fontSize:'20px', fontWeight:'700',
              color:T.text1, marginBottom:'4px', letterSpacing:'-.02em' }}>
              Daftar Sekolah
            </h1>
            <p style={{ fontSize:'11px', color:T.text3, fontFamily:T.mono }}>
              Mulai perjalanan digital sekolahmu
            </p>
          </div>

          {/* Step indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:'0' }}>
            {STEPS.map((s,i)=>(
              <React.Fragment key={i}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', flex:1 }}>
                  <div style={{ width:'22px', height:'22px', borderRadius:'50%',
                    background:i<step?T.green:i===step?T.indigo:T.surface2,
                    border:`0.5px solid ${i<step?'#a7e8d4':i===step?T.indigo:T.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'9px', fontWeight:'700',
                    color:i<=step?'#fff':T.text3, fontFamily:T.mono, transition:'all .2s',
                  }}>
                    {i<step ? '✓' : i+1}
                  </div>
                  <span style={{ fontSize:'8px', fontFamily:T.mono, fontWeight:'500',
                    color:i===step?T.indigo:T.text3, letterSpacing:'.04em',
                    textTransform:'uppercase', whiteSpace:'nowrap' }}>{s}</span>
                </div>
                {i<STEPS.length-1 && (
                  <div style={{ height:'0.5px', flex:1, background:i<step?T.green:T.border,
                    marginBottom:'16px', transition:'background .2s' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Card */}
          <div style={{ background:T.surface, border:`0.5px solid ${T.border}`,
            borderRadius:'10px', padding:'22px' }}>

            {step===0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'13px' }}>
                <FieldRow label="Nama lengkap" name="fullName" icon={User} placeholder="Admin Sekolah" />
                <FieldRow label="Email" name="email" type="email" icon={Mail} placeholder="admin@sekolah.com" />
                <div>
                  <FieldRow label="Password" name="password" type="password" icon={Lock} placeholder="Min. 8 karakter" />
                  {form.password && (
                    <div style={{ marginTop:'7px' }}>
                      <div style={{ display:'flex', gap:'3px', marginBottom:'3px' }}>
                        {[0,1,2,3].map(i=>(
                          <div key={i} style={{ flex:1, height:'3px', borderRadius:'2px',
                            background:i<str?STR_COLORS[str-1]:'#ede9e2', transition:'all .2s' }} />
                        ))}
                      </div>
                      <span style={{ fontSize:'9px', fontFamily:T.mono, color:STR_COLORS[str-1]||T.text3 }}>
                        {form.password ? STR_LABELS[str-1]||'Terlalu pendek' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step===1 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'13px' }}>
                <FieldRow label="Nama sekolah" name="schoolName" icon={Building2} placeholder="SMA Negeri 1 ..." />
                <FieldRow label="Kota" name="schoolCity" icon={MapPin} placeholder="Jakarta, Bandung..." />
                <FieldRow label="No. telepon sekolah (opsional)" name="schoolPhone" icon={Phone} placeholder="021xxxxxxx" />
              </div>
            )}

            {step===2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <div style={{ padding:'12px', background:T.surface2, borderRadius:'7px',
                  border:`0.5px solid ${T.border}` }}>
                  <div style={{ fontSize:'10px', fontFamily:T.mono, fontWeight:'600', color:T.text3,
                    letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'10px' }}>
                    Ringkasan pendaftaran
                  </div>
                  {[
                    ['Admin',form.fullName],['Email',form.email],
                    ['Sekolah',form.schoolName],['Kota',form.schoolCity||'—'],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between',
                      padding:'5px 0', borderBottom:`0.5px solid ${T.border}`,
                      fontSize:'11px' }}>
                      <span style={{ color:T.text3, fontFamily:T.mono }}>{k}</span>
                      <span style={{ color:T.text1, fontWeight:'500', maxWidth:'60%',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        textAlign:'right' }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'7px',
                  padding:'9px 11px', background:'#E6F1FB', borderRadius:'6px',
                  border:'0.5px solid #BFDBFE' }}>
                  <Sparkles size={12} style={{ color:'#185FA5', flexShrink:0, marginTop:'1px' }} />
                  <span style={{ fontSize:'10px', color:'#0C447C', lineHeight:1.5 }}>
                    Akun kamu dimulai dengan plan <strong>Starter</strong> — gratis dengan maks 20 guru & 500 siswa.
                  </span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'7px',
                padding:'9px 11px', background:T.redBg, borderRadius:'6px',
                border:`0.5px solid #F7C1C1` }}>
                <AlertCircle size={12} style={{ color:T.red, flexShrink:0 }} />
                <span style={{ fontSize:'11px', color:T.red }}>{errorMsg}</span>
              </div>
            )}

            {/* Nav buttons */}
            <div style={{ display:'flex', gap:'8px', justifyContent:'space-between', marginTop:'16px' }}>
              {step>0
                ? <button onClick={()=>{setStep(s=>s-1);setErrorMsg('');}} style={{
                    display:'inline-flex', alignItems:'center', gap:'4px',
                    padding:'7px 12px', borderRadius:'6px',
                    border:`0.5px solid ${T.border}`, background:'transparent',
                    fontSize:'12px', color:T.text2, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
                  }}><ArrowLeft size={12}/>Kembali</button>
                : <Link to="/login" style={{
                    display:'inline-flex', alignItems:'center', gap:'4px',
                    padding:'7px 12px', borderRadius:'6px',
                    border:`0.5px solid ${T.border}`, background:'transparent',
                    fontSize:'12px', color:T.text2, textDecoration:'none', fontFamily:'DM Sans,sans-serif',
                  }}><ArrowLeft size={12}/>Login</Link>
              }
              <button
                onClick={step===2 ? handleRegister : handleNext}
                disabled={loading}
                style={{
                  display:'inline-flex', alignItems:'center', gap:'5px',
                  padding:'7px 18px', borderRadius:'6px', border:'none',
                  background:loading?T.border:T.indigo, color:'#fff',
                  fontSize:'12px', fontWeight:'600', cursor:loading?'not-allowed':'pointer',
                  fontFamily:'DM Sans,sans-serif', transition:'background .15s',
                }}
                onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background='#4f51c9'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=loading?T.border:T.indigo; }}
              >
                {loading
                  ? <><div style={{ width:'12px', height:'12px', border:'2px solid rgba(255,255,255,.3)',
                      borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />Membuat...</>
                  : step===2 ? <><Sparkles size={12}/>Buat akun</> : 'Lanjut →'
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default Register;

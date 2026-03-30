import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  School, Users, CheckCircle2, Clock, XCircle, AlertCircle,
  RefreshCw, Crown, Zap, Search, ChevronDown, Edit2, X,
  Save, ArrowLeft, Calendar, Plus, Shield,
  UserPlus, Link, Copy, Mail,
} from 'lucide-react';
import {
  T, DashboardStyles, StatCard, StatCardSkeleton, Shimmer,
  PageHeader, ErrorBanner, Badge, RefreshButton, IconBox,
} from '../../components/ui/DashboardUI';

const TIERS = ['starter', 'professional', 'enterprise'];
const STATUSES = ['active', 'trial', 'suspended', 'expired'];
const TIER_META = {
  starter:      { label: 'Starter',      bg: T.greenLight,  color: T.green,  border: '#BBF7D0' },
  professional: { label: 'Professional', bg: T.blueLight,   color: '#2563EB', border: '#BFDBFE' },
  enterprise:   { label: 'Enterprise',   bg: T.purpleLight, color: T.purple, border: '#E9D5FF' },
};
const STATUS_META = {
  active:    { label: 'Aktif',   bg: T.greenLight,  color: T.green,    border: '#BBF7D0', icon: CheckCircle2 },
  trial:     { label: 'Trial',   bg: T.amberLight,  color: T.amber,    border: '#FDE68A', icon: Clock },
  suspended: { label: 'Suspend', bg: T.redLight,    color: T.red,      border: '#FECACA', icon: XCircle },
  expired:   { label: 'Expired', bg: T.surfaceAlt,  color: T.textMuted,border: T.border,  icon: AlertCircle },
};
const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TierBadge   = ({ tier })   => { const m = TIER_META[tier]   || { label: tier,   bg: T.surfaceAlt, color: T.textMuted, border: T.border }; return <Badge label={m.label} color={m.color} bg={m.bg} border={m.border} />; };
const StatusBadge = ({ status }) => { const m = STATUS_META[status] || { label: status, bg: T.surfaceAlt, color: T.textMuted, border: T.border }; const Icon = m.icon; return (
  <span style={{ display:'inline-flex',alignItems:'center',gap:'4px',padding:'2px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700',background:m.bg,color:m.color,border:`1px solid ${m.border}`,whiteSpace:'nowrap',fontFamily:T.fontBody }}>
    <Icon size={10}/>{m.label}
  </span>
);};

const FieldInput = ({ label, required, error, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: T.textSub, fontFamily: T.fontBody }}>{label}{required && <span style={{ color: T.red, marginLeft: '2px' }}>*</span>}</label>}
    <input {...props} style={{ padding: '9px 12px', borderRadius: T.rSm, fontSize: '13px', color: T.text, fontFamily: T.fontBody, border: `1.5px solid ${error ? '#FCA5A5' : T.border}`, background: T.surfaceAlt, outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color .15s', ...props.style }}
      onFocus={e => { e.target.style.borderColor = T.brand; e.target.style.boxShadow = `0 0 0 3px ${T.brandMid}`; e.target.style.background = T.surface; }}
      onBlur={e  => { e.target.style.borderColor = error ? '#FCA5A5' : T.border; e.target.style.boxShadow = 'none'; e.target.style.background = T.surfaceAlt; }} />
    {error && <span style={{ fontSize: '11px', color: T.red }}>{error}</span>}
  </div>
);

const FieldSelect = ({ label, required, options, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
    {label && <label style={{ fontSize: '12px', fontWeight: '600', color: T.textSub, fontFamily: T.fontBody }}>{label}{required && <span style={{ color: T.red, marginLeft: '2px' }}>*</span>}</label>}
    <div style={{ position: 'relative' }}>
      <select {...props} style={{ padding: '9px 32px 9px 12px', borderRadius: T.rSm, fontSize: '13px', color: T.text, fontFamily: T.fontBody, border: `1.5px solid ${T.border}`, background: T.surfaceAlt, outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer', ...props.style }}
        onFocus={e => { e.target.style.borderColor = T.brand; e.target.style.boxShadow = `0 0 0 3px ${T.brandMid}`; }}
        onBlur={e  => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
    </div>
  </div>
);

const SchoolModal = ({ open, school, onClose, onSaved }) => {
  const isEdit = !!school?.id;
  const EMPTY = { name: '', email: '', phone: '', address: '', school_type: 'SMA', subscription_tier: 'starter', subscription_status: 'trial', max_students: 200, max_teachers: 20, subscription_end_date: '' };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm(school ? { name: school.name||'', email: school.email||'', phone: school.phone||'', address: school.address||'', school_type: school.school_type||'SMA', subscription_tier: school.subscription_tier||'starter', subscription_status: school.subscription_status||'trial', max_students: school.max_students||200, max_teachers: school.max_teachers||20, subscription_end_date: school.subscription_end_date ? school.subscription_end_date.split('T')[0] : '' } : EMPTY);
      setErrors({}); setSaveErr('');
    }
  }, [open, school]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => {
    const e = {}; if (!form.name.trim()) e.name = 'Nama wajib diisi'; setErrors(e); if (Object.keys(e).length) return;
    setSaving(true); setSaveErr('');
    try {
      const payload = { name: form.name.trim(), email: form.email.trim()||null, phone: form.phone.trim()||null, address: form.address.trim()||null, school_type: form.school_type, subscription_tier: form.subscription_tier, subscription_status: form.subscription_status, max_students: parseInt(form.max_students)||200, max_teachers: parseInt(form.max_teachers)||20, subscription_end_date: form.subscription_end_date||null, updated_at: new Date().toISOString() };
      const { error } = isEdit ? await supabase.from('schools').update(payload).eq('id', school.id) : await supabase.from('schools').insert([{ ...payload, created_at: new Date().toISOString() }]);
      if (error) throw error; onSaved(); onClose();
    } catch (err) { setSaveErr(err.message); } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(15,23,42,.6)',backdropFilter:'blur(6px)',zIndex:190,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px' }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:T.surface,borderRadius:T.rXl,width:'100%',maxWidth:'540px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.25)',animation:'du-scalein .2s ease' }}>
        <div style={{ padding:'18px 22px 14px',borderBottom:`1px solid ${T.borderLight}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
            <IconBox size={32} r={9} bg={T.brandLight} color={T.brand} icon={School} iconSize={15} />
            <h2 style={{ fontFamily:T.fontDisplay,fontSize:'15px',fontWeight:'700',color:T.text,margin:0 }}>{isEdit?'Edit Sekolah':'Tambah Sekolah Baru'}</h2>
          </div>
          <button onClick={onClose} style={{ width:'28px',height:'28px',borderRadius:T.rSm,border:`1px solid ${T.borderLight}`,background:T.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T.textMuted }}><X size={13}/></button>
        </div>
        <div style={{ padding:'18px 22px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'13px' }}>
          <FieldInput label="Nama Sekolah" required placeholder="SMA Negeri 1 Jakarta" value={form.name} onChange={e=>set('name',e.target.value)} error={errors.name} />
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'11px' }}>
            <FieldInput label="Email" type="email" placeholder="admin@sekolah.sch.id" value={form.email} onChange={e=>set('email',e.target.value)} />
            <FieldInput label="Telepon" placeholder="021-xxx" value={form.phone} onChange={e=>set('phone',e.target.value)} />
          </div>
          <FieldInput label="Alamat" placeholder="Jl. ..." value={form.address} onChange={e=>set('address',e.target.value)} />
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'11px' }}>
            <FieldSelect label="Jenis Sekolah" value={form.school_type} onChange={e=>set('school_type',e.target.value)} options={['SMA','SMK','SMP','MA','MTS'].map(t=>({value:t,label:t}))} />
            <FieldSelect label="Paket" value={form.subscription_tier} onChange={e=>set('subscription_tier',e.target.value)} options={TIERS.map(t=>({value:t,label:TIER_META[t].label}))} />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'11px' }}>
            <FieldSelect label="Status" value={form.subscription_status} onChange={e=>set('subscription_status',e.target.value)} options={STATUSES.map(s=>({value:s,label:STATUS_META[s].label}))} />
            <FieldInput label="Kadaluarsa" type="date" value={form.subscription_end_date} onChange={e=>set('subscription_end_date',e.target.value)} />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'11px' }}>
            <FieldInput label="Maks. Siswa" type="number" min="1" value={form.max_students} onChange={e=>set('max_students',e.target.value)} />
            <FieldInput label="Maks. Guru"  type="number" min="1" value={form.max_teachers}  onChange={e=>set('max_teachers',e.target.value)} />
          </div>
          {saveErr && <div style={{ padding:'10px 13px',background:T.redLight,border:`1px solid #FECACA`,borderRadius:T.rSm,color:T.red,fontSize:'13px',display:'flex',alignItems:'center',gap:'8px',fontFamily:T.fontBody }}><AlertCircle size={13}/>{saveErr}</div>}
        </div>
        <div style={{ padding:'13px 22px',borderTop:`1px solid ${T.borderLight}`,display:'flex',justifyContent:'flex-end',gap:'9px',flexShrink:0 }}>
          <button onClick={onClose} disabled={saving} className="du-btn-ghost">Batal</button>
          <button onClick={handleSave} disabled={saving} className="du-btn-primary" style={{ gap:'6px' }}>
            {saving ? <div style={{ width:'13px',height:'13px',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'du-spin .7s linear infinite' }}/> : <Save size={13}/>}
            {isEdit?'Simpan':'Tambah Sekolah'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ── InviteAdminModal ──────────────────────────────────────────────
const InviteAdminModal = ({ school, createdBy, onClose }) => {
  const [step,      setStep]      = useState('form'); // 'form' | 'success'
  const [label,     setLabel]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    if (school) setLabel(`Admin ${school.name}`);
  }, [school?.id]);

  const handleGenerate = async () => {
    setLoading(true); setError('');
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error: insertErr } = await supabase
        .from('invite_links')
        .insert([{
          school_id:   school.id,
          created_by:  createdBy,
          target_role: 'school_admin',
          class_id:    null,
          class_name:  null,
          label:       label.trim() || `Admin ${school.name}`,
          max_uses:    1,           // sekali pakai
          expires_at:  expiresAt,
        }])
        .select('token')
        .single();
      if (insertErr) throw insertErr;
      setInviteUrl(`${window.location.origin}/join?invite=${data.token}`);
      setStep('success');
    } catch (e) {
      setError(
        e.message?.includes('violates check constraint')
          ? 'Constraint DB belum diupdate. Jalankan SQL migrasi terlebih dahulu.'
          : e.message
      );
    } finally { setLoading(false); }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!school) return null;

  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(15,23,42,.65)',backdropFilter:'blur(6px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background:'#fff',borderRadius:20,width:'100%',maxWidth:480,boxShadow:'0 32px 80px rgba(0,0,0,.25)',overflow:'hidden',fontFamily:"'DM Sans',sans-serif",animation:'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px',background:'linear-gradient(135deg,#1E3A5F,#4F46E5)',color:'#fff' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
            <div style={{ display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ width:38,height:38,borderRadius:10,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <UserPlus size={17}/>
              </div>
              <div>
                <div style={{ fontSize:11,fontWeight:700,opacity:.7,letterSpacing:'.06em',marginBottom:2 }}>UNDANG ADMIN SEKOLAH</div>
                <h2 style={{ fontFamily:"Sora,sans-serif",fontSize:15,fontWeight:700,margin:0 }}>{school.name}</h2>
              </div>
            </div>
            <button onClick={onClose} style={{ width:28,height:28,borderRadius:8,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <X size={13} color="#fff"/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'22px 24px' }}>
          {step === 'form' && (
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

              {/* Info */}
              <div style={{ background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 14px',display:'flex',gap:9,alignItems:'flex-start' }}>
                <Link size={14} color="#2563EB" style={{ flexShrink:0,marginTop:1 }}/>
                <div style={{ fontSize:12.5,color:'#1E40AF',lineHeight:1.6 }}>
                  Sistem akan membuat <strong>link undangan sekali pakai</strong> (berlaku 7 hari).
                  Kirimkan ke calon admin — mereka daftar sendiri dan langsung mendapat akses <strong>Admin Sekolah</strong>.
                </div>
              </div>

              {/* Label */}
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }}>
                  Label Undangan <span style={{ fontSize:11,color:'#94A3B8',fontWeight:400 }}>(opsional)</span>
                </label>
                <input
                  type="text" value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={`Admin ${school.name}`}
                  style={{ width:'100%',padding:'9px 12px',borderRadius:'9px',border:'1.5px solid #E2E8F0',background:'#F8FAFC',fontSize:13,color:'#0F172A',outline:'none',boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif",transition:'border-color .15s' }}
                  onFocus={e => { e.target.style.borderColor='#4F46E5'; e.target.style.boxShadow='0 0 0 3px rgba(79,70,229,.1)'; }}
                  onBlur={e  => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; }}
                />
              </div>

              {/* Config summary */}
              <div style={{ background:'#F8FAFC',borderRadius:10,padding:'12px 14px',border:'1px solid #F1F5F9' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#94A3B8',letterSpacing:'.06em',marginBottom:10 }}>KONFIGURASI LINK</div>
                {[
                  { label:'Sekolah',        value: school.name },
                  { label:'Role diberikan', value: 'school_admin', badge: true },
                  { label:'Maks. pakai',    value: '1× (sekali pakai)' },
                  { label:'Berlaku',        value: '7 hari' },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7 }}>
                    <span style={{ fontSize:12,color:'#64748B' }}>{row.label}</span>
                    {row.badge
                      ? <span style={{ fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:999,background:'#EEF2FF',color:'#4F46E5' }}>{row.value}</span>
                      : <span style={{ fontSize:12,fontWeight:600,color:'#0F172A' }}>{row.value}</span>
                    }
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ padding:'10px 13px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:9,color:'#DC2626',fontSize:12.5,display:'flex',gap:7,alignItems:'flex-start' }}>
                  <AlertCircle size={13} style={{ flexShrink:0,marginTop:1 }}/>{error}
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div style={{ display:'flex',flexDirection:'column',gap:18 }}>

              {/* Success header */}
              <div style={{ textAlign:'center',padding:'6px 0' }}>
                <div style={{ width:52,height:52,borderRadius:'50%',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px' }}>
                  <CheckCircle2 size={26} color="#16A34A"/>
                </div>
                <div style={{ fontFamily:'Sora,sans-serif',fontSize:16,fontWeight:700,color:'#0F172A',marginBottom:4 }}>Link Undangan Berhasil Dibuat!</div>
                <div style={{ fontSize:13,color:'#64748B' }}>Kirimkan link ini ke calon Admin Sekolah</div>
              </div>

              {/* URL box */}
              <div>
                <label style={{ display:'block',fontSize:11,fontWeight:700,color:'#94A3B8',letterSpacing:'.06em',marginBottom:8 }}>LINK UNDANGAN</label>
                <div style={{ background:'#F8FAFC',border:'1.5px solid #E2E8F0',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:10 }}>
                  <Link size={13} color="#94A3B8" style={{ flexShrink:0 }}/>
                  <span style={{ flex:1,fontSize:12,color:'#4F46E5',wordBreak:'break-all',lineHeight:1.5,fontWeight:500 }}>{inviteUrl}</span>
                  <button onClick={handleCopy}
                    style={{ flexShrink:0,display:'flex',alignItems:'center',gap:5,padding:'6px 13px',borderRadius:8,border:'1px solid #E2E8F0',background:copied?'#F0FDF4':'#fff',fontSize:12,fontWeight:600,color:copied?'#16A34A':'#374151',cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap' }}>
                    {copied ? <><Check size={12}/>Copied!</> : <><Copy size={12}/>Salin</>}
                  </button>
                </div>
              </div>

              {/* Steps for admin */}
              <div style={{ background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:12,padding:'14px 16px' }}>
                <div style={{ fontSize:12,fontWeight:700,color:'#92400E',marginBottom:10 }}>📋 Instruksi untuk calon admin:</div>
                {[
                  'Buka link undangan di browser',
                  'Isi nama lengkap, email, dan buat password',
                  'Klik "Daftar Sekarang" — akun langsung aktif',
                  'Login ke ZiDu dan mulai kelola sekolah',
                ].map((s, i) => (
                  <div key={i} style={{ display:'flex',gap:10,marginBottom:i<3?8:0,alignItems:'flex-start' }}>
                    <span style={{ flexShrink:0,width:20,height:20,borderRadius:'50%',background:'#D97706',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>{i+1}</span>
                    <span style={{ fontSize:12.5,color:'#78350F',lineHeight:1.5 }}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Share via */}
              <div style={{ display:'flex',gap:8 }}>
                <a href={`mailto:?subject=Undangan Admin Sekolah ZiDu — ${school.name}&body=Halo,%0A%0AAnda diundang menjadi Admin Sekolah di ${encodeURIComponent(school.name)} pada platform ZiDu.%0A%0ASilakan klik link berikut untuk mendaftar:%0A${encodeURIComponent(inviteUrl)}%0A%0ALink berlaku 7 hari dan hanya bisa digunakan 1 kali.%0A%0ASalam,%0AZiDu`}
                  style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:9,border:'1.5px solid #E2E8F0',background:'#fff',fontSize:12,fontWeight:600,color:'#475569',cursor:'pointer',textDecoration:'none',transition:'background .12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <Mail size={13}/>Kirim via Email
                </a>
                <button onClick={handleCopy}
                  style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px',borderRadius:9,border:'1.5px solid #E2E8F0',background:copied?'#F0FDF4':'#fff',fontSize:12,fontWeight:600,color:copied?'#16A34A':'#475569',cursor:'pointer',transition:'all .15s' }}>
                  {copied ? <><Check size={13}/>Tersalin!</> : <><Copy size={13}/>Salin Link</>}
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px',borderTop:'1px solid #F1F5F9',display:'flex',justifyContent:'flex-end',gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 18px',borderRadius:'9px',border:'1.5px solid #E2E8F0',background:'#fff',fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
            {step === 'success' ? 'Selesai' : 'Batal'}
          </button>
          {step === 'form' && (
            <button onClick={handleGenerate} disabled={loading}
              style={{ padding:'9px 20px',borderRadius:'9px',border:'none',background:loading?'#E2E8F0':'#4F46E5',fontSize:13,fontWeight:700,color:loading?'#94A3B8':'#fff',cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:7,fontFamily:"'DM Sans',sans-serif",transition:'all .15s' }}>
              {loading
                ? <><div style={{ width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite' }}/>Membuat Link…</>
                : <><UserPlus size={14}/>Buat Link Undangan</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SchoolDrawer = ({ school, onClose, onEdit, onInviteAdmin }) => {
  const [profiles, setProfiles] = useState([]);
  const [pLoading, setPLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!school) return;
    setPLoading(true);
    supabase.from('profiles').select('id, name, email, role, nis, created_at').eq('school_id', school.id).order('role')
      .then(({ data }) => { setProfiles(data || []); setPLoading(false); });
  }, [school?.id]);

  if (!school) return null;
  const teachers = profiles.filter(p => p.role === 'teacher');
  const students = profiles.filter(p => p.role === 'student');
  const admins   = profiles.filter(p => p.role === 'school_admin');
  const days = school.subscription_end_date ? Math.ceil((new Date(school.subscription_end_date) - new Date()) / (1000*60*60*24)) : null;
  const ROLE_META = { school_admin: { label:'Admin',bg:T.brandLight,color:T.brand }, teacher: { label:'Guru',bg:T.blueLight,color:T.blue }, student: { label:'Siswa',bg:T.greenLight,color:T.green } };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:180,display:'flex' }}>
      <div style={{ flex:1,background:'rgba(15,23,42,.4)',backdropFilter:'blur(4px)' }} onClick={onClose}/>
      <div style={{ width:'100%',maxWidth:'460px',background:T.surface,height:'100%',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'-20px 0 60px rgba(0,0,0,.15)',animation:'slideLeft .28s ease' }}>
        <div style={{ padding:'18px 22px',borderBottom:`1px solid ${T.borderLight}`,flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px' }}>
            <button onClick={onClose} style={{ display:'flex',alignItems:'center',gap:'5px',background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:T.textSub,padding:0,fontFamily:T.fontBody }}><ArrowLeft size={13}/> Tutup</button>
            <div style={{ display:'flex',gap:6 }}>
            <button onClick={onEdit} className="du-btn-ghost" style={{ padding:'6px 11px', fontSize:'12px' }}><Edit2 size={11}/> Edit</button>
            <button onClick={onInviteAdmin} className="du-btn-primary" style={{ padding:'6px 11px',fontSize:'12px',display:'flex',alignItems:'center',gap:4 }}><UserPlus size={11}/> Undang Admin</button>
          </div>
          </div>
          <div style={{ display:'flex',gap:'13px',alignItems:'flex-start' }}>
            <div style={{ width:'46px',height:'46px',borderRadius:'13px',background:T.brandLight,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.fontDisplay,fontWeight:'700',fontSize:'17px',color:T.brand,flexShrink:0 }}>{school.name.charAt(0).toUpperCase()}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <h2 style={{ fontFamily:T.fontDisplay,fontSize:'15px',fontWeight:'700',color:T.text,margin:'0 0 6px',lineHeight:1.3 }}>{school.name}</h2>
              <div style={{ display:'flex',gap:'6px',flexWrap:'wrap' }}>
                <TierBadge tier={school.subscription_tier}/><StatusBadge status={school.subscription_status}/>
                <Badge label={school.school_type} color={T.textMuted} bg={T.surfaceAlt}/>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex',borderBottom:`1px solid ${T.borderLight}`,flexShrink:0 }}>
          {[{key:'overview',label:'Overview'},{key:'users',label:`Pengguna (${profiles.length})`}].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1,padding:'11px',border:'none',background:'none',fontSize:'13px',fontWeight:'600',color:tab===t.key?T.brand:T.textMuted,borderBottom:`2px solid ${tab===t.key?T.brand:'transparent'}`,cursor:'pointer',fontFamily:T.fontBody }}>{t.label}</button>
          ))}
        </div>
        <div style={{ overflowY:'auto',flex:1,padding:'14px 22px' }}>
          {tab==='overview' && (
            <div style={{ display:'flex',flexDirection:'column',gap:'13px' }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'9px' }}>
                {[
                  { label:'Guru',     value:`${teachers.length} / ${school.max_teachers}`, icon:Users,    color:T.blue,  bg:T.blueLight },
                  { label:'Siswa',    value:`${students.length} / ${school.max_students}`, icon:Users,    color:T.green, bg:T.greenLight },
                  { label:'Admin',    value:admins.length,                                  icon:Shield,   color:T.brand, bg:T.brandLight },
                  { label:'Sisa Hari',value:days!==null?(days<0?`${Math.abs(days)}h lalu`:`${days}h`):'—', icon:Calendar, color:days!==null&&days<14?T.red:T.amber, bg:days!==null&&days<14?T.redLight:T.amberLight },
                ].map(c=>(
                  <div key={c.label} style={{ background:T.surfaceAlt,borderRadius:T.rMd,padding:'13px',display:'flex',gap:'10px',alignItems:'flex-start',border:`1px solid ${T.borderLight}` }}>
                    <div style={{ width:'26px',height:'26px',borderRadius:'7px',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><c.icon size={12} style={{color:c.color}}/></div>
                    <div><div style={{fontSize:'11px',color:T.textMuted,fontWeight:'600',fontFamily:T.fontBody}}>{c.label}</div><div style={{fontFamily:T.fontDisplay,fontSize:'14px',fontWeight:'700',color:T.text}}>{c.value}</div></div>
                  </div>
                ))}
              </div>
              {[{label:'Kapasitas Guru',current:teachers.length,max:school.max_teachers,color:T.blue},{label:'Kapasitas Siswa',current:students.length,max:school.max_students,color:T.green}].map(b=>(
                <div key={b.label} style={{ background:T.surfaceAlt,borderRadius:T.rMd,padding:'13px',border:`1px solid ${T.borderLight}` }}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                    <span style={{fontSize:'12px',color:T.textMuted,fontWeight:'600',fontFamily:T.fontBody}}>{b.label}</span>
                    <span style={{fontSize:'12px',fontFamily:T.fontDisplay,fontWeight:'700',color:T.text}}>{b.current} / {b.max}</span>
                  </div>
                  <div style={{height:'5px',borderRadius:'99px',background:T.border,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:'99px',background:b.current/b.max>0.85?T.red:b.color,width:`${Math.min(100,(b.current/b.max)*100)}%`,transition:'width .7s ease'}}/>
                  </div>
                </div>
              ))}
              <div style={{ background:T.surfaceAlt,borderRadius:T.rMd,padding:'13px',border:`1px solid ${T.borderLight}` }}>
                {[{label:'Email',value:school.email||'—'},{label:'Telepon',value:school.phone||'—'},{label:'Alamat',value:school.address||'—'},{label:'Bergabung',value:fmtDate(school.created_at)},{label:'Tipe',value:school.school_type}].map((row,i,arr)=>(
                  <div key={row.label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<arr.length-1?`1px solid ${T.borderLight}`:'none',gap:'12px'}}>
                    <span style={{fontSize:'12px',color:T.textMuted,fontWeight:'600',flexShrink:0,fontFamily:T.fontBody}}>{row.label}</span>
                    <span style={{fontSize:'13px',color:T.text,textAlign:'right',wordBreak:'break-all',fontFamily:T.fontBody}}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab==='users' && (
            <div style={{ display:'flex',flexDirection:'column',gap:'7px' }}>
              {pLoading ? Array.from({length:5}).map((_,i)=>(
                <div key={i} style={{padding:'11px',background:T.surfaceAlt,borderRadius:T.rSm,display:'flex',gap:'10px',border:`1px solid ${T.borderLight}`}}>
                  <Shimmer w="34px" h={34} r={8}/><div style={{flex:1,display:'flex',flexDirection:'column',gap:'6px'}}><Shimmer h={12}/><Shimmer w="60%" h={11}/></div>
                </div>
              )) : profiles.length===0
                ? <div style={{padding:'40px 20px',textAlign:'center',color:T.textMuted,fontSize:'13px',fontFamily:T.fontBody}}>Belum ada pengguna</div>
                : profiles.map(p=>{
                  const rm=ROLE_META[p.role]||{label:p.role,bg:T.surfaceAlt,color:T.textMuted};
                  return (
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:'11px',padding:'11px',background:T.surfaceAlt,borderRadius:T.rSm,border:`1px solid ${T.borderLight}`}}>
                      <div style={{width:'34px',height:'34px',borderRadius:'9px',background:rm.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.fontDisplay,fontWeight:'700',fontSize:'13px',color:rm.color,flexShrink:0}}>{p.name?.charAt(0)||'?'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'13px',fontWeight:'600',color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:T.fontBody}}>{p.name}</div>
                        <div style={{fontSize:'11px',color:T.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:T.fontBody}}>{p.email||p.nis||'—'}</div>
                      </div>
                      <Badge label={rm.label} color={rm.color} bg={rm.bg}/>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const [schools,      setSchools]      = useState([]);
  const [profiles,     setProfiles]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier,   setFilterTier]   = useState('all');
  const [modal,        setModal]        = useState(false);
  const [editSch,      setEditSch]      = useState(null);
  const [drawer,       setDrawer]       = useState(null);
  const [inviteModal,  setInviteModal]  = useState(null);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const fetchData = useCallback(async () => {
    try {
      const [schoolsRes, profilesRes] = await Promise.all([
        supabase.from('schools').select('*').order('created_at',{ascending:false}),
        supabase.from('profiles').select('school_id, role'),
      ]);
      if (schoolsRes.error) throw schoolsRes.error;
      const countMap = {};
      (profilesRes.data||[]).forEach(p => { if (!p.school_id) return; if (!countMap[p.school_id]) countMap[p.school_id]={student:0,teacher:0,school_admin:0}; countMap[p.school_id][p.role]=(countMap[p.school_id][p.role]||0)+1; });
      setSchools((schoolsRes.data||[]).map(s=>({...s,_counts:countMap[s.id]||{student:0,teacher:0,school_admin:0}})));
      setProfiles(profilesRes.data||[]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    total:         schools.length,
    active:        schools.filter(s=>s.subscription_status==='active').length,
    trial:         schools.filter(s=>s.subscription_status==='trial').length,
    suspended:     schools.filter(s=>['suspended','expired'].includes(s.subscription_status)).length,
    totalStudents: profiles.filter(p=>p.role==='student').length,
    totalTeachers: profiles.filter(p=>p.role==='teacher').length,
  };

  const filtered = schools.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus==='all' || s.subscription_status===filterStatus || (filterStatus==='problem' && ['suspended','expired'].includes(s.subscription_status));
    const matchTier   = filterTier==='all'   || s.subscription_tier===filterTier;
    return matchSearch && matchStatus && matchTier;
  });

  const daysDiff = (d) => d ? Math.ceil((new Date(d)-new Date())/(1000*60*60*24)) : null;

  return (
    <>
      <DashboardStyles />
      <style>{`
        @keyframes slideLeft { from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);} }
        @keyframes scaleIn  { from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);} }
        @keyframes spin     { to{transform:rotate(360deg);} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        .sa-row:hover { background: #FAFBFF !important; cursor: pointer; }
      `}</style>

      <div style={{ fontFamily:T.fontBody, display:'flex', flexDirection:'column', gap:'20px' }}>

        <PageHeader
          actions={<>
            <RefreshButton Icon={RefreshCw} loading={refreshing} onClick={()=>{setRefreshing(true);fetchData();}} />
            <button onClick={()=>{setEditSch(null);setModal(true);}} className="du-btn-primary"><Plus size={13}/>Tambah Sekolah</button>
          </>}
        >
          <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px' }}>
            <IconBox size={30} r={8} bg={T.brandLight} color={T.brand} icon={Crown} iconSize={14}/>
            <h1 style={{ fontFamily:T.fontDisplay,fontSize:'20px',fontWeight:'700',color:T.text,margin:0,letterSpacing:'-0.02em' }}>Super Admin</h1>
          </div>
          <p style={{ fontSize:'13px',color:T.textSub,margin:0,fontFamily:T.fontBody }}>Pantau dan kelola seluruh ekosistem sekolah ZiDu</p>
        </PageHeader>

        {error && <ErrorBanner message={error}/>}

        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(148px,1fr))',gap:'11px' }}>
          {loading ? Array.from({length:6}).map((_,i)=><StatCardSkeleton key={i}/>) : <>
            <StatCard icon={School}       label="Total Sekolah" value={stats.total}            sub="Di platform"       color={T.brand}  bg={T.brandLight}  delay={0}  />
            <StatCard icon={CheckCircle2} label="Aktif"         value={stats.active}           sub="Langganan berjalan" color={T.green}  bg={T.greenLight}  delay={40} />
            <StatCard icon={Clock}        label="Trial"          value={stats.trial}           sub="Masa percobaan"     color={T.amber}  bg={T.amberLight}  delay={80} />
            <StatCard icon={AlertCircle}  label="Bermasalah"    value={stats.suspended}        sub="Suspend/expired"   color={T.red}    bg={T.redLight}    delay={120}/>
            <StatCard icon={Users}        label="Total Siswa"   value={fmt(stats.totalStudents)} sub="Semua sekolah"   color={T.blue}   bg={T.blueLight}   delay={160}/>
            <StatCard icon={Users}        label="Total Guru"    value={fmt(stats.totalTeachers)} sub="Semua sekolah"   color={T.purple} bg={T.purpleLight} delay={200}/>
          </>}
        </div>

        {/* Filter bar */}
        <div className="du-fadein" style={{ display:'flex',gap:'9px',flexWrap:'wrap',animationDelay:'120ms' }}>
          <div style={{ position:'relative',flex:1,minWidth:'180px' }}>
            <Search size={13} style={{ position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:T.textMuted,pointerEvents:'none' }}/>
            <input type="text" placeholder="Cari nama atau email sekolah..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{ width:'100%',padding:'8px 11px 8px 30px',borderRadius:T.rSm,border:`1.5px solid ${T.border}`,background:T.surfaceAlt,fontSize:'13px',color:T.text,outline:'none',fontFamily:T.fontBody,boxSizing:'border-box' }}
              onFocus={e=>{e.target.style.borderColor=T.brand;e.target.style.boxShadow=`0 0 0 3px ${T.brandMid}`;}}
              onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow='none';}} />
          </div>
          {[
            {v:filterStatus,s:setFilterStatus,p:'Semua Status',opts:[{value:'active',label:'Aktif'},{value:'trial',label:'Trial'},{value:'problem',label:'Bermasalah'}]},
            {v:filterTier,  s:setFilterTier,  p:'Semua Paket', opts:TIERS.map(t=>({value:t,label:TIER_META[t].label}))},
          ].map((f,i)=>(
            <div key={i} style={{ position:'relative' }}>
              <select value={f.v} onChange={e=>f.s(e.target.value)} style={{ padding:'8px 28px 8px 10px',borderRadius:T.rSm,border:`1.5px solid ${T.border}`,background:T.surfaceAlt,fontSize:'13px',color:f.v!=='all'?T.text:T.textMuted,outline:'none',cursor:'pointer',fontFamily:T.fontBody,appearance:'none' }}
                onFocus={e=>{e.target.style.borderColor=T.brand;}} onBlur={e=>{e.target.style.borderColor=T.border;}}>
                <option value="all">{f.p}</option>
                {f.opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} style={{ position:'absolute',right:'8px',top:'50%',transform:'translateY(-50%)',color:T.textMuted,pointerEvents:'none' }}/>
            </div>
          ))}
          <span style={{ fontSize:'12px',color:T.textMuted,alignSelf:'center',fontFamily:T.fontBody }}>{filtered.length} sekolah</span>
        </div>

        {/* Table */}
        <div className="du-fadein" style={{ background:T.surface,borderRadius:T.rLg,border:`1px solid ${T.borderLight}`,overflow:'hidden',boxShadow:T.shadowSm,animationDelay:'160ms' }}>
          {loading ? (
            <div style={{ padding:'14px 18px' }}>
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} style={{ padding:'13px 0',borderBottom:`1px solid ${T.borderLight}`,display:'flex',gap:'14px',alignItems:'center' }}>
                  <Shimmer w="34px" h={34} r={9}/><div style={{flex:1}}><Shimmer h={13}/></div><Shimmer w="70px" h={20} r={999}/><Shimmer w="55px" h={20} r={999}/>
                </div>
              ))}
            </div>
          ) : filtered.length===0 ? (
            <div style={{ padding:'56px 20px',textAlign:'center' }}>
              <div style={{ fontSize:'36px',marginBottom:'12px' }}>🏫</div>
              <div style={{ fontFamily:T.fontDisplay,fontSize:'15px',fontWeight:'700',color:T.text,marginBottom:'6px' }}>{search||filterStatus!=='all'||filterTier!=='all'?'Tidak ada sekolah ditemukan':'Belum ada sekolah'}</div>
              <div style={{ fontSize:'13px',color:T.textMuted,marginBottom:'18px',fontFamily:T.fontBody }}>{search||filterStatus!=='all'||filterTier!=='all'?'Coba ubah filter':'Mulai dengan menambahkan sekolah pertama'}</div>
              {!search&&filterStatus==='all'&&filterTier==='all'&&(
                <button onClick={()=>{setEditSch(null);setModal(true);}} className="du-btn-primary"><Plus size={13}/>Tambah Sekolah</button>
              )}
            </div>
          ) : (
            <>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse',minWidth:'660px' }}>
                  <thead>
                    <tr style={{ background:T.surfaceAlt,borderBottom:`1px solid ${T.borderLight}` }}>
                      {['Sekolah','Paket','Status','Guru','Siswa','Kadaluarsa',''].map(h=>(
                        <th key={h} style={{ padding:'10px 16px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:T.textMuted,letterSpacing:'0.05em',whiteSpace:'nowrap',fontFamily:T.fontBody }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s,idx)=>{
                      const days=daysDiff(s.subscription_end_date);
                      const isExpiring=days!==null&&days>0&&days<=14;
                      return (
                        <tr key={s.id} className="sa-row" onClick={()=>setDrawer(s)}
                          style={{ borderBottom:`1px solid ${T.borderLight}`,background:T.surface,transition:'background .1s',opacity:0,animation:`du-fadeUp .3s ease ${Math.min(idx,12)*25}ms forwards` }}>
                          <td style={{ padding:'13px 16px' }}>
                            <div style={{ display:'flex',alignItems:'center',gap:'11px' }}>
                              <div style={{ width:'34px',height:'34px',borderRadius:'9px',background:T.brandLight,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T.fontDisplay,fontWeight:'700',fontSize:'13px',color:T.brand,flexShrink:0 }}>{s.name.charAt(0).toUpperCase()}</div>
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontSize:'13px',fontWeight:'600',color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'190px',fontFamily:T.fontBody }}>{s.name}</div>
                                <div style={{ fontSize:'11px',color:T.textMuted,fontFamily:T.fontBody }}>{s.school_type} · {s.email||'—'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:'13px 16px' }}><TierBadge tier={s.subscription_tier}/></td>
                          <td style={{ padding:'13px 16px' }}><StatusBadge status={s.subscription_status}/></td>
                          <td style={{ padding:'13px 16px' }}>
                            <span style={{ fontFamily:T.fontDisplay,fontSize:'13px',fontWeight:'700',color:T.text }}>{s._counts.teacher}</span>
                            <span style={{ fontSize:'11px',color:T.textMuted }}> / {s.max_teachers}</span>
                          </td>
                          <td style={{ padding:'13px 16px' }}>
                            <div style={{ display:'flex',alignItems:'center',gap:'7px' }}>
                              <span style={{ fontFamily:T.fontDisplay,fontSize:'13px',fontWeight:'700',color:T.text }}>{s._counts.student}</span>
                              <span style={{ fontSize:'11px',color:T.textMuted }}>/ {s.max_students}</span>
                              <div style={{ width:'36px',height:'3px',borderRadius:'99px',background:T.borderLight,overflow:'hidden' }}>
                                <div style={{ height:'100%',borderRadius:'99px',background:s._counts.student/s.max_students>0.85?T.red:T.brand,width:`${Math.min(100,(s._counts.student/s.max_students)*100)}%` }}/>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:'13px 16px' }}>
                            <span style={{ fontSize:'12px',fontWeight:'600',color:days===null?T.textMuted:days<0?T.red:isExpiring?T.amber:T.textSub,fontFamily:T.fontBody }}>
                              {days===null?'—':days<0?`${Math.abs(days)}h lalu`:isExpiring?`⚠ ${days}h`:`${days}h`}
                            </span>
                          </td>
                          <td style={{ padding:'13px 16px' }} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>{setEditSch(s);setModal(true);}}
                              style={{ width:'26px',height:'26px',borderRadius:'7px',border:`1px solid ${T.borderLight}`,background:T.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:T.textMuted,transition:'background .12s,color .12s' }}
                              onMouseEnter={e=>{e.currentTarget.style.background=T.brandLight;e.currentTarget.style.color=T.brand;}}
                              onMouseLeave={e=>{e.currentTarget.style.background=T.surfaceAlt;e.currentTarget.style.color=T.textMuted;}}>
                              <Edit2 size={12}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:'9px 16px',borderTop:`1px solid ${T.borderLight}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:'12px',color:T.textMuted,fontFamily:T.fontBody }}>Menampilkan {filtered.length} dari {schools.length} sekolah</span>
                <span style={{ fontSize:'11px',color:T.border,display:'flex',alignItems:'center',gap:'4px',fontFamily:T.fontBody }}><Zap size={10} style={{color:T.brand}}/> Real-time</span>
              </div>
            </>
          )}
        </div>
      </div>

      <SchoolModal open={modal} school={editSch} onClose={()=>{setModal(false);setEditSch(null);}} onSaved={()=>{fetchData();showToast(editSch?'Sekolah diperbarui':'Sekolah berhasil ditambahkan');}} />
      {drawer && <SchoolDrawer school={drawer} onClose={()=>setDrawer(null)} onEdit={()=>{setEditSch(drawer);setDrawer(null);setModal(true);}} onInviteAdmin={()=>setInviteModal(drawer)} />}
      {inviteModal && <InviteAdminModal school={inviteModal} createdBy={null} onClose={()=>setInviteModal(null)} />}

      {toast && (
        <div style={{ position:'fixed',bottom:'22px',right:'22px',zIndex:300,display:'flex',alignItems:'center',gap:'9px',padding:'12px 16px',borderRadius:T.rMd,background:toast.type==='error'?T.red:T.text,color:'#fff',fontSize:'13px',fontWeight:'500',boxShadow:'0 8px 30px rgba(0,0,0,.2)',fontFamily:T.fontBody,animation:'slideUp .22s ease' }}>
          {toast.type==='error'?<AlertCircle size={14}/>:<CheckCircle2 size={14} style={{color:'#4ADE80'}}/>}{toast.msg}
        </div>
      )}
    </>
  );
};

export default SuperAdminDashboard;
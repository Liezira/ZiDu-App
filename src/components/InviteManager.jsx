/**
 * InviteManager.jsx
 * Komponen lengkap untuk generate, lihat, dan nonaktifkan invite links.
 * Bisa dipanggil dari ClassManagement, StaffManagement, atau halaman guru.
 *
 * Usage:
 *   <InviteManager
 *     profile={profile}          // profile guru/admin dari AuthContext
 *     classId="uuid"             // opsional — jika dari dalam kelas
 *     className="X IPA 1"        // opsional
 *     defaultRole="student"      // 'student' | 'teacher'
 *     trigger={<button>...</button>}  // opsional — custom trigger
 *   />
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  createInviteLink, getInvitesBySchool, getInvitesByClass,
  deactivateInvite, buildInviteUrl, isExpired, isQuotaFull,
} from '../../services/inviteService';
import {
  Link2, Copy, Check, Plus, X, RefreshCw,
  Clock, Users, GraduationCap, BookOpen,
  AlertCircle, CheckCircle2, Trash2, ChevronDown,
  ExternalLink, School,
} from 'lucide-react';

// ─── Atoms ────────────────────────────────────────────────────────
const Btn = ({ children, variant = 'primary', icon: Icon, loading, sm, ...props }) => {
  const S = {
    primary:   ['#4F46E5','#fff','#4F46E5','#4338CA'],
    secondary: ['#fff','#374151','#E2E8F0','#F1F5F9'],
    danger:    ['#DC2626','#fff','#DC2626','#B91C1C'],
    ghost:     ['transparent','#64748B','transparent','#F1F5F9'],
  };
  const [bg, color, border, hbg] = S[variant] || S.primary;
  return (
    <button {...props} disabled={loading || props.disabled}
      style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding: sm ? '6px 12px':'9px 16px', borderRadius:'9px', fontSize: sm ? '12px':'13px', fontWeight:'600', cursor: loading||props.disabled ? 'not-allowed':'pointer', opacity: loading||props.disabled ? 0.6:1, background:bg, color, border:`1.5px solid ${border}`, fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all .15s', whiteSpace:'nowrap', ...props.style }}
      onMouseEnter={e=>{ if(!loading&&!props.disabled) e.currentTarget.style.background=hbg; }}
      onMouseLeave={e=>{ e.currentTarget.style.background=bg; }}>
      {loading ? <div style={{ width:'13px',height:'13px',border:'2px solid rgba(255,255,255,.3)',borderTopColor:color,borderRadius:'50%',animation:'spin .7s linear infinite' }} /> : Icon && <Icon size={sm?12:14}/>}
      {children}
    </button>
  );
};

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy}
      style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 10px', borderRadius:'7px', border:`1.5px solid ${copied ? '#A7F3D0':'#E2E8F0'}`, background: copied ? '#F0FDF4':'#F8FAFC', color: copied ? '#059669':'#4F46E5', fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      {copied ? <><Check size={11}/> Tersalin!</> : <><Copy size={11}/> Salin Link</>}
    </button>
  );
};

const RoleBadge = ({ role }) => {
  const M = {
    student: { label:'Siswa',   bg:'#FFFBEB', color:'#D97706', border:'#FDE68A', Icon: GraduationCap },
    teacher: { label:'Guru',    bg:'#ECFDF5', color:'#059669', border:'#A7F3D0', Icon: BookOpen },
  };
  const m = M[role] || M.student;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'700', background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>
      <m.Icon size={10}/>{m.label}
    </span>
  );
};

function statusOf(inv) {
  if (!inv.is_active) return { label:'Nonaktif', color:'#DC2626', bg:'#FEF2F2' };
  if (isExpired(inv))  return { label:'Kadaluarsa', color:'#D97706', bg:'#FFFBEB' };
  if (isQuotaFull(inv)) return { label:'Kuota Penuh', color:'#7C3AED', bg:'#F5F3FF' };
  return { label:'Aktif', color:'#059669', bg:'#F0FDF4' };
}

// ─── Create Invite Form ───────────────────────────────────────────
const CreateForm = ({ profile, classId, className, defaultRole, onCreated }) => {
  const [role, setRole]       = useState(defaultRole || 'student');
  const [maxUses, setMaxUses] = useState(100);
  const [label, setLabel]     = useState(className ? `Link ${className}` : '');
  const [days, setDays]       = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const token = await createInviteLink({
        schoolId:   profile.school_id,
        createdBy:  profile.id,
        targetRole: role,
        classId:    classId || null,
        className:  className || null,
        label:      label.trim() || null,
        maxUses,
      });
      onCreated({ token, role, label, classId, className });
    } catch (err) {
      setError(err.message || 'Gagal membuat link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      {/* Role */}
      <div>
        <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'7px', display:'block' }}>Tipe Undangan</label>
        <div style={{ display:'flex', gap:'8px' }}>
          {['student','teacher'].map(r => {
            const M = { student:{ label:'Siswa', Icon:GraduationCap }, teacher:{ label:'Guru', Icon:BookOpen } };
            const m = M[r];
            const active = role === r;
            return (
              <button key={r} type="button" onClick={() => setRole(r)}
                style={{ flex:1, display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', borderRadius:'10px', border:`2px solid ${active ? '#4F46E5':'#E2E8F0'}`, background: active ? '#EEF2FF':'#F8FAFC', cursor:'pointer', transition:'all .15s' }}>
                <m.Icon size={15} style={{ color: active ? '#4F46E5':'#94A3B8' }} />
                <span style={{ fontSize:'13px', fontWeight:'600', color: active ? '#4F46E5':'#64748B' }}>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Label */}
      <div>
        <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'5px', display:'block' }}>
          Label Link <span style={{ color:'#94A3B8', fontWeight:'400' }}>(opsional)</span>
        </label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Contoh: Link Kelas X IPA 1 - 2026"
          style={{ width:'100%', padding:'9px 12px', borderRadius:'9px', fontSize:'13px', border:'1.5px solid #E2E8F0', background:'#F8FAFC', color:'#0F172A', outline:'none', boxSizing:'border-box', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'border-color .15s' }}
          onFocus={e=>{ e.target.style.borderColor='#4F46E5'; e.target.style.boxShadow='0 0 0 3px rgba(79,70,229,.1)'; }}
          onBlur={e=>{ e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; }} />
      </div>

      {/* Max uses + Expiry */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
        <div>
          <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'5px', display:'block' }}>Kuota Siswa</label>
          <select value={maxUses} onChange={e => setMaxUses(Number(e.target.value))}
            style={{ width:'100%', padding:'9px 28px 9px 10px', borderRadius:'9px', fontSize:'13px', border:'1.5px solid #E2E8F0', background:'#F8FAFC', color:'#0F172A', outline:'none', appearance:'none', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {[10,20,30,50,100,200,0].map(v => <option key={v} value={v}>{v === 0 ? 'Tak terbatas' : `${v} siswa`}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:'12px', fontWeight:'600', color:'#374151', marginBottom:'5px', display:'block' }}>Masa Berlaku</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            style={{ width:'100%', padding:'9px 28px 9px 10px', borderRadius:'9px', fontSize:'13px', border:'1.5px solid #E2E8F0', background:'#F8FAFC', color:'#0F172A', outline:'none', appearance:'none', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {[1,3,7,14,30].map(d => <option key={d} value={d}>{d === 1 ? '1 hari' : `${d} hari`}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding:'10px 12px', borderRadius:'9px', background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
          <AlertCircle size={14}/>{error}
        </div>
      )}

      <Btn icon={Plus} loading={loading} onClick={handleCreate}>Buat Link Undangan</Btn>
    </div>
  );
};

// ─── Invite Row ───────────────────────────────────────────────────
const InviteRow = ({ inv, onDeactivate }) => {
  const st = statusOf(inv);
  const url = buildInviteUrl(inv.token);
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async () => {
    if (!window.confirm('Nonaktifkan link ini? Siswa yang belum daftar tidak bisa pakai link ini lagi.')) return;
    setDeactivating(true);
    try { await deactivateInvite(inv.id); onDeactivate(inv.id); }
    catch { alert('Gagal menonaktifkan link.'); }
    finally { setDeactivating(false); }
  };

  return (
    <div style={{ padding:'14px 16px', border:'1px solid #F1F5F9', borderRadius:'12px', background:'#fff', display:'flex', flexDirection:'column', gap:'10px' }}>
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
            <span style={{ fontSize:'13px', fontWeight:'600', color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'200px' }}>
              {inv.label || (inv.class_name ? `Link ${inv.class_name}` : 'Link Undangan')}
            </span>
            <RoleBadge role={inv.target_role} />
            <span style={{ fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'999px', background:st.bg, color:st.color }}>{st.label}</span>
          </div>
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            {inv.class_name && (
              <span style={{ fontSize:'11px', color:'#94A3B8', display:'flex', alignItems:'center', gap:'3px' }}>
                <School size={10}/>{inv.class_name}
              </span>
            )}
            <span style={{ fontSize:'11px', color:'#94A3B8', display:'flex', alignItems:'center', gap:'3px' }}>
              <Users size={10}/>
              {inv.use_count}{inv.max_uses > 0 ? `/${inv.max_uses}` : ''} terpakai
            </span>
            <span style={{ fontSize:'11px', color:'#94A3B8', display:'flex', alignItems:'center', gap:'3px' }}>
              <Clock size={10}/>
              {isExpired(inv) ? 'Kadaluarsa' : `Berlaku sampai ${new Date(inv.expires_at).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}`}
            </span>
          </div>
        </div>
        {/* Actions */}
        {inv.is_active && !isExpired(inv) && !isQuotaFull(inv) && (
          <Btn variant="danger" icon={Trash2} sm loading={deactivating} onClick={handleDeactivate}>
            Nonaktifkan
          </Btn>
        )}
      </div>

      {/* URL + copy */}
      {inv.is_active && !isExpired(inv) && !isQuotaFull(inv) && (
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 12px', background:'#F8FAFC', borderRadius:'9px', border:'1px solid #F1F5F9' }}>
          <ExternalLink size={12} style={{ color:'#94A3B8', flexShrink:0 }} />
          <span style={{ flex:1, fontSize:'11px', color:'#64748B', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{url}</span>
          <CopyBtn text={url} />
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────
const InviteManagerModal = ({ profile, classId, className, defaultRole, onClose }) => {
  const [tab, setTab]           = useState('create'); // 'create' | 'list'
  const [invites, setInvites]   = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [newLink, setNewLink]   = useState(null); // link baru yang baru dibuat

  const loadInvites = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = classId
        ? await getInvitesByClass(classId)
        : await getInvitesBySchool(profile.school_id);
      setInvites(data);
    } catch { /* silent */ }
    finally { setLoadingList(false); }
  }, [classId, profile.school_id]);

  useEffect(() => {
    if (tab === 'list') loadInvites();
  }, [tab, loadInvites]);

  const handleCreated = (info) => {
    const url = buildInviteUrl(info.token);
    setNewLink({ url, ...info });
    setTab('created');
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.6)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:'20px', width:'100%', maxWidth:'500px', maxHeight:'88vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 30px 80px rgba(0,0,0,.25)', animation:'scaleIn .2s ease' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
            <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Link2 size={16} style={{ color:'#4F46E5' }} />
            </div>
            <div>
              <h2 style={{ fontFamily:'Sora,sans-serif', fontSize:'15px', fontWeight:'700', color:'#0F172A', margin:0 }}>
                Link Undangan
              </h2>
              {className && <p style={{ fontSize:'11px', color:'#94A3B8', margin:0 }}>{className}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ width:'28px', height:'28px', borderRadius:'8px', border:'1px solid #F1F5F9', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94A3B8' }}><X size={14}/></button>
        </div>

        {/* Tabs */}
        {tab !== 'created' && (
          <div style={{ display:'flex', gap:'2px', padding:'10px 22px 0', borderBottom:'1px solid #F1F5F9', flexShrink:0 }}>
            {[{key:'create',label:'Buat Link'},{key:'list',label:'Riwayat Link'}].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding:'8px 16px', borderRadius:'8px 8px 0 0', fontSize:'13px', fontWeight:'600', border:'none', cursor:'pointer', background:'none', color: tab===t.key ? '#4F46E5':'#94A3B8', borderBottom: tab===t.key ? '2px solid #4F46E5':'2px solid transparent', transition:'all .15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding:'20px 22px', overflowY:'auto', flex:1 }}>

          {/* Tab: Create */}
          {tab === 'create' && (
            <CreateForm
              profile={profile}
              classId={classId}
              className={className}
              defaultRole={defaultRole}
              onCreated={handleCreated}
            />
          )}

          {/* Tab: Created (result) */}
          {tab === 'created' && newLink && (
            <div style={{ textAlign:'center' }}>
              <div style={{ width:'52px', height:'52px', borderRadius:'50%', background:'#F0FDF4', border:'2px solid #A7F3D0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <CheckCircle2 size={24} color="#10B981" />
              </div>
              <h3 style={{ fontFamily:'Sora,sans-serif', fontSize:'16px', fontWeight:'700', color:'#0F172A', marginBottom:'6px' }}>
                Link Siap Dibagikan!
              </h3>
              <p style={{ fontSize:'12.5px', color:'#64748B', lineHeight:1.65, marginBottom:'16px' }}>
                {newLink.role === 'student' ? 'Bagikan ke siswa' : 'Bagikan ke guru'} via WhatsApp, grup kelas, atau email.
                <br/>Link berlaku selama <strong>7 hari</strong>.
              </p>

              {/* URL box */}
              <div style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'12px', padding:'14px 16px', marginBottom:'14px', textAlign:'left' }}>
                <p style={{ fontSize:'10px', fontWeight:'700', color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'6px' }}>Link Undangan</p>
                <p style={{ fontSize:'12px', color:'#374151', fontFamily:'monospace', wordBreak:'break-all', lineHeight:1.6, marginBottom:'10px' }}>{newLink.url}</p>
                <CopyBtn text={newLink.url} />
              </div>

              {/* Share hint */}
              <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'10px', padding:'10px 14px', textAlign:'left', marginBottom:'16px' }}>
                <p style={{ fontSize:'12px', color:'#92400E', fontWeight:'600', marginBottom:'4px' }}>💡 Tips Berbagi</p>
                <p style={{ fontSize:'11.5px', color:'#B45309', lineHeight:1.6 }}>
                  Tempel link ini ke grup WhatsApp kelas atau kirim langsung ke siswa.
                  Siswa hanya perlu klik → isi nama, NIS, email, password → selesai!
                </p>
              </div>

              <div style={{ display:'flex', gap:'8px' }}>
                <Btn variant="secondary" style={{ flex:1 }} onClick={() => { setNewLink(null); setTab('create'); }}>Buat Link Lain</Btn>
                <Btn style={{ flex:1 }} onClick={() => { loadInvites(); setTab('list'); }}>Lihat Semua Link</Btn>
              </div>
            </div>
          )}

          {/* Tab: List */}
          {tab === 'list' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                <span style={{ fontSize:'13px', color:'#64748B' }}>{invites.length} link ditemukan</span>
                <Btn variant="ghost" icon={RefreshCw} sm loading={loadingList} onClick={loadInvites}>Refresh</Btn>
              </div>
              {loadingList ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[1,2].map(i => <div key={i} style={{ height:'80px', borderRadius:'12px', background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize:'800px 100%', animation:'shimmer 1.2s infinite' }} />)}
                </div>
              ) : invites.length === 0 ? (
                <div style={{ padding:'40px 20px', textAlign:'center', border:'1px solid #F1F5F9', borderRadius:'12px' }}>
                  <Link2 size={28} style={{ color:'#CBD5E1', margin:'0 auto 10px', display:'block' }} />
                  <p style={{ fontSize:'13px', fontWeight:'600', color:'#0F172A', marginBottom:'4px' }}>Belum ada link</p>
                  <p style={{ fontSize:'12px', color:'#94A3B8' }}>Buat link undangan pertama untuk kelas ini</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {invites.map(inv => (
                    <InviteRow key={inv.id} inv={inv} onDeactivate={id => setInvites(prev => prev.filter(i => i.id !== id))} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Public export — wrapper dengan trigger button ────────────────
const InviteManager = ({
  profile,
  classId = null,
  className = null,
  defaultRole = 'student',
  trigger,
}) => {
  const [open, setOpen] = useState(false);

  const defaultTrigger = (
    <button
      onClick={() => setOpen(true)}
      style={{ display:'inline-flex', alignItems:'center', gap:'7px', padding:'8px 14px', borderRadius:'9px', border:'1.5px solid #C7D2FE', background:'#EEF2FF', color:'#4F46E5', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", transition:'all .15s' }}
      onMouseEnter={e=>{ e.currentTarget.style.background='#E0E7FF'; }}
      onMouseLeave={e=>{ e.currentTarget.style.background='#EEF2FF'; }}>
      <Link2 size={14}/> Bagikan Link Daftar
    </button>
  );

  return (
    <>
      <style>{`
        @keyframes scaleIn  { from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);} }
        @keyframes shimmer  { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes spin     { to{transform:rotate(360deg);} }
      `}</style>
      <div onClick={() => setOpen(true)} style={{ display:'contents' }}>
        {trigger || defaultTrigger}
      </div>
      {open && (
        <InviteManagerModal
          profile={profile}
          classId={classId}
          className={className}
          defaultRole={defaultRole}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

export default InviteManager;
export { InviteManagerModal };
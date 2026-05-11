import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Megaphone, Plus, RefreshCw, AlertCircle, Pin, Bell, Trash2, Clock, ExternalLink, X } from 'lucide-react';
import { ANN_TYPES, TARGET_LABELS, fmtAgo, fmtDate } from '../../lib/announcementUtils';

const T = {
  bg:'#f4f3f0',surface:'#ffffff',surface2:'#f9f8f5',
  border:'#ddd9d2',border2:'#c5c2bc',
  text1:'#1a1c26',text2:'#4a4c5e',text3:'#9a9790',
  indigo:'#6366f1',indigoBg:'#ede9ff',
  amber:'#f59e0b',amberD:'#d97706',amberBg:'#FAEEDA',
  red:'#E24B4A',redBg:'#FCEBEB',
  green:'#1D9E75',greenBg:'#E1F5EE',
  mono:'JetBrains Mono, monospace',
};

const Sk = ({ h=12, w='100%', r=4 }) => (
  <div style={{ height:h, width:w, borderRadius:r, background:'#ede9e2', animation:'zdSk 1.4s ease infinite' }} />
);

const PRIO = {
  urgent:   { bar:'#E24B4A', dot:'#E24B4A', bg:'#FCEBEB', color:'#A32D2D', label:'Urgensi' },
  important:{ bar:'#f59e0b', dot:'#f59e0b', bg:'#FAEEDA', color:'#854F0B', label:'Penting'  },
  info:     { bar:'#ddd9d2', dot:'#c5c2bc', bg:'#f9f8f5', color:'#9a9790', label:'Reguler'  },
};
const getPrio = (type) => {
  if (!type) return PRIO.info;
  if (type === 'urgent') return PRIO.urgent;
  const t = ANN_TYPES?.[type] || {};
  if (t.priority === 'high') return PRIO.urgent;
  if (t.priority === 'med')  return PRIO.important;
  return PRIO.info;
};

// ── Announcement card ────────────────────────────────────────────
const AnnCard = ({ ann, onEdit, onDelete, onTogglePin }) => {
  const [hov, setHov] = useState(false);
  const prio = getPrio(ann.type);
  const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: hov ? T.surface2 : T.surface,
      border: `0.5px solid ${ann.is_pinned ? '#b8b4f7' : T.border}`,
      borderLeft: `3px solid ${prio.bar}`,
      borderRadius:'6px', padding:'10px 12px',
      opacity: isExpired ? .65 : 1,
      transition:'background .12s',
    }}>
      {/* Priority dot + label */}
      <div style={{ display:'flex', alignItems:'center', gap:'5px', marginBottom:'4px' }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:prio.dot, flexShrink:0 }} />
        <span style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
          letterSpacing:'.07em', textTransform:'uppercase', color:prio.color }}>
          {prio.label}
        </span>
        {ann.is_pinned && (
          <span style={{ marginLeft:'4px', fontSize:'9px', fontFamily:T.mono,
            color:T.indigo, fontWeight:'600' }}>· PIN</span>
        )}
        {isExpired && (
          <span style={{ marginLeft:'4px', fontSize:'9px', fontFamily:T.mono,
            color:T.red, fontWeight:'600' }}>· KEDALUWARSA</span>
        )}
      </div>

      <div style={{ fontSize:'12px', fontWeight:'500', color:T.text1, marginBottom:'3px' }}>
        {ann.title}
      </div>
      <div style={{ fontSize:'11px', color:T.text3, fontFamily:T.mono, marginBottom:'5px' }}>
        {ann.target === 'class' && ann.classes?.name ? ann.classes.name : (TARGET_LABELS?.[ann.target] || 'Semua')}
        {' · '}{fmtAgo?.(ann.created_at) || ann.created_at?.slice(0,10)}
        {' · oleh '}{ann.profiles?.name || '—'}
      </div>
      <div style={{ fontSize:'11px', color:T.text2, lineHeight:1.5, marginBottom:'6px',
        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
        {ann.body}
      </div>

      {ann.link_url && (
        <a href={ann.link_url} target="_blank" rel="noopener noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:'4px',
            fontSize:'10px', color:T.indigo, fontWeight:'500', textDecoration:'none',
            marginBottom:'6px' }}>
          <ExternalLink size={10} />{ann.link_label || 'Lihat detail'}
        </a>
      )}

      <div style={{ display:'flex', gap:'5px', justifyContent:'flex-end' }}>
        <button onClick={() => onTogglePin(ann)} style={{
          fontSize:'9px', padding:'2px 8px', borderRadius:'4px', cursor:'pointer',
          border:`0.5px solid ${ann.is_pinned ? T.indigo : T.border}`,
          background: ann.is_pinned ? T.indigoBg : 'transparent',
          color: ann.is_pinned ? T.indigo : T.text3, fontFamily:T.mono, fontWeight:'500',
        }}>{ann.is_pinned ? 'Unpin' : 'Pin'}</button>
        <button onClick={() => onEdit(ann)} style={{
          fontSize:'9px', padding:'2px 8px', borderRadius:'4px', cursor:'pointer',
          border:`0.5px solid ${T.border}`, background:'transparent',
          color:T.text2, fontFamily:T.mono, fontWeight:'500',
        }}>Edit</button>
        <button onClick={() => onDelete(ann.id)} style={{
          fontSize:'9px', padding:'2px 8px', borderRadius:'4px', cursor:'pointer',
          border:`0.5px solid #F7C1C1`, background:T.redBg,
          color:T.red, fontFamily:T.mono, fontWeight:'500',
          display:'flex', alignItems:'center', gap:'3px',
        }}><Trash2 size={9} />Hapus</button>
      </div>
    </div>
  );
};

// ── Compose slide panel ──────────────────────────────────────────
const ComposePanel = ({ ann, classes, profile, onClose, onSaved }) => {
  const isEdit = !!ann?.id;
  const [form, setForm] = useState({
    title: ann?.title||'', body: ann?.body||'', type: ann?.type||'info',
    target: ann?.target||'all', target_class_id: ann?.target_class_id||'',
    link_url: ann?.link_url||'', link_label: ann?.link_label||'',
    is_pinned: ann?.is_pinned||false,
    expires_at: ann?.expires_at ? ann.expires_at.slice(0,16) : '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    if (!form.title.trim()||!form.body.trim()) { setErr('Judul dan isi wajib diisi'); return; }
    setSaving(true); setErr('');
    try {
      if (isEdit) {
        const { error } = await supabase.from('announcements').update({
          ...form, target_class_id: form.target_class_id||null,
          link_url: form.link_url||null, link_label: form.link_label||null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('id', ann.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('broadcast_announcement', {
          p_school_id: profile.school_id,
          p_title: form.title, p_body: form.body, p_type: form.type,
          p_target: form.target, p_target_class_id: form.target_class_id||null,
          p_link_url: form.link_url||null, p_link_label: form.link_label||null,
          p_is_pinned: form.is_pinned,
          p_expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        });
        if (error) throw error;
      }
      onSaved();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const inp = {
    background:T.surface, border:`0.5px solid ${T.border2}`, borderRadius:'6px',
    height:'32px', padding:'0 10px', fontSize:'12px', fontFamily:'DM Sans,sans-serif',
    color:T.text1, width:'100%', boxSizing:'border-box', outline:'none',
  };
  const PRIO_PILLS = [
    { k:'urgent',    label:'Urgensi', bg:'#FCEBEB', c:'#A32D2D' },
    { k:'important', label:'Penting', bg:'#FAEEDA', c:'#854F0B' },
    { k:'info',      label:'Reguler', bg:T.surface2, c:T.text3   },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0,
        background:'rgba(15,23,42,.35)', backdropFilter:'blur(2px)', zIndex:80 }} />
      {/* Panel */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'320px', maxWidth:'95vw',
        background:T.surface, borderLeft:`0.5px solid ${T.border}`, zIndex:90,
        display:'flex', flexDirection:'column', animation:'zdSlideIn .2s cubic-bezier(.16,1,.3,1) both' }}>
        <div style={{ padding:'14px 16px', borderBottom:`0.5px solid ${T.border}`,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ fontSize:'13px', fontWeight:'500', color:T.text1 }}>
            {isEdit ? 'Edit pengumuman' : 'Buat pengumuman'}
          </div>
          <button onClick={onClose} style={{ width:'24px', height:'24px', borderRadius:'5px',
            border:`0.5px solid ${T.border}`, background:'transparent',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:T.text3 }}><X size={12} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px',
          display:'flex', flexDirection:'column', gap:'12px' }}>

          {/* Priority pills */}
          <div>
            <div style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
              color:T.text3, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'6px' }}>
              Prioritas
            </div>
            <div style={{ display:'flex', gap:'5px' }}>
              {PRIO_PILLS.map(p => (
                <button key={p.k} onClick={() => set('type', p.k)} style={{
                  flex:1, padding:'5px 0', borderRadius:'5px', cursor:'pointer',
                  border:`0.5px solid ${form.type===p.k ? T.indigo : T.border}`,
                  background: form.type===p.k ? T.indigoBg : p.bg,
                  color: form.type===p.k ? T.indigo : p.c,
                  fontSize:'10px', fontWeight:'600', fontFamily:'DM Sans,sans-serif',
                  transition:'all .12s',
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
              color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
              display:'block', marginBottom:'4px' }}>Judul</label>
            <input value={form.title} onChange={e=>set('title',e.target.value)}
              placeholder="Judul pengumuman..." style={inp} />
          </div>

          <div>
            <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
              color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
              display:'block', marginBottom:'4px' }}>Isi pengumuman</label>
            <textarea value={form.body} onChange={e=>set('body',e.target.value)}
              rows={4} placeholder="Tulis pesan..."
              style={{ ...inp, height:'auto', padding:'8px 10px', resize:'vertical', lineHeight:1.5 }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <div>
              <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
                color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
                display:'block', marginBottom:'4px' }}>Target</label>
              <select value={form.target} onChange={e=>set('target',e.target.value)}
                style={{ ...inp, appearance:'none', cursor:'pointer' }}>
                {Object.entries(TARGET_LABELS||{ all:'Semua', teachers:'Guru', students:'Siswa', class:'Kelas' })
                  .map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {form.target==='class' && (
              <div>
                <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
                  color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
                  display:'block', marginBottom:'4px' }}>Kelas</label>
                <select value={form.target_class_id} onChange={e=>set('target_class_id',e.target.value)}
                  style={{ ...inp, appearance:'none', cursor:'pointer' }}>
                  <option value="">Pilih...</option>
                  {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'8px' }}>
            <div>
              <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
                color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
                display:'block', marginBottom:'4px' }}>Link URL</label>
              <input value={form.link_url} onChange={e=>set('link_url',e.target.value)}
                placeholder="https://..." style={inp} />
            </div>
            <div>
              <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
                color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
                display:'block', marginBottom:'4px' }}>Label</label>
              <input value={form.link_label} onChange={e=>set('link_label',e.target.value)}
                placeholder="Lihat detail" style={inp} />
            </div>
          </div>

          <div>
            <label style={{ fontSize:'9px', fontFamily:T.mono, fontWeight:'600',
              color:T.text3, letterSpacing:'.08em', textTransform:'uppercase',
              display:'block', marginBottom:'4px' }}>Kedaluwarsa (opsional)</label>
            <input type="datetime-local" value={form.expires_at}
              onChange={e=>set('expires_at',e.target.value)}
              style={{ ...inp, maxWidth:'220px' }} />
          </div>

          {/* Pin toggle */}
          <div onClick={()=>set('is_pinned',!form.is_pinned)} style={{
            display:'flex', alignItems:'center', gap:'9px',
            padding:'9px 11px', borderRadius:'6px', cursor:'pointer',
            background: form.is_pinned ? T.indigoBg : T.surface2,
            border:`0.5px solid ${form.is_pinned ? T.indigo : T.border}`,
            transition:'all .12s',
          }}>
            <Pin size={12} style={{ color: form.is_pinned ? T.indigo : T.text3 }} />
            <span style={{ flex:1, fontSize:'11px', fontWeight:'500',
              color: form.is_pinned ? T.indigo : T.text2 }}>Pin di atas</span>
            <div style={{ width:'32px', height:'18px', borderRadius:'9px',
              background: form.is_pinned ? T.indigo : T.border, position:'relative', transition:'background .2s' }}>
              <div style={{ width:'14px', height:'14px', borderRadius:'50%', background:'#fff',
                position:'absolute', top:'2px', left: form.is_pinned ? '16px' : '2px',
                transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.15)' }} />
            </div>
          </div>

          {!isEdit && (
            <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'9px 11px',
              background:'#E6F1FB', borderRadius:'6px', border:'0.5px solid #BFDBFE' }}>
              <Bell size={11} style={{ color:'#185FA5', flexShrink:0 }} />
              <span style={{ fontSize:'10px', color:'#0C447C', lineHeight:1.4 }}>
                Notifikasi otomatis ke <strong>
                  {TARGET_LABELS?.[form.target]||form.target}
                </strong>
              </span>
            </div>
          )}

          {err && (
            <div style={{ padding:'9px 11px', background:T.redBg, borderRadius:'5px',
              color:T.red, fontSize:'11px', fontFamily:T.mono }}>
              {err}
            </div>
          )}
        </div>

        <div style={{ padding:'12px 16px', borderTop:`0.5px solid ${T.border}`,
          display:'flex', gap:'7px', justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} style={{
            padding:'6px 12px', borderRadius:'5px', border:`0.5px solid ${T.border}`,
            background:'transparent', cursor:'pointer', fontSize:'12px',
            color:T.text2, fontFamily:'DM Sans,sans-serif',
          }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding:'6px 14px', borderRadius:'5px', border:'none',
            background: saving ? T.border : T.indigo,
            color:'#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize:'12px', fontWeight:'500', fontFamily:'DM Sans,sans-serif',
            display:'flex', alignItems:'center', gap:'5px',
          }}>
            {saving && <div style={{ width:'10px', height:'10px',
              border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff',
              borderRadius:'50%', animation:'spin .7s linear infinite' }} />}
            {isEdit ? 'Simpan' : 'Kirim'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Main ─────────────────────────────────────────────────────────
const SchoolAnnouncements = () => {
  const { profile } = useAuth();
  const [anns, setAnns]           = useState([]);
  const [classes, setClasses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error, setError]         = useState('');
  const [modal, setModal]         = useState(null); // null | 'create' | ann obj
  const [toast, setToast]         = useState(null);
  const [filter, setFilter]       = useState('all');

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),3000); };

  const fetchAll = useCallback(async () => {
    if (!profile?.school_id) return;
    try {
      const [annRes, classRes] = await Promise.all([
        supabase.from('announcements')
          .select('*, profiles(name, role), classes(name)')
          .eq('school_id', profile.school_id)
          .order('is_pinned', { ascending:false })
          .order('created_at', { ascending:false })
          .limit(100),
        supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name'),
      ]);
      if (annRes.error) throw annRes.error;
      setAnns(annRes.data||[]);
      setClasses(classRes.data||[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async id => {
    if (!window.confirm('Hapus pengumuman ini?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    setAnns(p => p.filter(a => a.id !== id));
    showToast('Pengumuman dihapus');
  };

  const handleTogglePin = async ann => {
    await supabase.from('announcements').update({ is_pinned:!ann.is_pinned }).eq('id', ann.id);
    setAnns(p => p.map(a => a.id===ann.id ? {...a, is_pinned:!ann.is_pinned} : a)
      .sort((a,b) => b.is_pinned - a.is_pinned || new Date(b.created_at)-new Date(a.created_at)));
  };

  const FILTER_OPTS = [
    { key:'all',    label:`Semua (${anns.length})`                     },
    { key:'pinned', label:`Pin (${anns.filter(a=>a.is_pinned).length})` },
    { key:'urgent', label:'Urgensi'                                     },
  ];

  const displayed = anns.filter(a => {
    if (filter==='all')    return true;
    if (filter==='pinned') return a.is_pinned;
    return a.type === filter;
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes zdSk { 0%,100%{opacity:.5}50%{opacity:.85} }
        @keyframes zdFU  { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        @keyframes zdSlideIn { from{transform:translateX(100%)}to{transform:translateX(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .zd-page { animation: zdFU .22s ease both; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
          zIndex:200, padding:'9px 16px', borderRadius:'6px', background:T.text1,
          color:'#fff', fontSize:'12px', fontWeight:'500', boxShadow:'0 2px 12px rgba(0,0,0,.15)',
          fontFamily:'DM Sans,sans-serif', animation:'zdFU .2s ease' }}>
          {toast}
        </div>
      )}

      <div className="zd-page" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          flexWrap:'wrap', gap:'10px' }}>
          <div>
            <h1 style={{ fontFamily:T.heading, fontSize:'18px', fontWeight:'600',
              color:T.text1, margin:'0 0 3px', letterSpacing:'-.02em' }}>
              Pengumuman
            </h1>
            <div style={{ fontSize:'9px', color:T.text3, fontFamily:T.mono,
              letterSpacing:'.07em', textTransform:'uppercase' }}>
              BROADCAST · SELURUH WARGA SEKOLAH
            </div>
          </div>
          <div style={{ display:'flex', gap:'7px' }}>
            <button onClick={()=>{setRefreshing(true);fetchAll();}} style={{
              display:'inline-flex', alignItems:'center', gap:'5px',
              padding:'6px 11px', borderRadius:'6px',
              border:`0.5px solid ${T.border2}`, background:'transparent',
              fontSize:'11px', color:T.text2, cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            }}>
              <RefreshCw size={11} style={{ animation:refreshing?'spin .7s linear infinite':'none' }} />
            </button>
            <button onClick={()=>setModal('create')} style={{
              display:'inline-flex', alignItems:'center', gap:'5px',
              padding:'6px 12px', borderRadius:'6px', border:'none',
              background:T.indigo, color:'#fff', fontSize:'12px', fontWeight:'500',
              cursor:'pointer', fontFamily:'DM Sans,sans-serif',
            }}>
              <Plus size={12} />Buat
            </button>
          </div>
        </div>

        {/* Stat chips */}
        {!loading && (
          <div style={{ display:'flex', gap:'7px', flexWrap:'wrap' }}>
            {[
              { label:`${anns.length} total`, c:T.text3 },
              { label:`${anns.filter(a=>a.is_pinned).length} pinned`, c:T.indigo },
              { label:`${anns.filter(a=>a.type==='urgent').length} urgensi`, c:T.red },
            ].map(s=>(
              <div key={s.label} style={{ padding:'3px 10px', borderRadius:'4px',
                background:T.surface2, border:`0.5px solid ${T.border}`,
                fontSize:'10px', fontFamily:T.mono, color:s.c }}>
                {s.label}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding:'10px 12px', background:T.redBg, borderRadius:'6px',
            color:T.red, fontSize:'12px', border:`0.5px solid #F7C1C1` }}>{error}</div>
        )}

        {/* Filter tabs */}
        <div style={{ display:'flex', borderBottom:`0.5px solid ${T.border}` }}>
          {FILTER_OPTS.map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)} style={{
              padding:'6px 14px', fontSize:'11px', background:'transparent',
              border:'none', borderBottom:`2px solid ${filter===f.key ? T.indigo : 'transparent'}`,
              color: filter===f.key ? T.indigo : T.text3,
              fontWeight: filter===f.key ? '500' : '400',
              cursor:'pointer', fontFamily:'DM Sans,sans-serif', marginBottom:'-.5px',
            }}>{f.label}</button>
          ))}
        </div>

        {/* List */}
        {loading
          ? Array.from({length:4}).map((_,i)=>(
              <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`,
                borderRadius:'6px', padding:'12px', display:'flex', flexDirection:'column', gap:'7px' }}>
                <Sk h={12} w="50%" /><Sk h={10} w="35%" /><Sk h={40} />
              </div>
            ))
          : displayed.length===0
          ? (
            <div style={{ border:`0.5px dashed ${T.border}`, borderRadius:'6px',
              padding:'28px', textAlign:'center' }}>
              <Megaphone size={20} style={{ color:T.border, margin:'0 auto 8px', display:'block' }} />
              <div style={{ fontSize:'11px', color:T.text3 }}>Belum ada pengumuman</div>
            </div>
          )
          : <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {displayed.map(ann=>(
                <AnnCard key={ann.id} ann={ann}
                  onEdit={setModal} onDelete={handleDelete} onTogglePin={handleTogglePin} />
              ))}
            </div>
        }
      </div>

      {modal && (
        <ComposePanel
          ann={modal==='create' ? null : modal}
          classes={classes} profile={profile}
          onClose={()=>setModal(null)}
          onSaved={()=>{ setModal(null); fetchAll(); showToast('Pengumuman berhasil dikirim!'); }}
        />
      )}
    </>
  );
};

export default SchoolAnnouncements;

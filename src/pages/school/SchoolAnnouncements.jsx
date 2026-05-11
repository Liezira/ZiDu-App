import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Megaphone, Plus, RefreshCw, AlertCircle, Users, Pin, Bell, Trash2, Clock, ExternalLink, ChevronDown, X } from 'lucide-react';
import { ANN_TYPES, TARGET_LABELS, fmtAgo, fmtDate } from '../../lib/announcementUtils';

const Shimmer = ({ h = 14, w = '100%', r = 6 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '16px 18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={16} style={{ color }} />
    </div>
    <div>
      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{label}</div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>{value ?? '—'}</div>
    </div>
  </div>
);

// ── Create Modal (School Admin version — supports all targets) ─
// ── Announcement Card ─────────────────────────────────────────
const AnnCard = ({ ann, canEdit, onEdit, onDelete, onTogglePin }) => {
  const t = ANN_TYPES[ann.type] || ANN_TYPES.info;
  const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
  return (
    <div style={{ background: '#fff', borderRadius: '14px', border: `1.5px solid ${ann.is_pinned ? '#C4B5FD' : '#F1F5F9'}`, padding: '16px 18px', boxShadow: ann.is_pinned ? '0 4px 16px rgba(124,58,237,.08)' : '0 1px 4px rgba(0,0,0,.03)', opacity: isExpired ? 0.6 : 1, position: 'relative' }}>
      {ann.is_pinned && (
        <div style={{ position: 'absolute', top: '12px', right: '14px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Pin size={10} style={{ color: '#7C3AED' }} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#7C3AED' }}>PINNED</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{t.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ padding: '1px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: t.bg, color: t.color }}>{t.label}</span>
            <span style={{ padding: '1px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', background: '#F8FAFC', color: '#64748B' }}>
              {TARGET_LABELS[ann.target]}{ann.classes?.name ? `: ${ann.classes.name}` : ''}
            </span>
            {isExpired && <span style={{ padding: '1px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: '#FEF2F2', color: '#DC2626' }}>Kedaluwarsa</span>}
          </div>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px', paddingRight: ann.is_pinned ? '80px' : 0 }}>{ann.title}</h3>
          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ann.body}</p>
          {ann.link_url && (
            <a href={ann.link_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: '#4F46E5', textDecoration: 'none', padding: '4px 10px', background: '#EFF6FF', borderRadius: '6px', marginBottom: '10px' }}>
              <ExternalLink size={11} />{ann.link_label || 'Lihat Detail'}
            </a>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} />{fmtAgo(ann.created_at)}</span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>oleh {ann.profiles?.name || '—'}</span>
              {ann.expires_at && <span style={{ fontSize: '11px', color: '#D97706' }}>Exp: {fmtDate(ann.expires_at)}</span>}
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => onTogglePin(ann)} style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', background: ann.is_pinned ? '#F5F3FF' : '#F8FAFC', fontSize: '11px', fontWeight: '600', color: ann.is_pinned ? '#7C3AED' : '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Pin size={10} />{ann.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button onClick={() => onEdit(ann)} style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '11px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => onDelete(ann.id)} style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #FECACA', background: '#FEF2F2', fontSize: '11px', fontWeight: '600', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Trash2 size={10} />Hapus
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SchoolAnnModal = ({ ann, classes, profile, onClose, onSaved }) => {
  // Re-use logic from TeacherAnnouncements modal but import inline
  // to avoid circular dep — simplified version for school admin
  const { default: TeacherAnnouncementsDefault } = { default: null };
  // Actually re-implement the modal inline for school admin
  const isEdit = !!ann?.id;
  const [form, setForm] = useState({
    title:    ann?.title    || '',
    body:     ann?.body     || '',
    type:     ann?.type     || 'info',
    target:   ann?.target   || 'all',
    target_class_id: ann?.target_class_id || '',
    link_url:  ann?.link_url  || '',
    link_label: ann?.link_label || '',
    is_pinned: ann?.is_pinned || false,
    expires_at: ann?.expires_at ? ann.expires_at.slice(0, 16) : '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) { setErr('Judul dan isi wajib diisi'); return; }
    setSaving(true); setErr('');
    try {
      if (isEdit) {
        const { error } = await supabase.from('announcements').update({
          ...form,
          target_class_id: form.target_class_id || null,
          link_url: form.link_url || null,
          link_label: form.link_label || null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('id', ann.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('broadcast_announcement', {
          p_school_id: profile.school_id,
          p_title: form.title, p_body: form.body, p_type: form.type,
          p_target: form.target, p_target_class_id: form.target_class_id || null,
          p_link_url: form.link_url || null, p_link_label: form.link_label || null,
          p_is_pinned: form.is_pinned,
          p_expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        });
        if (error) throw error;
      }
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '580px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.15)', animation: 'slideUp .25s ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
            {isEdit ? 'Edit Pengumuman' : '📣 Broadcast Pengumuman'}
          </h2>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Type */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(ANN_TYPES).map(([k, v]) => (
              <button key={k} onClick={() => set('type', k)}
                style={{ padding: '6px 14px', borderRadius: '999px', border: `1.5px solid ${form.type === k ? v.color : '#E2E8F0'}`, background: form.type === k ? v.bg : '#fff', fontSize: '12px', fontWeight: '700', color: form.type === k ? v.color : '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Judul pengumuman..." style={inputStyle} />
          <textarea value={form.body} onChange={e => set('body', e.target.value)} placeholder="Isi pengumuman..." rows={4}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select value={form.target} onChange={e => set('target', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
              {Object.entries(TARGET_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {form.target === 'class' && (
              <select value={form.target_class_id} onChange={e => set('target_class_id', e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">Pilih kelas...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <input value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="Link URL (opsional)" style={inputStyle} />
            <input value={form.link_label} onChange={e => set('link_label', e.target.value)} placeholder="Label link" style={inputStyle} />
          </div>

          <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} style={{ ...inputStyle, maxWidth: '220px' }} />

          <div onClick={() => set('is_pinned', !form.is_pinned)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', background: form.is_pinned ? '#F5F3FF' : '#F8FAFC', borderRadius: '10px', border: `1.5px solid ${form.is_pinned ? '#C4B5FD' : '#E2E8F0'}`, cursor: 'pointer' }}>
            <Pin size={13} style={{ color: form.is_pinned ? '#7C3AED' : '#94A3B8' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: form.is_pinned ? '#7C3AED' : '#475569', flex: 1 }}>Pin di atas</span>
            <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: form.is_pinned ? '#7C3AED' : '#E2E8F0', position: 'relative' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: form.is_pinned ? '18px' : '2px', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
            </div>
          </div>

          {!isEdit && (
            <div style={{ background: '#EFF6FF', borderRadius: '10px', padding: '11px 14px', display: 'flex', gap: '8px' }}>
              <Bell size={13} style={{ color: '#0891B2', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: '#0C4A6E', margin: 0 }}>
                Notifikasi otomatis ke <strong>{TARGET_LABELS[form.target]}</strong>
              </p>
            </div>
          )}

          {err && <div style={{ padding: '10px 14px', background: '#FEF2F2', borderRadius: '9px', color: '#DC2626', fontSize: '13px' }}>{err}</div>}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 22px', borderRadius: '9px', border: 'none', background: saving ? '#E2E8F0' : '#4F46E5', fontSize: '13px', fontWeight: '700', color: saving ? '#94A3B8' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : '📣 Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main SchoolAnnouncements ──────────────────────────────────
const SchoolAnnouncements = () => {
  const { profile } = useAuth();
  const [anns,       setAnns]       = useState([]);
  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [modal,      setModal]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const [filter,     setFilter]     = useState('all');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const fetchAll = useCallback(async () => {
    if (!profile?.school_id) return;
    try {
      const [annRes, classRes] = await Promise.all([
        supabase.from('announcements')
          .select('*, profiles(name, role), classes(name)')
          .eq('school_id', profile.school_id)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name'),
      ]);
      if (annRes.error) throw annRes.error;
      setAnns(annRes.data || []);
      setClasses(classRes.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus pengumuman ini?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return;
    setAnns(p => p.filter(a => a.id !== id));
    showToast('Pengumuman dihapus');
  };

  const handleTogglePin = async (ann) => {
    const { error } = await supabase.from('announcements').update({ is_pinned: !ann.is_pinned }).eq('id', ann.id);
    if (error) return;
    setAnns(p => p.map(a => a.id === ann.id ? { ...a, is_pinned: !ann.is_pinned } : a)
      .sort((a, b) => b.is_pinned - a.is_pinned || new Date(b.created_at) - new Date(a.created_at)));
  };

  const filterOpts = [
    { key: 'all',      label: `Semua (${anns.length})` },
    { key: 'pinned',   label: `📌 Pinned (${anns.filter(a=>a.is_pinned).length})` },
    { key: 'urgent',   label: '🚨 Mendesak' },
    { key: 'deadline', label: '⏰ Deadline' },
  ];

  const displayed = anns.filter(a => {
    if (filter === 'all')      return true;
    if (filter === 'pinned')   return a.is_pinned;
    return a.type === filter;
  });

  // Stats
  const typeStats = Object.entries(ANN_TYPES).map(([k, v]) => ({
    ...v, count: anns.filter(a => a.type === k).length,
  }));

  return (
    <>
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin    { to{transform:rotate(360deg);} }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000, padding: '12px 18px', borderRadius: '12px', background: '#0F172A', color: '#fff', fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 24px rgba(0,0,0,.15)', animation: 'slideUp .2s ease', fontFamily: "'DM Sans', sans-serif" }}>
          {toast}
        </div>
      )}

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={15} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Broadcast Pengumuman</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Kelola semua pengumuman sekolah — guru, siswa, atau semua</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setRefreshing(true); fetchAll(); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setModal('create')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 18px', borderRadius: '9px', border: 'none', background: '#4F46E5', fontSize: '13px', fontWeight: '700', color: '#fff', cursor: 'pointer' }}>
              <Plus size={14} />Broadcast
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
            <StatCard icon={Megaphone} label="Total"    value={anns.length}                          color="#4F46E5" bg="#EFF6FF" />
            <StatCard icon={Pin}       label="Pinned"   value={anns.filter(a=>a.is_pinned).length}   color="#7C3AED" bg="#F5F3FF" />
            <StatCard icon={Users}     label="Guru"     value={anns.filter(a=>a.target==='teachers'||a.target==='all').length} color="#0891B2" bg="#EFF6FF" />
            <StatCard icon={Bell}      label="Siswa"    value={anns.filter(a=>a.target==='students'||a.target==='all').length} color="#16A34A" bg="#F0FDF4" />
          </div>
        )}

        {error && <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '12px', color: '#DC2626', fontSize: '13px' }}>{error}</div>}

        {/* Filter */}
        <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', borderRadius: '10px', padding: '4px', flexWrap: 'wrap', width: 'fit-content' }}>
          {filterOpts.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: filter === key ? '#fff' : 'transparent', fontSize: '12px', fontWeight: '600', color: filter === key ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: filter === key ? '0 1px 4px rgba(0,0,0,.08)' : 'none', fontFamily: "'DM Sans', sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...Array(4)].map((_, i) => <Shimmer key={i} h={120} r={14} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
            <Megaphone size={36} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px' }}>Belum ada pengumuman</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayed.map(ann => (
              <AnnCard key={ann.id} ann={ann} canEdit={true}
                onEdit={setModal} onDelete={handleDelete} onTogglePin={handleTogglePin} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <SchoolAnnModal
          ann={modal === 'create' ? null : modal}
          classes={classes}
          profile={profile}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchAll(); showToast('Pengumuman berhasil dikirim! 📣'); }}
        />
      )}
    </>
  );
};

export default SchoolAnnouncements;
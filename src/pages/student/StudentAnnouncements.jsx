import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Megaphone, RefreshCw, Clock, ExternalLink, Pin, Bell } from 'lucide-react';
import { ANN_TYPES, TARGET_LABELS, fmtAgo, fmtDate } from '../../lib/announcementUtils';

const Shimmer = ({ h = 100, r = 14 }) => (
  <div style={{ height: h, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

// ── Announcement Card (read-only) ─────────────────────────────
const AnnCard = ({ ann }) => {
  const t = ANN_TYPES[ann.type] || ANN_TYPES.info;
  const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();

  return (
    <div style={{ background: '#fff', borderRadius: '14px', border: `1.5px solid ${ann.is_pinned ? '#C4B5FD' : '#F1F5F9'}`, padding: '16px 18px', boxShadow: ann.is_pinned ? '0 4px 16px rgba(124,58,237,.08)' : '0 1px 4px rgba(0,0,0,.03)', opacity: isExpired ? 0.65 : 1, position: 'relative', transition: 'box-shadow .2s' }}>

      {ann.is_pinned && (
        <div style={{ position: 'absolute', top: '12px', right: '14px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Pin size={10} style={{ color: '#7C3AED' }} />
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#7C3AED' }}>PINNED</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
          {t.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center' }}>
            <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: t.bg, color: t.color }}>{t.label}</span>
            {isExpired && <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: '#FEF2F2', color: '#DC2626' }}>Kedaluwarsa</span>}
          </div>

          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px', paddingRight: ann.is_pinned ? '72px' : 0 }}>
            {ann.title}
          </h3>

          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {ann.body}
          </p>

          {ann.link_url && (
            <a href={ann.link_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: '#4F46E5', textDecoration: 'none', padding: '5px 12px', background: '#EFF6FF', borderRadius: '7px', marginBottom: '10px', border: '1px solid #C7D2FE' }}>
              <ExternalLink size={11} />{ann.link_label || 'Lihat Detail'}
            </a>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} />{fmtAgo(ann.created_at)}
            </span>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>oleh {ann.profiles?.name || '—'}</span>
            {ann.expires_at && !isExpired && (
              <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '600' }}>⏰ Berakhir: {fmtDate(ann.expires_at)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main StudentAnnouncements ─────────────────────────────────
const StudentAnnouncements = () => {
  const { profile } = useAuth();
  const [anns,       setAnns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState('all');
  const [unread,     setUnread]     = useState(0);

  const fetchAnns = useCallback(async () => {
    if (!profile?.school_id) return;
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('announcements')
        .select('*, profiles(name, role), classes(name)')
        .eq('school_id', profile.school_id)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .or(`target.eq.all,target.eq.students,and(target.eq.class,target_class_id.eq.${profile.class_id || 'null'})`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) throw error;
      const list = data || [];
      setAnns(list);

      // Count announcements newer than last_seen (stored in localStorage)
      const lastSeen = localStorage.getItem(`ann_seen_${profile.id}`);
      const newCount = lastSeen
        ? list.filter(a => new Date(a.created_at) > new Date(lastSeen)).length
        : list.length;
      setUnread(newCount);

      // Mark as seen now
      localStorage.setItem(`ann_seen_${profile.id}`, now);
      setUnread(0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id, profile?.class_id, profile?.id]);

  useEffect(() => {
    // Compute unread before fetch
    const lastSeen = localStorage.getItem(`ann_seen_${profile?.id}`);
    if (!lastSeen) setUnread(1); // at least indicate there may be new ones
    fetchAnns();
  }, [fetchAnns]);

  const filterOpts = [
    { key: 'all',      label: `Semua (${anns.length})` },
    { key: 'pinned',   label: `📌 Pinned` },
    { key: 'urgent',   label: '🚨 Mendesak' },
    { key: 'deadline', label: '⏰ Deadline' },
    { key: 'event',    label: '📅 Acara' },
    { key: 'info',     label: 'ℹ️ Informasi' },
  ];

  const displayed = anns.filter(a => {
    if (filter === 'all')    return true;
    if (filter === 'pinned') return a.is_pinned;
    return a.type === filter;
  });

  const urgentCount  = anns.filter(a => a.type === 'urgent' && !a.expires_at || (a.expires_at && new Date(a.expires_at) > new Date())).length;
  const deadlineCount = anns.filter(a => a.type === 'deadline').length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        .ann-card-hover:hover { box-shadow: 0 4px 16px rgba(79,70,229,.08) !important; transform: translateY(-1px); }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Megaphone size={15} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Pengumuman</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              Pengumuman dari guru dan sekolah
              {urgentCount > 0 && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', background: '#FEF2F2', color: '#DC2626', fontSize: '11px', fontWeight: '700' }}>🚨 {urgentCount} mendesak</span>}
            </p>
          </div>
          <button onClick={() => { setRefreshing(true); fetchAnns(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Urgent banner */}
        {!loading && urgentCount > 0 && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', opacity: 0, animation: 'fadeUp .4s ease 80ms forwards' }}>
            <span style={{ fontSize: '20px' }}>🚨</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>Ada {urgentCount} pengumuman mendesak!</div>
              <div style={{ fontSize: '12px', color: '#EF4444' }}>Mohon perhatikan pengumuman bertanda mendesak di bawah.</div>
            </div>
          </div>
        )}

        {/* Deadline banner */}
        {!loading && deadlineCount > 0 && (
          <div style={{ padding: '14px 18px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', opacity: 0, animation: 'fadeUp .4s ease 100ms forwards' }}>
            <span style={{ fontSize: '20px' }}>⏰</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#D97706' }}>{deadlineCount} pengumuman deadline</div>
              <div style={{ fontSize: '12px', color: '#F59E0B' }}>Periksa tanggal batas yang perlu diperhatikan.</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '12px', color: '#DC2626', fontSize: '13px' }}>{error}</div>
        )}

        {/* Filter */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
            {filterOpts.filter(f => f.key === 'all' || anns.some(a => f.key === 'pinned' ? a.is_pinned : a.type === f.key)).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: filter === key ? '#fff' : 'transparent', fontSize: '12px', fontWeight: '600', color: filter === key ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: filter === key ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition: 'all .15s', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...Array(4)].map((_, i) => <Shimmer key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', color: '#94A3B8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '600', color: '#CBD5E1', marginBottom: '6px' }}>Belum ada pengumuman</div>
            <div style={{ fontSize: '13px' }}>Pengumuman dari guru dan sekolah akan muncul di sini</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayed.map((ann, i) => (
              <div key={ann.id} className="ann-card-hover"
                style={{ opacity: 0, animation: `fadeUp .35s ease ${i * 40}ms forwards`, transition: 'transform .2s, box-shadow .2s', borderRadius: '14px' }}>
                <AnnCard ann={ann} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state for filtered */}
        {!loading && anns.length > 0 && displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px' }}>
            Tidak ada pengumuman untuk filter ini
          </div>
        )}
      </div>
    </>
  );
};

export default StudentAnnouncements;
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  RefreshCw, AlertCircle, ChevronDown, X, CheckCircle2,
  XCircle, Clock, Users, Award, RotateCcw, Bell,
  CalendarDays, BookOpen, TrendingUp, Plus, Eye,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDT    = (d) => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const round    = (n) => (n !== null && n !== undefined) ? Math.round(n) : null;
const toLocal  = (d) => d ? new Date(new Date(d) - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

// ── Sub-components ────────────────────────────────────────────
const Shimmer = ({ h = 14, w = '100%', r = 6 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

const StatCard = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '18px', display: 'flex', gap: '14px', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
);

const Badge = ({ children, color = '#64748B', bg = '#F8FAFC' }) => (
  <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: bg, color, whiteSpace: 'nowrap' }}>{children}</span>
);

// ── Create Remedial Modal ─────────────────────────────────────
const CreateRemedialModal = ({ session, failedStudents, onClose, onCreated }) => {
  const now     = new Date();
  const defStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const defEnd   = new Date(defStart.getTime() + 90 * 60 * 1000);

  const [form, setForm] = useState({
    title:    `Remedial — ${session.title}`,
    start:    toLocal(defStart),
    end:      toLocal(defEnd),
    duration: session.duration_minutes || 60,
  });
  const [selected, setSelected]   = useState(failedStudents.map(s => s.student_id));
  const [saving,   setSaving]     = useState(false);
  const [err,      setErr]        = useState('');

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleCreate = async () => {
    if (!form.title.trim()) { setErr('Judul tidak boleh kosong'); return; }
    if (!form.start || !form.end) { setErr('Waktu harus diisi'); return; }
    if (new Date(form.end) <= new Date(form.start)) { setErr('Waktu selesai harus setelah waktu mulai'); return; }
    if (!selected.length) { setErr('Pilih minimal 1 siswa'); return; }

    setSaving(true); setErr('');
    try {
      const { data, error } = await supabase.rpc('create_remedial_session', {
        p_parent_session_id: session.id,
        p_title:             form.title,
        p_start_time:        new Date(form.start).toISOString(),
        p_end_time:          new Date(form.end).toISOString(),
        p_duration_minutes:  parseInt(form.duration),
        p_student_ids:       selected,
      });

      if (error) throw error;
      onCreated(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.15)', animation: 'slideUp .25s ease' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={13} style={{ color: '#DC2626' }} />
              </div>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Buat Sesi Remedial</h2>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 36px' }}>Dari: {session.title}</p>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Form fields */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>JUDUL SESI REMEDIAL</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#4F46E5'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>WAKTU MULAI</label>
              <input type="datetime-local" value={form.start} onChange={e => setForm(p => ({ ...p, start: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>WAKTU SELESAI</label>
              <input type="datetime-local" value={form.end} onChange={e => setForm(p => ({ ...p, end: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ maxWidth: '160px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>DURASI (MENIT)</label>
            <input type="number" min={15} max={300} value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
          </div>

          {/* Student selector */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>SISWA WAJIB REMEDIAL ({selected.length} dipilih)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setSelected(failedStudents.map(s => s.student_id))}
                  style={{ fontSize: '11px', fontWeight: '600', color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Pilih Semua</button>
                <span style={{ color: '#E2E8F0' }}>|</span>
                <button onClick={() => setSelected([])}
                  style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>Reset</button>
              </div>
            </div>
            <div style={{ border: '1.5px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
              {failedStudents.map((s, i) => {
                const isSelected = selected.includes(s.student_id);
                return (
                  <div key={s.student_id} onClick={() => toggle(s.student_id)}
                    style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: isSelected ? '#F5F3FF' : i % 2 === 0 ? '#fff' : '#FAFAFA', borderBottom: i < failedStudents.length - 1 ? '1px solid #F1F5F9' : 'none', transition: 'background .1s' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${isSelected ? '#4F46E5' : '#CBD5E1'}`, background: isSelected ? '#4F46E5' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                      {isSelected && <CheckCircle2 size={11} style={{ color: '#fff' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{s.profiles?.name || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>NIS: {s.profiles?.nis || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#DC2626' }}>{round(s.score)}</div>
                      <div style={{ fontSize: '10px', color: '#94A3B8' }}>KKM: {s.passing_score}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notif info */}
          <div style={{ background: '#F0FDF4', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Bell size={13} style={{ color: '#16A34A', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '12px', color: '#166534', margin: 0, lineHeight: 1.5 }}>
              <strong>{selected.length} siswa</strong> akan otomatis mendapat notifikasi bahwa mereka wajib ikut remedial setelah sesi dibuat.
            </p>
          </div>

          {err && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={13} />{err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            Batal
          </button>
          <button onClick={handleCreate} disabled={saving || !selected.length}
            style={{ padding: '10px 22px', borderRadius: '9px', border: 'none', background: saving || !selected.length ? '#E2E8F0' : '#4F46E5', fontSize: '13px', fontWeight: '700', color: saving || !selected.length ? '#94A3B8' : '#fff', cursor: saving || !selected.length ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '7px' }}>
            {saving ? <><div style={{ width: '13px', height: '13px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />Membuat...</> : <><Plus size={13} />Buat Remedial</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Remedial Detail Drawer ────────────────────────────────────
const RemedialDetail = ({ remedial, onClose }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('exam_results')
      .select('id, student_id, score, passed, status, submitted_at, profiles(name, nis)')
      .eq('exam_session_id', remedial.session_id)
      .then(({ data }) => { setResults(data || []); setLoading(false); });
  }, [remedial.session_id]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'rgba(15,23,42,.3)', position: 'absolute', inset: 0 }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '440px', background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,.12)', animation: 'slideLeft .25s ease', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 2px' }}>{remedial.session_title}</h2>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Dari: {remedial.parent_title || '—'}</div>
          </div>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} style={{ color: '#64748B' }} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Wajib Ikut',     value: remedial.wajib_remedial || 0,    color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Sudah Ikut',     value: remedial.sudah_ikut || 0,         color: '#0891B2', bg: '#EFF6FF' },
              { label: 'Lulus Remedial', value: remedial.lulus_remedial || 0,     color: '#16A34A', bg: '#F0FDF4' },
              { label: 'Avg Nilai',      value: remedial.avg_score_remedial || '—', color: '#D97706', bg: '#FFFBEB' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Clock size={13} style={{ color: '#64748B' }} />
            <span style={{ fontSize: '12px', color: '#64748B' }}>{fmtDT(remedial.start_time)} — {fmtDT(remedial.end_time)}</span>
          </div>

          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: '700', color: '#0F172A', margin: '0 0 10px' }}>Hasil Siswa</h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...Array(3)].map((_, i) => <Shimmer key={i} h={52} r={10} />)}
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px' }}>
              <BookOpen size={28} style={{ color: '#E2E8F0', marginBottom: '8px' }} />
              <div>Belum ada siswa yang mengumpulkan</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {results.map(r => (
                <div key={r.id} style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{r.profiles?.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>NIS: {r.profiles?.nis || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '18px', fontWeight: '700', color: r.passed ? '#16A34A' : r.passed === false ? '#DC2626' : '#D97706' }}>
                      {round(r.score) ?? '—'}
                    </div>
                    <Badge color={r.passed ? '#16A34A' : r.passed === false ? '#DC2626' : '#D97706'}
                           bg={r.passed ? '#F0FDF4' : r.passed === false ? '#FEF2F2' : '#FFFBEB'}>
                      {r.passed ? 'Lulus' : r.passed === false ? 'Belum Lulus' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const RemedialPage = () => {
  const { profile } = useAuth();

  // Tab: 'detect' = auto-detect siswa remedial | 'manage' = kelola sesi remedial
  const [tab,          setTab]          = useState('detect');
  const [sessions,     setSessions]     = useState([]);
  const [remedials,    setRemedials]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');
  const [filterSess,   setFilterSess]   = useState('all');
  const [failedMap,    setFailedMap]    = useState({}); // session_id → failed students
  const [loadingFailed,setLoadingFailed]= useState({});
  const [createModal,  setCreateModal]  = useState(null); // { session, failedStudents }
  const [detailDrawer, setDetailDrawer] = useState(null);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true); setError('');
    try {
      const [sessRes, remRes] = await Promise.all([
        supabase.from('exam_sessions')
          .select('id, title, exam_type, start_time, end_time, passing_score, class_id, classes(name)')
          .eq('teacher_id', profile.id)
          .eq('is_remedial', false)
          .order('start_time', { ascending: false }),
        supabase.from('exam_sessions')
          .select('id, title, parent_session_id, start_time, end_time, remedial_for_ids, classes(name)')
          .eq('teacher_id', profile.id)
          .eq('is_remedial', true)
          .order('start_time', { ascending: false }),
      ]);
      if (sessRes.error) throw sessRes.error;
      setSessions(sessRes.data || []);

      // Enrich remedials with summary data
      if (remRes.data?.length) {
        const { data: summaries } = await supabase
          .from('remedial_summary')
          .select('*')
          .in('session_id', remRes.data.map(r => r.id));

        const summaryMap = {};
        (summaries || []).forEach(s => { summaryMap[s.session_id] = s; });

        // Get parent titles
        const parentIds = [...new Set(remRes.data.map(r => r.parent_session_id).filter(Boolean))];
        let parentMap = {};
        if (parentIds.length) {
          const { data: parents } = await supabase
            .from('exam_sessions').select('id, title').in('id', parentIds);
          (parents || []).forEach(p => { parentMap[p.id] = p.title; });
        }

        setRemedials(remRes.data.map(r => ({
          ...r,
          ...(summaryMap[r.id] || {}),
          parent_title: parentMap[r.parent_session_id] || '—',
        })));
      } else {
        setRemedials([]);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load failed students for a specific session
  const loadFailedStudents = async (sess) => {
    if (failedMap[sess.id]) return; // already loaded
    setLoadingFailed(p => ({ ...p, [sess.id]: true }));
    try {
      const { data } = await supabase
        .from('exam_results')
        .select('id, student_id, score, passed, status, profiles(name, nis)')
        .eq('exam_session_id', sess.id)
        .eq('passed', false)
        .in('status', ['submitted', 'graded'])
        .order('score', { ascending: true });

      setFailedMap(p => ({ ...p, [sess.id]: (data || []).map(r => ({ ...r, passing_score: sess.passing_score })) }));
    } catch {}
    finally { setLoadingFailed(p => ({ ...p, [sess.id]: false })); }
  };

  const displayedSessions = filterSess === 'all' ? sessions : sessions.filter(s => s.id === filterSess);

  // Summary stats
  const totalRemedials    = remedials.length;
  const totalWajib        = remedials.reduce((s, r) => s + (r.wajib_remedial || 0), 0);
  const totalLulus        = remedials.reduce((s, r) => s + (r.lulus_remedial || 0), 0);
  const totalSudahIkut    = remedials.reduce((s, r) => s + (r.sudah_ikut || 0), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer  { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
        @keyframes slideLeft{ from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);} }
        @keyframes spin     { to{transform:rotate(360deg);} }
        .sess-card:hover { border-color: #C7D2FE !important; box-shadow: 0 4px 16px rgba(79,70,229,.08) !important; }
        .rem-card:hover  { border-color: #FCA5A5 !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 2000, padding: '12px 18px', borderRadius: '12px', background: toast.type === 'success' ? '#0F172A' : '#FEF2F2', color: toast.type === 'success' ? '#fff' : '#DC2626', fontSize: '13px', fontWeight: '600', boxShadow: '0 8px 24px rgba(0,0,0,.15)', display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideUp .2s ease', fontFamily: "'DM Sans', sans-serif" }}>
          {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}{toast.msg}
        </div>
      )}

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={15} style={{ color: '#DC2626' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Manajemen Remedial</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Auto-detect siswa remedial dan jadwalkan ujian ulang</p>
          </div>
          <button onClick={() => { setRefreshing(true); fetchData(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />Refresh
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
            <StatCard icon={RotateCcw}    label="Sesi Remedial"    value={totalRemedials}  sub="Total dibuat"         color="#DC2626" bg="#FEF2F2" />
            <StatCard icon={Users}        label="Wajib Remedial"   value={totalWajib}      sub="Total siswa"          color="#D97706" bg="#FFFBEB" />
            <StatCard icon={TrendingUp}   label="Sudah Ikut"       value={totalSudahIkut}  sub={`${totalWajib ? Math.round(totalSudahIkut/totalWajib*100) : 0}% partisipasi`} color="#0891B2" bg="#EFF6FF" />
            <StatCard icon={Award}        label="Lulus Remedial"   value={totalLulus}      sub={`${totalSudahIkut ? Math.round(totalLulus/totalSudahIkut*100) : 0}% berhasil`} color="#16A34A" bg="#F0FDF4" />
          </div>
        )}

        {error && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', gap: '8px' }}>
            <AlertCircle size={14} />{error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {[
            { key: 'detect', label: 'Auto-Detect Remedial', icon: Users },
            { key: 'manage', label: 'Sesi Remedial', icon: CalendarDays },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '7px', border: 'none', background: tab === key ? '#fff' : 'transparent', fontSize: '13px', fontWeight: '600', color: tab === key ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition: 'all .15s', fontFamily: "'DM Sans', sans-serif" }}>
              <Icon size={13} />{label}
              {key === 'manage' && remedials.length > 0 && (
                <span style={{ background: '#EF4444', color: '#fff', borderRadius: '999px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', marginLeft: '2px' }}>{remedials.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: Auto-Detect ── */}
        {tab === 'detect' && (
          <div style={{ opacity: 0, animation: 'fadeUp .3s ease forwards', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <select value={filterSess} onChange={e => setFilterSess(e.target.value)}
                  style={{ padding: '9px 34px 9px 12px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '600', color: '#0F172A', appearance: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", minWidth: '220px' }}>
                  <option value="all">Semua Ujian</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...Array(3)].map((_, i) => <Shimmer key={i} h={100} r={14} />)}
              </div>
            ) : displayedSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8', fontSize: '14px' }}>
                <BookOpen size={36} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
                <div>Belum ada ujian yang dibuat</div>
              </div>
            ) : (
              displayedSessions.map(sess => {
                const failed  = failedMap[sess.id];
                const isLoading = loadingFailed[sess.id];
                const hasRemedial = remedials.some(r => r.parent_session_id === sess.id);

                return (
                  <div key={sess.id} className="sess-card"
                    style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #F1F5F9', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.03)', transition: 'all .2s' }}>

                    {/* Session header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>{sess.title}</h3>
                          {hasRemedial && <Badge color="#7C3AED" bg="#F5F3FF">Ada Remedial</Badge>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                          {sess.classes?.name} · KKM {sess.passing_score || 75} · {fmtDate(sess.start_time)}
                        </div>
                      </div>
                      <button
                        onClick={() => failed ? null : loadFailedStudents(sess)}
                        disabled={isLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: isLoading ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                        <Eye size={12} style={{ animation: isLoading ? 'spin .7s linear infinite' : 'none' }} />
                        {failed ? `${failed.length} tidak lulus` : isLoading ? 'Loading...' : 'Cek Remedial'}
                      </button>
                    </div>

                    {/* Failed students list */}
                    {failed && (
                      failed.length === 0 ? (
                        <div style={{ padding: '12px 14px', background: '#F0FDF4', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                          <span style={{ fontSize: '13px', color: '#166534', fontWeight: '600' }}>Semua siswa lulus! Tidak perlu remedial.</span>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <XCircle size={13} style={{ color: '#DC2626' }} />
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>{failed.length} siswa perlu remedial</span>
                            </div>
                            <button
                              onClick={() => setCreateModal({ session: sess, failedStudents: failed })}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#4F46E5', fontSize: '12px', fontWeight: '700', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                              <Plus size={12} />Buat Sesi Remedial
                            </button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                            {failed.map(r => (
                              <div key={r.student_id} style={{ padding: '10px 12px', background: '#FEF2F2', borderRadius: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>{r.profiles?.name || '—'}</div>
                                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{r.profiles?.nis || '—'}</div>
                                </div>
                                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#DC2626' }}>{round(r.score)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB: Manage Remedials ── */}
        {tab === 'manage' && (
          <div style={{ opacity: 0, animation: 'fadeUp .3s ease forwards', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...Array(3)].map((_, i) => <Shimmer key={i} h={90} r={14} />)}
              </div>
            ) : remedials.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8', fontSize: '14px' }}>
                <RotateCcw size={36} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
                <div style={{ marginBottom: '6px' }}>Belum ada sesi remedial</div>
                <div style={{ fontSize: '12px' }}>Buat dari tab "Auto-Detect Remedial"</div>
              </div>
            ) : (
              remedials.map(r => {
                const now      = new Date();
                const start    = new Date(r.start_time);
                const end      = new Date(r.end_time);
                const isLive   = now >= start && now <= end;
                const isDone   = now > end;
                const partRate = r.wajib_remedial ? Math.round((r.sudah_ikut || 0) / r.wajib_remedial * 100) : 0;

                return (
                  <div key={r.session_id} className="rem-card"
                    style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #F1F5F9', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.03)', transition: 'border-color .2s', cursor: 'pointer' }}
                    onClick={() => setDetailDrawer(r)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: 0 }}>{r.session_title}</h3>
                          <Badge
                            color={isLive ? '#16A34A' : isDone ? '#64748B' : '#D97706'}
                            bg={isLive ? '#F0FDF4' : isDone ? '#F8FAFC' : '#FFFBEB'}>
                            {isLive ? '● Live' : isDone ? 'Selesai' : 'Upcoming'}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '10px' }}>
                          Dari: {r.parent_title} · {fmtDT(r.start_time)}
                        </div>
                        {/* Progress bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#F1F5F9', overflow: 'hidden' }}>
                            <div style={{ width: `${partRate}%`, height: '100%', background: partRate >= 80 ? '#16A34A' : partRate >= 50 ? '#F59E0B' : '#EF4444', borderRadius: '3px', transition: 'width .5s ease' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', flexShrink: 0 }}>
                            {r.sudah_ikut || 0}/{r.wajib_remedial || 0} ikut
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '800', color: (r.lulus_remedial || 0) > 0 ? '#16A34A' : '#94A3B8' }}>
                          {r.lulus_remedial || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>lulus</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {createModal && (
        <CreateRemedialModal
          session={createModal.session}
          failedStudents={createModal.failedStudents}
          onClose={() => setCreateModal(null)}
          onCreated={(data) => {
            setCreateModal(null);
            fetchData();
            setTab('manage');
            showToast(`Sesi remedial dibuat! Token: ${data.token} · ${data.notified} siswa dinotifikasi`);
          }}
        />
      )}

      {detailDrawer && (
        <RemedialDetail
          remedial={detailDrawer}
          onClose={() => setDetailDrawer(null)}
        />
      )}
    </>
  );
};

export default RemedialPage;
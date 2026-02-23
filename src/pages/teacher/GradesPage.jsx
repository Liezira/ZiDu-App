import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Award, Search, RefreshCw, ChevronDown, AlertCircle,
  Download, BarChart2, Users, CheckCircle2, XCircle,
  TrendingUp, Filter, FileText, Zap,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

const ScoreCell = ({ score, passed, status }) => {
  if (status === 'in_progress') return <span style={{ fontSize: '12px', color: '#D97706', fontWeight: '600' }}>Mengerjakan...</span>;
  if (score === null || score === undefined) return <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>;
  const s = Math.round(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: passed ? '#16A34A' : '#DC2626' }}>{s}</span>
      {passed !== null && (
        passed
          ? <CheckCircle2 size={13} style={{ color: '#16A34A' }} />
          : <XCircle size={13} style={{ color: '#DC2626' }} />
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const MAP = {
    graded:      { label: 'Dinilai',    bg: '#F0FDF4', color: '#16A34A' },
    submitted:   { label: 'Dikumpul',   bg: '#EFF6FF', color: '#2563EB' },
    in_progress: { label: 'Mengerjakan',bg: '#FFFBEB', color: '#D97706' },
    grading:     { label: 'Menunggu',   bg: '#F5F3FF', color: '#7C3AED' },
  };
  const m = MAP[status] || { label: status, bg: '#F8FAFC', color: '#64748B' };
  return <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>{m.label}</span>;
};

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
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '20px', fontWeight: '700', color: '#0F172A', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────
const GradesPage = () => {
  const { profile } = useAuth();
  const [sessions,  setSessions]  = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [rLoading,  setRLoading]  = useState(false);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(null);

  const [filterSession, setFilterSession] = useState('all');
  const [filterClass,   setFilterClass]   = useState('all');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [search,        setSearch]        = useState('');

  // Fetch sessions + classes
  const fetchMeta = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [sessRes, classRes] = await Promise.all([
        supabase.from('exam_sessions')
          .select('id, title, exam_type, start_time, passing_score, class_id, classes(name)')
          .eq('teacher_id', profile.id)
          .order('start_time', { ascending: false }),
        supabase.from('classes')
          .select('id, name')
          .eq('school_id', profile.school_id)
          .order('name'),
      ]);
      if (sessRes.error) throw sessRes.error;
      setSessions(sessRes.data || []);
      setClasses(classRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id, profile?.school_id]);

  // Fetch results (filtered by session or class)
  const fetchResults = useCallback(async () => {
    if (!profile?.id) return;
    setRLoading(true);
    try {
      let query = supabase.from('exam_results')
        .select('*, profiles(name, nis, email, class_id), exam_sessions(id, title, exam_type, passing_score, start_time, class_id, classes(name))')
        .order('submitted_at', { ascending: false });

      // Filter by teacher's sessions
      const mySessionIds = sessions.map(s => s.id);
      if (mySessionIds.length === 0) { setResults([]); setRLoading(false); return; }
      query = query.in('exam_session_id', mySessionIds);

      if (filterSession !== 'all') query = query.eq('exam_session_id', filterSession);

      const { data, error } = await query.limit(200);
      if (error) throw error;

      let filtered = data || [];
      // Filter by class
      if (filterClass !== 'all') filtered = filtered.filter(r => r.exam_sessions?.class_id === filterClass);
      setResults(filtered);
    } catch (err) { setError(err.message); }
    finally { setRLoading(false); }
  }, [profile?.id, sessions, filterSession, filterClass]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => { if (sessions.length > 0 || !loading) fetchResults(); }, [sessions, filterSession, filterClass]);

  // Stats
  const gradedResults = results.filter(r => r.status === 'graded' && r.score !== null);
  const avgScore  = gradedResults.length ? Math.round(gradedResults.reduce((s, r) => s + r.score, 0) / gradedResults.length) : null;
  const passCount = gradedResults.filter(r => r.passed).length;
  const passRate  = gradedResults.length ? Math.round((passCount / gradedResults.length) * 100) : null;

  // Filtered display
  const displayed = results.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSearch = !search || r.profiles?.name?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.nis?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Export CSV
  const exportCSV = () => {
    const header = ['Nama Siswa', 'NIS', 'Ujian', 'Kelas', 'Tipe', 'Nilai', 'Lulus', 'Status', 'Waktu Submit'];
    const rows = displayed.map(r => [
      r.profiles?.name || '',
      r.profiles?.nis || '',
      r.exam_sessions?.title || '',
      r.exam_sessions?.classes?.name || '',
      r.exam_sessions?.exam_type || '',
      r.score !== null ? Math.round(r.score) : '',
      r.passed === true ? 'Ya' : r.passed === false ? 'Tidak' : '',
      r.status,
      r.submitted_at ? `${fmtDate(r.submitted_at)} ${fmtTime(r.submitted_at)}` : '',
    ]);
    const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rekap_nilai_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        .grade-row:hover { background: #FAFBFF !important; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={15} style={{ color: '#D97706' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Rekap Nilai</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Lihat dan ekspor hasil ujian semua siswa</p>
          </div>
          <div style={{ display: 'flex', gap: '9px' }}>
            <button onClick={() => { setRefreshing(true); fetchMeta(); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />Refresh
            </button>
            {displayed.length > 0 && (
              <button onClick={exportCSV}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #D97706', background: '#FFFBEB', fontSize: '13px', fontWeight: '600', color: '#D97706', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                <Download size={13} />Export CSV
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
          <StatCard icon={Users}     label="Total Hasil"   value={results.length}                              sub="Semua sesi ujian"          color="#0891B2" bg="#EFF6FF" />
          <StatCard icon={CheckCircle2} label="Sudah Dinilai" value={gradedResults.length}                    sub={`${results.filter(r=>r.status==='submitted').length} menunggu penilaian`} color="#16A34A" bg="#F0FDF4" />
          <StatCard icon={BarChart2} label="Rata-rata Nilai" value={avgScore !== null ? avgScore : '—'}       sub="Dari hasil yang dinilai"    color="#4F46E5" bg="#EEF2FF" />
          <StatCard icon={TrendingUp} label="Tingkat Lulus" value={passRate !== null ? `${passRate}%` : '—'} sub={`${passCount} dari ${gradedResults.length} lulus`} color="#D97706" bg="#FFFBEB" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .4s ease 100ms forwards' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Cari nama atau NIS siswa..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#D97706'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,6,.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
          </div>

          {/* Session filter */}
          <div style={{ position: 'relative' }}>
            <select value={filterSession} onChange={e => setFilterSession(e.target.value)}
              style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterSession !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none', maxWidth: '200px' }}>
              <option value="all">Semua Ujian</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          </div>

          {/* Class filter */}
          <div style={{ position: 'relative' }}>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterClass !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
              <option value="all">Semua Kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          </div>

          {/* Status filter */}
          <div style={{ position: 'relative' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: filterStatus !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none' }}>
              <option value="all">Semua Status</option>
              <option value="graded">Dinilai</option>
              <option value="submitted">Dikumpul</option>
              <option value="in_progress">Mengerjakan</option>
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          </div>

          <span style={{ fontSize: '12px', color: '#94A3B8', alignSelf: 'center' }}>{displayed.length} hasil</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease 140ms forwards' }}>
          {loading || rLoading
            ? <div style={{ padding: '20px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '16px' }}>
                    <Shimmer w="130px" /><Shimmer w="70px" /><Shimmer w="160px" /><Shimmer w="80px" /><Shimmer w="60px" /><Shimmer w="80px" />
                  </div>
                ))}
              </div>
            : displayed.length === 0
            ? <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  {sessions.length === 0 ? 'Belum ada sesi ujian' : 'Belum ada hasil ujian'}
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                  {sessions.length === 0 ? 'Buat sesi ujian di menu Kelola Ujian terlebih dahulu' : 'Hasil akan muncul setelah siswa mengerjakan ujian'}
                </div>
              </div>
            : <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                        {['Siswa', 'NIS', 'Ujian', 'Kelas', 'Nilai', 'Status', 'Waktu Submit'].map(h => (
                          <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map((r, idx) => (
                        <tr key={r.id} className="grade-row"
                          style={{ borderBottom: '1px solid #F8FAFC', background: '#fff', transition: 'background .1s', opacity: 0, animation: `fadeUp .3s ease ${Math.min(idx, 15) * 25}ms forwards` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{r.profiles?.name || '—'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{r.profiles?.email || ''}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B', fontFamily: 'Sora, sans-serif' }}>{r.profiles?.nis || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: '#0F172A', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.exam_sessions?.title || '—'}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{r.exam_sessions?.exam_type} · KKM {r.exam_sessions?.passing_score}</div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>{r.exam_sessions?.classes?.name || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <ScoreCell score={r.score} passed={r.passed} status={r.status} />
                          </td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(r.submitted_at)}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtTime(r.submitted_at)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {displayed.length} hasil</span>
                  <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={10} style={{ color: '#D97706' }} /> Real-time dari Supabase
                  </span>
                </div>
              </>
          }
        </div>
      </div>
    </>
  );
};

export default GradesPage;
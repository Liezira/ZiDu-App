import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Award, Search, RefreshCw, ChevronDown, AlertCircle,
  Download, BarChart2, Users, CheckCircle2, XCircle,
  TrendingUp, Zap, Edit3, X, Save, Eye, ArrowLeft,
} from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
const round   = (n) => n !== null && n !== undefined ? Math.round(n) : null;

const ScoreCell = ({ score, passed, status }) => {
  if (status === 'in_progress') return <span style={{ fontSize: '12px', color: '#D97706', fontWeight: '600' }}>Mengerjakan...</span>;
  if (score === null || score === undefined) return <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>;
  const s = Math.round(score);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: passed ? '#16A34A' : '#DC2626' }}>{s}</span>
      {passed !== null && (passed ? <CheckCircle2 size={13} style={{ color: '#16A34A' }} /> : <XCircle size={13} style={{ color: '#DC2626' }} />)}
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

// ── Essay Grading Drawer ──────────────────────────────────────────
const EssayGradingDrawer = ({ result, onClose, onGraded }) => {
  const [questions,    setQuestions]    = useState([]);
  const [qLoading,     setQLoading]     = useState(true);
  const [scores,       setScores]       = useState({});  // question_id → score
  const [saving,       setSaving]       = useState(false);
  const [saveErr,      setSaveErr]      = useState('');

  useEffect(() => {
    if (!result) return;
    setQLoading(true);
    const bankId = result.exam_sessions?.question_bank_id;
    if (!bankId) { setQLoading(false); return; }
    supabase.from('questions').select('*').eq('bank_id', bankId)
      .then(({ data }) => {
        setQuestions(data || []);
        // Pre-fill existing scores if any
        const existing = {};
        (result.answers || []).forEach(a => {
          if (a.essay_score !== undefined) existing[a.question_id] = a.essay_score;
        });
        setScores(existing);
        setQLoading(false);
      });
  }, [result?.id]);

  const essayQuestions = questions.filter(q => q.type === 'essay');
  const answers = Array.isArray(result?.answers) ? result.answers : [];
  const answerMap = {};
  answers.forEach(a => { if (a.question_id) answerMap[a.question_id] = a; });

  const handleSave = async () => {
    setSaving(true); setSaveErr('');
    try {
      // Update answers array with essay scores
      const updatedAnswers = answers.map(a => {
        if (a.type === 'essay' && scores[a.question_id] !== undefined) {
          return { ...a, essay_score: parseFloat(scores[a.question_id]) };
        }
        return a;
      });

      // Recalculate total score
      let totalScore = 0, maxScore = 0;
      questions.forEach(q => {
        const sw = q.score_weight || 1;
        maxScore += sw;
        if (q.type === 'essay') {
          const es = scores[q.id];
          if (es !== undefined) totalScore += (parseFloat(es) / 100) * sw;
        } else {
          const ans = answerMap[q.id];
          if (ans?.answer === q.correct_answer) totalScore += sw;
        }
      });

      const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const passed = finalScore >= (result.exam_sessions?.passing_score || 75);
      const allEssayGraded = essayQuestions.every(q => scores[q.id] !== undefined);

      const { error } = await supabase.from('exam_results').update({
        answers: updatedAnswers,
        score: finalScore,
        passed,
        status: allEssayGraded ? 'graded' : 'grading',
        updated_at: new Date().toISOString(),
      }).eq('id', result.id);

      if (error) throw error;
      onGraded();
      onClose();
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  if (!result) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ width: '100%', maxWidth: '560px', background: '#fff', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,.15)', animation: 'slideLeft .3s ease' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#64748B', padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
              <ArrowLeft size={14} /> Tutup
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '9px', border: 'none', background: '#0891B2', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? <div style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <Save size={13} />}
              Simpan Nilai
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '16px', color: '#4F46E5', flexShrink: 0 }}>
              {result.profiles?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 3px' }}>{result.profiles?.name}</h2>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>{result.exam_sessions?.title}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: '#F5F3FF', color: '#7C3AED' }}>
                  {essayQuestions.length} soal essay
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: '#F0FDF4', color: '#16A34A' }}>
                  {Object.keys(scores).length}/{essayQuestions.length} sudah dinilai
                </span>
              </div>
            </div>
          </div>
          {saveErr && <div style={{ marginTop: '10px', padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', color: '#DC2626', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '7px' }}><AlertCircle size={12} />{saveErr}</div>}
        </div>

        {/* Essay list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {qLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <div key={i} style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Shimmer h={14} w="70%" /><Shimmer h={60} /><Shimmer h={12} w="40%" />
                </div>
              ))
            : essayQuestions.length === 0
            ? <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>Tidak ada soal essay</div>
            : essayQuestions.map((q, i) => {
                const ans = answerMap[q.id];
                const studentAnswer = ans?.answer;
                const currentScore = scores[q.id];

                return (
                  <div key={q.id} style={{ borderRadius: '14px', border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
                    {/* Question */}
                    <div style={{ padding: '14px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginBottom: '5px' }}>SOAL {i + 1} · Bobot {q.score_weight}</div>
                      <div style={{ fontSize: '13px', color: '#0F172A', lineHeight: 1.6 }}>{q.question}</div>
                    </div>

                    {/* Student answer */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#4F46E5', marginBottom: '6px' }}>JAWABAN SISWA</div>
                      <div style={{ fontSize: '13px', color: studentAnswer ? '#0F172A' : '#94A3B8', lineHeight: 1.6, fontStyle: studentAnswer ? 'normal' : 'italic' }}>
                        {studentAnswer || 'Tidak dijawab'}
                      </div>
                    </div>

                    {/* Rubric */}
                    {q.correct_answer && (
                      <div style={{ padding: '10px 16px', background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#16A34A', marginBottom: '4px' }}>KUNCI / RUBRIK</div>
                        <div style={{ fontSize: '12px', color: '#15803D', lineHeight: 1.5 }}>{q.correct_answer}</div>
                      </div>
                    )}

                    {/* Score input */}
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', flexShrink: 0 }}>Nilai Essay (0–100):</span>
                      <input
                        type="number" min="0" max="100" step="1"
                        value={currentScore ?? ''}
                        onChange={e => {
                          const v = e.target.value;
                          setScores(s => ({ ...s, [q.id]: v === '' ? undefined : Math.min(100, Math.max(0, parseInt(v) || 0)) }));
                        }}
                        placeholder="0–100"
                        style={{ width: '80px', padding: '8px 12px', borderRadius: '9px', border: `1.5px solid ${currentScore !== undefined ? '#BAE6FD' : '#E2E8F0'}`, background: currentScore !== undefined ? '#EFF6FF' : '#F8FAFC', fontSize: '15px', fontFamily: 'Sora, sans-serif', fontWeight: '700', color: '#0891B2', outline: 'none', textAlign: 'center', transition: 'border-color .15s' }}
                        onFocus={e => e.target.style.borderColor = '#0891B2'}
                        onBlur={e => e.target.style.borderColor = currentScore !== undefined ? '#BAE6FD' : '#E2E8F0'}
                      />
                      {currentScore !== undefined && (
                        <span style={{ fontSize: '12px', color: currentScore >= 70 ? '#16A34A' : currentScore >= 50 ? '#D97706' : '#DC2626', fontWeight: '600' }}>
                          {currentScore >= 70 ? '✓ Baik' : currentScore >= 50 ? '~ Cukup' : '✗ Kurang'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
};

// ── Main GradesPage ───────────────────────────────────────────────
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

  const [gradingResult, setGradingResult] = useState(null);
  const [toast,         setToast]         = useState(null);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchMeta = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [sessRes, classRes] = await Promise.all([
        supabase.from('exam_sessions').select('id, title, exam_type, start_time, passing_score, class_id, classes(name)').eq('teacher_id', profile.id).order('start_time', { ascending: false }),
        supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name'),
      ]);
      if (sessRes.error) throw sessRes.error;
      setSessions(sessRes.data || []);
      setClasses(classRes.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id, profile?.school_id]);

  const fetchResults = useCallback(async () => {
    if (!profile?.id || sessions.length === 0) { setResults([]); return; }
    setRLoading(true);
    try {
      const mySessionIds = sessions.map(s => s.id);
      let query = supabase.from('exam_results')
        .select('*, profiles(name, nis, email, class_id), exam_sessions(id, title, exam_type, passing_score, question_bank_id, allow_review, start_time, class_id, classes(name))')
        .in('exam_session_id', mySessionIds)
        .order('submitted_at', { ascending: false })
        .limit(200);
      if (filterSession !== 'all') query = query.eq('exam_session_id', filterSession);
      const { data, error } = await query;
      if (error) throw error;
      let filtered = data || [];
      if (filterClass !== 'all') filtered = filtered.filter(r => r.exam_sessions?.class_id === filterClass);
      setResults(filtered);
    } catch (err) { setError(err.message); }
    finally { setRLoading(false); }
  }, [profile?.id, sessions, filterSession, filterClass]);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => { if (sessions.length > 0 || !loading) fetchResults(); }, [sessions, filterSession, filterClass]);

  const gradedResults = results.filter(r => r.status === 'graded' && r.score !== null);
  const avgScore  = gradedResults.length ? Math.round(gradedResults.reduce((s, r) => s + r.score, 0) / gradedResults.length) : null;
  const passCount = gradedResults.filter(r => r.passed).length;
  const passRate  = gradedResults.length ? Math.round((passCount / gradedResults.length) * 100) : null;
  const needGrading = results.filter(r => r.status === 'grading').length;

  const displayed = results.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSearch = !search || r.profiles?.name?.toLowerCase().includes(search.toLowerCase()) || r.profiles?.nis?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const exportCSV = () => {
    const header = ['Nama Siswa', 'NIS', 'Ujian', 'Kelas', 'Tipe', 'Nilai', 'Lulus', 'Status', 'Waktu Submit'];
    const rows = displayed.map(r => [
      r.profiles?.name || '', r.profiles?.nis || '', r.exam_sessions?.title || '',
      r.exam_sessions?.classes?.name || '', r.exam_sessions?.exam_type || '',
      r.score !== null ? Math.round(r.score) : '', r.passed === true ? 'Ya' : r.passed === false ? 'Tidak' : '',
      r.status, r.submitted_at ? `${fmtDate(r.submitted_at)} ${fmtTime(r.submitted_at)}` : '',
    ]);
    const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `rekap_nilai_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer   { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
        @keyframes spin      { to{transform:rotate(360deg);} }
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
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              {needGrading > 0
                ? <span style={{ color: '#7C3AED', fontWeight: '600' }}>● {needGrading} jawaban essay menunggu penilaian</span>
                : 'Lihat, nilai essay, dan ekspor hasil ujian semua siswa'}
            </p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
          <StatCard icon={Users}       label="Total Hasil"     value={results.length}                              sub="Semua sesi ujian"           color="#0891B2" bg="#EFF6FF" />
          <StatCard icon={CheckCircle2} label="Sudah Dinilai"  value={gradedResults.length}                        sub={`${results.filter(r=>r.status==='submitted').length} menunggu`} color="#16A34A" bg="#F0FDF4" />
          <StatCard icon={Edit3}       label="Essay Pending"   value={needGrading}                                 sub="Perlu dinilai manual"        color="#7C3AED" bg="#F5F3FF" />
          <StatCard icon={BarChart2}   label="Rata-rata Nilai" value={avgScore !== null ? avgScore : '—'}          sub="Dari hasil yang dinilai"     color="#4F46E5" bg="#EEF2FF" />
          <StatCard icon={TrendingUp}  label="Tingkat Lulus"   value={passRate !== null ? `${passRate}%` : '—'}   sub={`${passCount}/${gradedResults.length} lulus`} color="#D97706" bg="#FFFBEB" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .4s ease 100ms forwards' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input type="text" placeholder="Cari nama atau NIS siswa..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: '#0F172A', outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#D97706'; e.target.style.boxShadow = '0 0 0 3px rgba(217,119,6,.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }} />
          </div>
          {[
            { v: filterSession, s: setFilterSession, p: 'Semua Ujian',  opts: sessions.map(s => ({ value: s.id, label: s.title })) },
            { v: filterClass,   s: setFilterClass,   p: 'Semua Kelas',  opts: classes.map(c => ({ value: c.id, label: c.name })) },
            { v: filterStatus,  s: setFilterStatus,  p: 'Semua Status', opts: [{ value:'graded', label:'Dinilai' }, { value:'grading', label:'Essay Pending' }, { value:'submitted', label:'Dikumpul' }, { value:'in_progress', label:'Mengerjakan' }] },
          ].map((f, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <select value={f.v} onChange={e => f.s(e.target.value)}
                style={{ padding: '9px 28px 9px 11px', borderRadius: '10px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', color: f.v !== 'all' ? '#0F172A' : '#94A3B8', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", appearance: 'none', maxWidth: '190px' }}>
                <option value="all">{f.p}</option>
                {f.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            </div>
          ))}
          <span style={{ fontSize: '12px', color: '#94A3B8', alignSelf: 'center' }}>{displayed.length} hasil</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease 140ms forwards' }}>
          {loading || rLoading
            ? <div style={{ padding: '20px' }}>{Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '16px' }}><Shimmer w="130px" /><Shimmer w="70px" /><Shimmer w="160px" /><Shimmer w="80px" /><Shimmer w="60px" /><Shimmer w="80px" /></div>)}</div>
            : displayed.length === 0
            ? <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                  {sessions.length === 0 ? 'Belum ada sesi ujian' : 'Belum ada hasil ujian'}
                </div>
                <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                  {sessions.length === 0 ? 'Buat sesi ujian di Kelola Ujian terlebih dahulu' : 'Hasil muncul setelah siswa mengerjakan ujian'}
                </div>
              </div>
            : <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                        {['Siswa', 'NIS', 'Ujian', 'Kelas', 'Nilai', 'Status', 'Waktu Submit', ''].map(h => (
                          <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map((r, idx) => (
                        <tr key={r.id} className="grade-row" style={{ borderBottom: '1px solid #F8FAFC', background: r.status === 'grading' ? '#FDFAFF' : '#fff', transition: 'background .1s', opacity: 0, animation: `fadeUp .3s ease ${Math.min(idx,15)*25}ms forwards` }}>
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
                          <td style={{ padding: '12px 16px' }}><ScoreCell score={r.score} passed={r.passed} status={r.status} /></td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>{fmtDate(r.submitted_at)}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtTime(r.submitted_at)}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {r.status === 'grading' && (
                              <button onClick={() => setGradingResult(r)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '7px', border: '1.5px solid #E9D5FF', background: '#F5F3FF', fontSize: '12px', fontWeight: '700', color: '#7C3AED', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
                                <Edit3 size={11} /> Nilai
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>Menampilkan {displayed.length} hasil</span>
                  <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={10} style={{ color: '#D97706' }} /> Real-time dari Supabase</span>
                </div>
              </>
          }
        </div>
      </div>

      {/* Essay Grading Drawer */}
      {gradingResult && (
        <EssayGradingDrawer
          result={gradingResult}
          onClose={() => setGradingResult(null)}
          onGraded={() => { fetchResults(); showToast('Nilai essay berhasil disimpan!'); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 300, display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 18px', borderRadius: '12px', background: toast.type === 'error' ? '#DC2626' : '#0F172A', color: '#fff', fontSize: '13px', fontWeight: '500', boxShadow: '0 8px 30px rgba(0,0,0,.2)', fontFamily: "'DM Sans', sans-serif", animation: 'slideUp .25s ease' }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} style={{ color: '#4ADE80' }} />}{toast.msg}
        </div>
      )}
    </>
  );
};

export default GradesPage;
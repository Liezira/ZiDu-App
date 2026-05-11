import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  BarChart2, AlertCircle, RefreshCw, ChevronDown,
  TrendingDown, CheckCircle2, XCircle, HelpCircle,
  BookOpen, Target, Award, FileText,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const round = (n, d = 1) => n !== null && n !== undefined ? +n.toFixed(d) : null;
const pct   = (n, total) => total ? round((n / total) * 100) : 0;

// ── Sub-components ────────────────────────────────────────────────
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

const DifficultyBadge = ({ level }) => {
  const MAP = {
    easy:   { label: 'Mudah',  bg: '#F0FDF4', color: '#16A34A' },
    medium: { label: 'Sedang', bg: '#FFFBEB', color: '#D97706' },
    hard:   { label: 'Sulit',  bg: '#FEF2F2', color: '#DC2626' },
  };
  const m = MAP[level] || { label: level || '—', bg: '#F8FAFC', color: '#64748B' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
};

// Custom tooltip for bar chart
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: '#0F172A', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.2)', fontFamily: "'DM Sans', sans-serif", minWidth: '160px' }}>
      <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Soal #{d.no}</div>
      <div style={{ fontSize: '13px', color: '#F1F5F9', fontWeight: '600', marginBottom: '6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.question}</div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div><div style={{ fontSize: '10px', color: '#64748B' }}>Salah</div><div style={{ fontSize: '15px', fontWeight: '700', color: '#F87171' }}>{d.wrongPct}%</div></div>
        <div><div style={{ fontSize: '10px', color: '#64748B' }}>Benar</div><div style={{ fontSize: '15px', fontWeight: '700', color: '#4ADE80' }}>{d.correctPct}%</div></div>
        <div><div style={{ fontSize: '10px', color: '#64748B' }}>Kosong</div><div style={{ fontSize: '15px', fontWeight: '700', color: '#94A3B8' }}>{d.unansweredPct}%</div></div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────
const TeacherAnalytics = () => {
  const { profile } = useAuth();

  const [sessions,     setSessions]     = useState([]);
  const [selectedSess, setSelectedSess] = useState('');
  const [sessionData,  setSessionData]  = useState(null); // { session, results, questions, analysis }
  const [loading,      setLoading]      = useState(false);
  const [metaLoading,  setMetaLoading]  = useState(true);
  const [error,        setError]        = useState('');
  const [refreshing,   setRefreshing]   = useState(false);

  // Load exam sessions for this teacher
  const fetchSessions = useCallback(async () => {
    if (!profile?.id) return;
    setMetaLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('exam_sessions')
        .select('id, title, exam_type, start_time, question_bank_id, classes(name)')
        .eq('teacher_id', profile.id)
        .order('start_time', { ascending: false });

      if (err) throw err;
      setSessions(data || []);
      if (data?.length && !selectedSess) setSelectedSess(data[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setMetaLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Load analysis for selected session
  const fetchAnalysis = useCallback(async () => {
    if (!selectedSess) return;
    setLoading(true); setError('');
    try {
      const sess = sessions.find(s => s.id === selectedSess);
      if (!sess) return;

      // Load results
      const { data: results, error: rErr } = await supabase
        .from('exam_results')
        .select('id, student_id, answers, score, passed, status, profiles(name, nis)')
        .eq('exam_session_id', selectedSess)
        .in('status', ['submitted', 'graded']);

      if (rErr) throw rErr;

      // Load questions with correct_answer (teacher can see)
      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('id, type, question, options, correct_answer, difficulty, score_weight, tags')
        .eq('bank_id', sess.question_bank_id)
        .order('created_at');

      if (qErr) throw qErr;

      // Analyse per question
      const totalRespondents = results.length;
      const analysis = (questions || []).map((q, idx) => {
        let correct = 0, wrong = 0, unanswered = 0;

        results.forEach(r => {
          const ans = (r.answers || []).find(a => a.question_id === q.id);
          if (!ans || ans.answer === null || ans.answer === '') {
            unanswered++;
          } else if (q.type !== 'essay' && ans.answer === q.correct_answer) {
            correct++;
          } else {
            wrong++;
          }
        });

        const wrongPct      = pct(wrong, totalRespondents);
        const correctPct    = pct(correct, totalRespondents);
        const unansweredPct = pct(unanswered, totalRespondents);

        // Actual difficulty based on wrong rate
        const actualDiff = wrongPct >= 60 ? 'hard' : wrongPct >= 35 ? 'medium' : 'easy';

        return {
          no: idx + 1,
          id: q.id,
          question: q.question,
          type: q.type,
          settingDiff: q.difficulty,
          actualDiff,
          correct, wrong, unanswered,
          correctPct, wrongPct, unansweredPct,
          correct_answer: q.correct_answer,
          options: q.options,
          score_weight: q.score_weight,
          diffMismatch: q.difficulty !== actualDiff && q.type !== 'essay',
        };
      });

      // Sort by wrong% descending for chart
      const chartData = [...analysis].sort((a, b) => b.wrongPct - a.wrongPct);

      setSessionData({
        session: sess,
        results,
        questions,
        analysis,
        chartData,
        totalRespondents,
        avgScore: results.length ? round(results.reduce((s, r) => s + (r.score || 0), 0) / results.length) : null,
        passCount: results.filter(r => r.passed).length,
        hardestQ: analysis.filter(a => a.type !== 'essay').sort((a, b) => b.wrongPct - a.wrongPct)[0],
        easiestQ: analysis.filter(a => a.type !== 'essay').sort((a, b) => a.wrongPct - b.wrongPct)[0],
        diffMismatches: analysis.filter(a => a.diffMismatch),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSess, sessions]);

  useEffect(() => { if (selectedSess) fetchAnalysis(); }, [selectedSess, fetchAnalysis]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        .q-row:hover { background: #FAFBFF !important; }
        .sess-opt { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Header ── */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={15} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Analitik Ujian</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Analisis soal paling sulit dan distribusi jawaban siswa</p>
          </div>
          <button onClick={() => { setRefreshing(true); fetchSessions(); fetchAnalysis(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />Refresh
          </button>
        </div>

        {/* ── Session Selector ── */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease 60ms forwards', background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <FileText size={15} style={{ color: '#64748B' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Pilih Ujian:</span>
          </div>
          {metaLoading ? (
            <Shimmer h={36} w={260} r={9} />
          ) : sessions.length === 0 ? (
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>Belum ada ujian yang dibuat</span>
          ) : (
            <div style={{ position: 'relative' }}>
              <select
                value={selectedSess}
                onChange={e => setSelectedSess(e.target.value)}
                style={{ padding: '9px 36px 9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', fontWeight: '600', color: '#0F172A', cursor: 'pointer', appearance: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", minWidth: '260px' }}>
                {sessions.map(s => (
                  <option key={s.id} value={s.id} className="sess-opt">
                    {s.title} — {s.classes?.name || 'Semua'} · {fmtDate(s.start_time)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} />{error}
          </div>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            {[...Array(4)].map((_, i) => <div key={i} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '18px', height: '80px' }}><Shimmer h={12} w="60%" /><div style={{ marginTop: 8 }} /><Shimmer h={24} w="40%" /></div>)}
          </div>
        )}

        {!loading && sessionData && (
          <>
            {/* ── Summary Stats ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 120ms forwards' }}>
              <StatCard icon={FileText}     label="Total Peserta"   value={sessionData.totalRespondents}                                                  sub="Mengumpulkan jawaban"   color="#0891B2" bg="#EFF6FF" />
              <StatCard icon={Award}        label="Rata-rata Nilai" value={sessionData.avgScore !== null ? sessionData.avgScore : '—'}                     sub="Dari peserta dinilai"   color="#D97706" bg="#FFFBEB" />
              <StatCard icon={CheckCircle2} label="Tingkat Lulus"   value={sessionData.totalRespondents ? `${pct(sessionData.passCount, sessionData.totalRespondents)}%` : '—'} sub={`${sessionData.passCount} dari ${sessionData.totalRespondents}`} color="#16A34A" bg="#F0FDF4" />
              <StatCard icon={Target}       label="Total Soal"      value={sessionData.analysis.length}                                                     sub={`${sessionData.diffMismatches.length} mismatch kesulitan`} color="#7C3AED" bg="#F5F3FF" />
            </div>

            {/* ── Hardest / Easiest Highlight ── */}
            {(sessionData.hardestQ || sessionData.easiestQ) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 180ms forwards' }}>
                {sessionData.hardestQ && (
                  <div style={{ background: '#FEF2F2', borderRadius: '14px', border: '1px solid #FECACA', padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <TrendingDown size={14} style={{ color: '#DC2626' }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626' }}>SOAL PALING SULIT</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: '500', marginBottom: '6px', lineHeight: 1.5 }}>
                      #{sessionData.hardestQ.no} — {sessionData.hardestQ.question.slice(0, 80)}{sessionData.hardestQ.question.length > 80 ? '…' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '800', color: '#DC2626' }}>{sessionData.hardestQ.wrongPct}%</span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>menjawab salah</span>
                    </div>
                  </div>
                )}
                {sessionData.easiestQ && (
                  <div style={{ background: '#F0FDF4', borderRadius: '14px', border: '1px solid #BBF7D0', padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#16A34A' }}>SOAL PALING MUDAH</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: '500', marginBottom: '6px', lineHeight: 1.5 }}>
                      #{sessionData.easiestQ.no} — {sessionData.easiestQ.question.slice(0, 80)}{sessionData.easiestQ.question.length > 80 ? '…' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '800', color: '#16A34A' }}>{sessionData.easiestQ.correctPct}%</span>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>menjawab benar</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Bar Chart: Wrong Rate per Soal ── */}
            {sessionData.totalRespondents > 0 && (
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease 240ms forwards' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>Tingkat Kesalahan per Soal</h2>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Diurutkan dari yang paling banyak salah. Hover soal untuk detail.</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={sessionData.chartData} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="no" tickFormatter={v => `S${v}`} tick={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,70,229,.04)' }} />
                    <Bar dataKey="wrongPct" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {sessionData.chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.wrongPct >= 60 ? '#EF4444' : entry.wrongPct >= 35 ? '#F59E0B' : '#22C55E'} />
                      ))}
                      <LabelList dataKey="wrongPct" position="top" formatter={v => `${v}%`} style={{ fontSize: '10px', fill: '#64748B', fontFamily: "'DM Sans', sans-serif", fontWeight: '600' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                  {[{ color: '#EF4444', label: '≥60% salah (Sulit)' }, { color: '#F59E0B', label: '35-59% salah (Sedang)' }, { color: '#22C55E', label: '<35% salah (Mudah)' }].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color }} />
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Detail Table ── */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: 'fadeUp .4s ease 300ms forwards' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Detail Analisis Soal</h2>
                {sessionData.diffMismatches.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#FFFBEB', borderRadius: '999px', border: '1px solid #FDE68A' }}>
                    <HelpCircle size={12} style={{ color: '#D97706' }} />
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#D97706' }}>{sessionData.diffMismatches.length} mismatch tingkat kesulitan</span>
                  </div>
                )}
              </div>

              {sessionData.totalRespondents === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <BookOpen size={32} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
                  <div style={{ fontSize: '14px', color: '#94A3B8' }}>Belum ada siswa yang mengumpulkan jawaban</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {['No', 'Soal', 'Tipe', 'Kesulitan Setting', 'Kesulitan Aktual', 'Benar', 'Salah', 'Kosong'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#64748B', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessionData.analysis.map((q) => (
                        <tr key={q.id} className="q-row" style={{ borderBottom: '1px solid #F8FAFC', transition: 'background .15s' }}>
                          <td style={{ padding: '12px 14px', fontFamily: 'Sora, sans-serif', fontWeight: '700', color: '#94A3B8', fontSize: '12px' }}>#{q.no}</td>
                          <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                            <div style={{ color: '#0F172A', fontWeight: '500', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{q.question}</div>
                            {q.diffMismatch && (
                              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <HelpCircle size={10} style={{ color: '#D97706' }} />
                                <span style={{ fontSize: '10px', color: '#D97706', fontWeight: '600' }}>Setting vs aktual berbeda</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: q.type === 'essay' ? '#F5F3FF' : '#F0F9FF', color: q.type === 'essay' ? '#7C3AED' : '#0891B2' }}>
                              {q.type === 'multiple_choice' ? 'PG' : q.type === 'true_false' ? 'B/S' : 'Essay'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}><DifficultyBadge level={q.settingDiff} /></td>
                          <td style={{ padding: '12px 14px' }}>
                            {q.type === 'essay' ? <span style={{ fontSize: '11px', color: '#94A3B8' }}>Manual</span> : <DifficultyBadge level={q.actualDiff} />}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: '#F0FDF4', overflow: 'hidden' }}>
                                <div style={{ width: `${q.correctPct}%`, height: '100%', background: '#22C55E', borderRadius: '2px' }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#16A34A' }}>{q.correctPct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: '#FEF2F2', overflow: 'hidden' }}>
                                <div style={{ width: `${q.wrongPct}%`, height: '100%', background: '#EF4444', borderRadius: '2px' }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#DC2626' }}>{q.wrongPct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>{q.unansweredPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Difficulty Mismatch Warning ── */}
            {sessionData.diffMismatches.length > 0 && (
              <div style={{ background: '#FFFBEB', borderRadius: '14px', border: '1px solid #FDE68A', padding: '16px 18px', opacity: 0, animation: 'fadeUp .4s ease 360ms forwards' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <HelpCircle size={15} style={{ color: '#D97706' }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#92400E' }}>Rekomendasi Kalibrasi Soal</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {sessionData.diffMismatches.map(q => (
                    <div key={q.id} style={{ fontSize: '12px', color: '#78350F', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', flexShrink: 0 }}>Soal #{q.no}</span>
                      <span>Setting: <strong>{q.settingDiff}</strong> → Aktual: <strong>{q.actualDiff}</strong> ({q.wrongPct}% salah)</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#92400E', margin: '10px 0 0', opacity: 0.8 }}>
                  Pertimbangkan untuk mengupdate tingkat kesulitan soal agar sesuai dengan data aktual jawaban siswa.
                </p>
              </div>
            )}
          </>
        )}

        {!loading && !sessionData && !metaLoading && sessions.length > 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BarChart2 size={40} style={{ color: '#E2E8F0', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', color: '#94A3B8' }}>Pilih ujian di atas untuk melihat analitik</div>
          </div>
        )}

      </div>
    </>
  );
};

export default TeacherAnalytics;
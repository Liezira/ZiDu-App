import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Award, CheckCircle2, XCircle, Clock, AlertCircle,
  RefreshCw, ChevronDown, ChevronUp, BookOpen, Target,
  TrendingUp, BarChart2, Eye, EyeOff, Zap, ArrowLeft,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
const round   = (n) => n !== null && n !== undefined ? Math.round(n) : null;

const STATUS_META = {
  graded:      { label: 'Dinilai',      bg: '#F0FDF4', color: '#16A34A', icon: CheckCircle2 },
  submitted:   { label: 'Dikumpulkan',  bg: '#EFF6FF', color: '#2563EB', icon: Clock },
  grading:     { label: 'Menunggu Nilai', bg: '#F5F3FF', color: '#7C3AED', icon: Clock },
  in_progress: { label: 'Berlangsung',  bg: '#FFFBEB', color: '#D97706', icon: Clock },
};

const TYPE_META = {
  multiple_choice: { label: 'PG',    bg: '#EEF2FF', color: '#4F46E5' },
  essay:           { label: 'Essay', bg: '#EFF6FF', color: '#0891B2' },
  true_false:      { label: 'B/S',   bg: '#F5F3FF', color: '#7C3AED' },
};

const DIFF_META = {
  easy:   { label: 'Mudah', color: '#16A34A' },
  medium: { label: 'Sedang', color: '#D97706' },
  hard:   { label: 'Sulit',  color: '#DC2626' },
};

// ── Score Ring ────────────────────────────────────────────────────
const ScoreRing = ({ score, passed, size = 52 }) => {
  const s = round(score);
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const pct  = s !== null ? Math.min(100, Math.max(0, s)) / 100 : 0;
  const color = passed === true ? '#16A34A' : passed === false ? '#DC2626' : '#0891B2';
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
      {s !== null && (
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dasharray .8s ease' }} />
      )}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: s !== null ? '14px' : '10px', fill: s !== null ? color : '#94A3B8' }}>
        {s !== null ? s : '—'}
      </text>
    </svg>
  );
};

// ── Shimmer ───────────────────────────────────────────────────────
const Shimmer = ({ h = 14, w = '100%', r = 6 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

// ── Answer Review Drawer ──────────────────────────────────────────
const ReviewDrawer = ({ result, questions, onClose }) => {
  const [showCorrect, setShowCorrect] = useState(true);
  if (!result) return null;

  const answers = Array.isArray(result.answers) ? result.answers : [];
  const answerMap = {};
  answers.forEach(a => { if (a.question_id) answerMap[a.question_id] = a.answer; });

  const optLabels = ['A', 'B', 'C', 'D'];

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
            <button onClick={() => setShowCorrect(s => !s)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {showCorrect ? <EyeOff size={12} /> : <Eye size={12} />}
              {showCorrect ? 'Sembunyikan kunci' : 'Tampilkan kunci'}
            </button>
          </div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: '0 0 6px' }}>
            Review Jawaban
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{result.exam_sessions?.title}</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[
              { label: 'Benar',  value: result.total_correct ?? '—',    color: '#16A34A', bg: '#F0FDF4' },
              { label: 'Salah',  value: result.total_wrong ?? '—',      color: '#DC2626', bg: '#FEF2F2' },
              { label: 'Kosong', value: result.total_unanswered ?? '—', color: '#94A3B8', bg: '#F8FAFC' },
              { label: 'Nilai',  value: round(result.score) ?? '—',     color: result.passed ? '#16A34A' : '#DC2626', bg: result.passed ? '#F0FDF4' : '#FEF2F2' },
            ].map(s => (
              <div key={s.label} style={{ padding: '5px 12px', borderRadius: '999px', background: s.bg, fontSize: '12px', fontWeight: '700', color: s.color }}>
                {s.label}: {s.value}
              </div>
            ))}
          </div>
        </div>

        {/* Questions list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {questions.length === 0
            ? <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>Data soal tidak tersedia</div>
            : questions.map((q, i) => {
                const userAnswer  = answerMap[q.id];
                const isCorrect   = q.type !== 'essay' && userAnswer === q.correct_answer;
                const isWrong     = q.type !== 'essay' && userAnswer && userAnswer !== q.correct_answer;
                const isUnanswered = !userAnswer;
                const tm = TYPE_META[q.type] || TYPE_META.multiple_choice;
                const dm = DIFF_META[q.difficulty] || DIFF_META.medium;

                return (
                  <div key={q.id} style={{ borderRadius: '14px', border: `1.5px solid ${isCorrect ? '#BBF7D0' : isWrong ? '#FECACA' : isUnanswered ? '#F1F5F9' : '#E2E8F0'}`, overflow: 'hidden', background: isCorrect ? '#FAFFFE' : isWrong ? '#FFFAFA' : '#FAFBFF' }}>
                    {/* Question header */}
                    <div style={{ padding: '13px 16px', borderBottom: '1px solid rgba(0,0,0,.04)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: isCorrect ? '#F0FDF4' : isWrong ? '#FEF2F2' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isCorrect   ? <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                         : isWrong   ? <XCircle size={14} style={{ color: '#DC2626' }} />
                         : isUnanswered && q.type !== 'essay' ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CBD5E1' }} />
                         : <span style={{ fontSize: '10px', color: '#94A3B8' }}>?</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: '700', background: tm.bg, color: tm.color }}>{tm.label}</span>
                          <span style={{ padding: '1px 7px', borderRadius: '999px', fontSize: '10px', fontWeight: '600', color: dm.color, background: '#F8FAFC' }}>{dm.label}</span>
                          <span style={{ padding: '1px 7px', borderRadius: '999px', fontSize: '10px', color: '#94A3B8', background: '#F8FAFC' }}>Bobot {q.score_weight}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#0F172A', lineHeight: 1.6, fontWeight: '400' }}>
                          <span style={{ fontWeight: '700', color: '#64748B', marginRight: '6px' }}>{i + 1}.</span>
                          {q.question}
                        </div>
                      </div>
                    </div>

                    {/* Answer area */}
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {q.type === 'multiple_choice' && (
                        <>
                          {q.options?.map((opt, oi) => {
                            const lbl = optLabels[oi];
                            const isUser    = userAnswer === lbl;
                            const isCorrectOpt = lbl === q.correct_answer;
                            let bg = '#F8FAFC', border = '#F1F5F9', color = '#374151';
                            if (showCorrect && isCorrectOpt) { bg = '#F0FDF4'; border = '#BBF7D0'; color = '#15803D'; }
                            if (isUser && !isCorrectOpt)     { bg = '#FEF2F2'; border = '#FECACA'; color = '#B91C1C'; }
                            return (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '8px', background: bg, border: `1px solid ${border}` }}>
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color, flexShrink: 0 }}>{lbl}</div>
                                <span style={{ fontSize: '13px', color, flex: 1 }}>{opt}</span>
                                {isUser && <span style={{ fontSize: '10px', fontWeight: '700', color }}>{isCorrectOpt ? '✓ Jawaban kamu (Benar)' : '✗ Jawaban kamu'}</span>}
                                {showCorrect && isCorrectOpt && !isUser && <span style={{ fontSize: '10px', fontWeight: '700', color: '#16A34A' }}>✓ Kunci jawaban</span>}
                              </div>
                            );
                          })}
                        </>
                      )}

                      {q.type === 'true_false' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['Benar', 'Salah'].map(v => {
                            const isUser = userAnswer === v;
                            const isCorrectOpt = v === q.correct_answer;
                            let bg = '#F8FAFC', border = '#F1F5F9', color = '#64748B';
                            if (showCorrect && isCorrectOpt) { bg = '#F0FDF4'; border = '#BBF7D0'; color = '#15803D'; }
                            if (isUser && !isCorrectOpt)     { bg = '#FEF2F2'; border = '#FECACA'; color = '#B91C1C'; }
                            return (
                              <div key={v} style={{ flex: 1, padding: '9px', borderRadius: '8px', background: bg, border: `1px solid ${border}`, textAlign: 'center', fontSize: '13px', fontWeight: '600', color }}>
                                {v === 'Benar' ? '✓ ' : '✗ '}{v}
                                {isUser && <div style={{ fontSize: '10px', marginTop: '2px' }}>Jawaban kamu</div>}
                                {showCorrect && isCorrectOpt && !isUser && <div style={{ fontSize: '10px', marginTop: '2px' }}>Kunci</div>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === 'essay' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', marginBottom: '4px' }}>JAWABAN KAMU</div>
                            <div style={{ fontSize: '13px', color: '#0F172A', lineHeight: 1.6 }}>{userAnswer || <span style={{ color: '#CBD5E1', fontStyle: 'italic' }}>Tidak dijawab</span>}</div>
                          </div>
                          {showCorrect && q.correct_answer && (
                            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                              <div style={{ fontSize: '11px', fontWeight: '700', color: '#16A34A', marginBottom: '4px' }}>KUNCI / RUBRIK</div>
                              <div style={{ fontSize: '13px', color: '#15803D', lineHeight: 1.6 }}>{q.correct_answer}</div>
                            </div>
                          )}
                        </div>
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

// ── Result Card ───────────────────────────────────────────────────
const ResultCard = ({ result, onReview, delay = 0 }) => {
  const sm = STATUS_META[result.status] || { label: result.status, bg: '#F8FAFC', color: '#64748B', icon: Clock };
  const Icon = sm.icon;
  const canReview = result.status === 'graded' && result.exam_sessions?.allow_review;
  const score = round(result.score);

  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: `fadeUp .4s ease ${delay}ms forwards` }}>
      {/* Top bar */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center', borderBottom: '1px solid #F8FAFC' }}>
        <ScoreRing score={score} passed={result.passed} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result.exam_sessions?.title || 'Ujian'}
          </h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: sm.bg, color: sm.color }}>
              <Icon size={10} />{sm.label}
            </span>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>{result.exam_sessions?.exam_type}</span>
            {result.passed !== null && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: result.passed ? '#16A34A' : '#DC2626' }}>
                {result.passed ? '✓ Lulus' : '✗ Tidak Lulus'}
              </span>
            )}
          </div>
        </div>
        {canReview && (
          <button onClick={() => onReview(result)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 13px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: '12px', fontWeight: '600', color: '#374151', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Eye size={12} /> Review
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {[
          { label: 'Benar',   value: result.total_correct    ?? '—', color: '#16A34A' },
          { label: 'Salah',   value: result.total_wrong      ?? '—', color: '#DC2626' },
          { label: 'Kosong',  value: result.total_unanswered ?? '—', color: '#94A3B8' },
          { label: 'KKM',     value: result.exam_sessions?.passing_score ?? '—', color: '#D97706' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#94A3B8' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer date */}
      <div style={{ padding: '8px 20px', borderTop: '1px solid #F8FAFC', fontSize: '11px', color: '#94A3B8' }}>
        {result.submitted_at ? `Dikumpulkan ${fmtDate(result.submitted_at)} · ${fmtTime(result.submitted_at)}` : `Mulai ${fmtDate(result.started_at)}`}
        {result.violation_count > 0 && <span style={{ marginLeft: '10px', color: '#DC2626', fontWeight: '600' }}>⚠ {result.violation_count} pelanggaran</span>}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────
const StudentResults = () => {
  const { profile } = useAuth();
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewLoading,   setReviewLoading]   = useState(false);

  const fetchResults = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*, exam_sessions(id, title, exam_type, passing_score, allow_review, question_bank_id, start_time, end_time, duration_minutes, classes(name))')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setResults(data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleReview = async (result) => {
    setReviewResult(result);
    setReviewLoading(true);
    const bankId = result.exam_sessions?.question_bank_id;
    if (bankId) {
      const { data } = await supabase.from('questions').select('*').eq('bank_id', bankId);
      setReviewQuestions(data || []);
    }
    setReviewLoading(false);
  };

  // Stats
  const graded    = results.filter(r => r.status === 'graded' && r.score !== null);
  const avgScore  = graded.length ? Math.round(graded.reduce((s, r) => s + r.score, 0) / graded.length) : null;
  const bestScore = graded.length ? Math.round(Math.max(...graded.map(r => r.score))) : null;
  const passCount = graded.filter(r => r.passed).length;
  const passRate  = graded.length ? Math.round((passCount / graded.length) * 100) : null;

  const displayed = results.filter(r => filterStatus === 'all' || r.status === filterStatus);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp    { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer   { 0%{background-position:-400px 0;}100%{background-position:400px 0;} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);} }
        @keyframes spin      { to{transform:rotate(360deg);} }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* Header */}
        <div style={{ opacity: 0, animation: 'fadeUp .4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={15} style={{ color: '#D97706' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Riwayat Nilai</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Semua hasil ujian kamu di satu tempat</p>
          </div>
          <button onClick={() => { setRefreshing(true); fetchResults(); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }} />Refresh
          </button>
        </div>

        {error && <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', opacity: 0, animation: 'fadeUp .4s ease 60ms forwards' }}>
          {[
            { icon: BookOpen,   label: 'Total Ujian',    value: results.length,                                   color: '#4F46E5', bg: '#EEF2FF' },
            { icon: BarChart2,  label: 'Rata-rata',      value: avgScore !== null ? avgScore : '—',               color: '#0891B2', bg: '#EFF6FF' },
            { icon: Award,      label: 'Nilai Terbaik',  value: bestScore !== null ? bestScore : '—',             color: '#D97706', bg: '#FFFBEB' },
            { icon: TrendingUp, label: 'Tingkat Lulus',  value: passRate !== null ? `${passRate}%` : '—',        color: '#16A34A', bg: '#F0FDF4' },
            { icon: Target,     label: 'Sudah Lulus',    value: `${passCount}/${graded.length}`,                  color: '#7C3AED', bg: '#F5F3FF' },
          ].map((c, i) => (
            <div key={c.label} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,.03)', opacity: 0, animation: `fadeUp .35s ease ${i * 40}ms forwards` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B' }}>{c.label}</span>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <c.icon size={13} style={{ color: c.color }} />
                </div>
              </div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', lineHeight: 1 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {graded.length > 0 && (
          <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #F1F5F9', padding: '18px 20px', opacity: 0, animation: 'fadeUp .4s ease 120ms forwards' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Performa Keseluruhan</span>
              <span style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'Sora, sans-serif', color: '#0F172A' }}>{avgScore ?? '—'} / 100</span>
            </div>
            <div style={{ height: '10px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: avgScore >= 70 ? 'linear-gradient(90deg,#16A34A,#4ADE80)' : avgScore >= 50 ? 'linear-gradient(90deg,#D97706,#FBBF24)' : 'linear-gradient(90deg,#DC2626,#F87171)', width: `${Math.min(100, avgScore ?? 0)}%`, transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#94A3B8' }}>
              <span>0</span><span>50</span><span>100</span>
            </div>
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', opacity: 0, animation: 'fadeUp .4s ease 140ms forwards', alignItems: 'center' }}>
          {[
            { v: 'all',         label: 'Semua' },
            { v: 'graded',      label: 'Dinilai' },
            { v: 'grading',     label: 'Menunggu Nilai' },
            { v: 'submitted',   label: 'Dikumpulkan' },
          ].map(f => (
            <button key={f.v} onClick={() => setFilterStatus(f.v)}
              style={{ padding: '7px 14px', borderRadius: '999px', border: `1.5px solid ${filterStatus === f.v ? '#D97706' : '#E2E8F0'}`, background: filterStatus === f.v ? '#FFFBEB' : '#fff', fontSize: '12px', fontWeight: '600', color: filterStatus === f.v ? '#D97706' : '#64748B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all .15s' }}>
              {f.label}
            </button>
          ))}
          <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: '4px' }}>{displayed.length} hasil</span>
        </div>

        {/* Results list */}
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '20px', display: 'flex', gap: '14px' }}>
                <Shimmer w="56px" h={56} r={99} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}><Shimmer h={16} w="60%" /><Shimmer h={12} w="40%" /></div>
              </div>
            ))
          : displayed.length === 0
          ? <div style={{ padding: '64px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                {results.length === 0 ? 'Belum ada riwayat ujian' : 'Tidak ada hasil ditemukan'}
              </div>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>
                {results.length === 0 ? 'Ikuti ujian dari halaman Dashboard untuk mulai' : 'Coba ubah filter status'}
              </div>
            </div>
          : displayed.map((r, i) => (
              <ResultCard key={r.id} result={r} onReview={handleReview} delay={i * 50} />
            ))
        }

        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0, animation: 'fadeUp .4s ease 300ms forwards' }}>
          <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={10} style={{ color: '#D97706' }} /> Real-time dari Supabase
          </span>
        </div>
      </div>

      {/* Review Drawer */}
      {reviewResult && (
        <ReviewDrawer
          result={reviewResult}
          questions={reviewLoading ? [] : reviewQuestions}
          onClose={() => { setReviewResult(null); setReviewQuestions([]); }}
        />
      )}
    </>
  );
};

export default StudentResults;
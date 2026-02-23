import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Award, Clock, CheckCircle2, XCircle,
  RefreshCw, AlertCircle, TrendingUp, BookOpen,
  Zap, Target, Calendar, ChevronRight,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

const getCountdown = (startTime) => {
  const diff = new Date(startTime) - new Date();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)} hari lagi`;
  if (h > 0)  return `${h}j ${m}m lagi`;
  return `${m} menit lagi`;
};

// ── Sub-components ────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, bg, delay = 0 }) => (
  <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', opacity: 0, animation: `fadeUp 0.4s ease ${delay}ms forwards` }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', letterSpacing: '0.03em' }}>{label}</span>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} style={{ color }} />
      </div>
    </div>
    <div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A', lineHeight: 1, fontFamily: 'Sora, sans-serif' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '5px' }}>{sub}</div>}
    </div>
  </div>
);

const SectionCard = ({ title, icon: Icon, iconColor = '#4F46E5', iconBg = '#EEF2FF', right, children, delay = 0 }) => (
  <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', opacity: 0, animation: `fadeUp 0.4s ease ${delay}ms forwards` }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} style={{ color: iconColor }} />
        </div>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: 0 }}>{title}</h3>
      </div>
      {right}
    </div>
    <div style={{ padding: '4px 20px 12px' }}>{children}</div>
  </div>
);

const EmptyState = ({ icon, text }) => (
  <div style={{ padding: '32px 0', textAlign: 'center' }}>
    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontSize: '13px', color: '#94A3B8' }}>{text}</div>
  </div>
);

const Shimmer = ({ h = 14, w = '100%', r = 6 }) => (
  <div style={{ height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

// Score ring visual
const ScoreRing = ({ score, passed, size = 44 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(100, Math.max(0, score ?? 0)) / 100;
  const color = passed ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color, fontFamily: 'Sora, sans-serif' }}>
        {score !== null ? Math.round(score) : '—'}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id || !profile?.class_id) {
      setLoading(false);
      return;
    }
    try {
      // Ambil sesi ujian untuk kelas siswa + hasil ujian siswa
      const [sessionsRes, resultsRes] = await Promise.all([
        supabase.from('exam_sessions')
          .select('id, title, exam_type, start_time, end_time, duration_minutes, passing_score, total_questions, token_status, subjects(name, code)')
          .eq('class_id', profile.class_id)
          .order('start_time', { ascending: false })
          .limit(30),

        supabase.from('exam_results')
          .select('id, status, score, mc_score, essay_score, passed, submitted_at, exam_session_id, exam_sessions(title, start_time, exam_type, passing_score)')
          .eq('student_id', profile.id)
          .order('submitted_at', { ascending: false })
          .limit(20),
      ]);

      const sessions = sessionsRes.data || [];
      const results  = resultsRes.data  || [];

      const now = new Date();
      const resultSessionIds = new Set(results.map(r => r.exam_session_id));

      // Kategorisasi sesi
      const liveSessions     = sessions.filter(s => new Date(s.start_time) <= now && new Date(s.end_time) >= now && !resultSessionIds.has(s.id));
      const upcomingSessions = sessions.filter(s => new Date(s.start_time) > now).slice(0, 5);
      const availableSessions = [...liveSessions, ...upcomingSessions];

      // In-progress (sudah mulai tapi belum submit)
      const inProgressResult = results.find(r => r.status === 'in_progress');

      // Stats
      const gradedResults = results.filter(r => r.status === 'graded' && r.score !== null);
      const avgScore = gradedResults.length
        ? Math.round(gradedResults.reduce((sum, r) => sum + r.score, 0) / gradedResults.length)
        : null;
      const passCount = gradedResults.filter(r => r.passed).length;
      const passRate  = gradedResults.length ? Math.round((passCount / gradedResults.length) * 100) : null;
      const bestScore = gradedResults.length ? Math.max(...gradedResults.map(r => r.score)) : null;

      setData({
        availableSessions,
        liveSessions,
        upcomingSessions,
        inProgressResult,
        recentResults: results.slice(0, 8),
        allResults: results,
        stats: {
          totalExams:   results.length,
          completed:    results.filter(r => ['graded','submitted'].includes(r.status)).length,
          avgScore,
          passRate,
          bestScore,
          passCount,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id, profile?.class_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const name = profile?.name || 'Siswa';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;} 100%{background-position:400px 0;} }
        @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        .exam-card:hover   { box-shadow: 0 4px 20px rgba(79,70,229,0.1) !important; transform: translateY(-1px); }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Header ── */}
        <div style={{ opacity: 0, animation: 'fadeUp 0.4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>
              {greeting}, <span style={{ color: '#4F46E5' }}>{name}</span> 👋
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              {!profile?.class_id
                ? <span style={{ color: '#D97706' }}>⚠ Kamu belum terdaftar di kelas manapun</span>
                : data?.liveSessions?.length
                ? <span style={{ color: '#DC2626', fontWeight: '600' }}>● {data.liveSessions.length} ujian sedang berlangsung — segera kerjakan!</span>
                : data?.inProgressResult
                ? <span style={{ color: '#D97706', fontWeight: '600' }}>◷ Kamu punya ujian yang belum selesai</span>
                : 'Pantau jadwal ujian dan riwayat nilaimu'}
            </p>
          </div>
          <button onClick={() => { setRefreshing(true); fetchData(); }} disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} />{error}
          </div>
        )}

        {/* ── No Class Warning ── */}
        {!loading && !profile?.class_id && (
          <div style={{ padding: '20px 24px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '14px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ fontSize: '24px', flexShrink: 0 }}>📋</div>
            <div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#92400E', marginBottom: '4px' }}>Belum Terdaftar di Kelas</div>
              <div style={{ fontSize: '13px', color: '#78350F' }}>Kamu belum terdaftar di kelas manapun. Hubungi Admin Sekolah untuk mendaftarkan kamu ke kelas yang sesuai.</div>
            </div>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><Shimmer w="80px" /><Shimmer w="36px" h={36} r={10} /></div>
              <Shimmer w="50px" h={28} r={8} /><Shimmer w="90px" h={11} />
            </div>
          )) : data && <>
            <StatCard icon={FileText}    label="Ujian Diikuti"    value={fmt(data.stats.totalExams)}   sub="Sepanjang waktu"                                   color="#4F46E5" bg="#EEF2FF" delay={0}   />
            <StatCard icon={CheckCircle2} label="Selesai"         value={fmt(data.stats.completed)}    sub="Sudah dikumpul/dinilai"                            color="#16A34A" bg="#F0FDF4" delay={60}  />
            <StatCard icon={Target}      label="Rata-rata Nilai"  value={data.stats.avgScore ?? '—'}   sub="Dari ujian yang sudah dinilai"                     color="#0891B2" bg="#EFF6FF" delay={120} />
            <StatCard icon={Award}       label="Nilai Terbaik"    value={data.stats.bestScore !== null ? Math.round(data.stats.bestScore) : '—'} sub="Nilai tertinggi yang pernah" color="#D97706" bg="#FFFBEB" delay={180} />
            <StatCard icon={TrendingUp}  label="Tingkat Lulus"    value={data.stats.passRate !== null ? `${data.stats.passRate}%` : '—'} sub={`${data.stats.passCount} dari ${data.stats.completed} ujian`} color="#7C3AED" bg="#F5F3FF" delay={240} />
          </>}
        </div>

        {/* ── In Progress Alert ── */}
        {!loading && data?.inProgressResult && (
          <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', border: '1px solid #FDE68A', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0, animation: 'fadeUp 0.4s ease 280ms forwards' }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '14px', color: '#92400E', marginBottom: '3px' }}>Ujian Belum Selesai</div>
              <div style={{ fontSize: '13px', color: '#78350F' }}>{data.inProgressResult.exam_sessions?.title} — Segera lanjutkan sebelum waktu habis!</div>
            </div>
            <button onClick={() => navigate('/student/exam')} style={{ padding: '9px 18px', borderRadius: '9px', background: '#D97706', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
              Lanjutkan →
            </button>
          </div>
        )}

        {/* ── 2-col grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>

          {/* Ujian Tersedia */}
          <SectionCard title="Ujian Tersedia" icon={Calendar} iconColor="#DC2626" iconBg="#FEF2F2"
            right={<span style={{ fontSize: '12px', color: '#94A3B8' }}>{data?.availableSessions?.length || 0} ujian</span>}
            delay={300}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>
                <Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="65%" h={11} /></div>
              </div>
            )) : !data?.availableSessions?.length
              ? <EmptyState icon="📅" text="Tidak ada ujian yang tersedia" />
              : data.availableSessions.map((s, i) => {
                const isLive = new Date(s.start_time) <= new Date() && new Date(s.end_time) >= new Date();
                const countdown = !isLive ? getCountdown(s.start_time) : null;
                return (
                  <div key={s.id} className="exam-card"
                    style={{ padding: '13px 0', borderBottom: i < data.availableSessions.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', cursor: isLive ? 'pointer' : 'default', }} onClick={() => isLive && navigate('/student/exam')}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isLive ? '#FEF2F2' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isLive
                        ? <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#DC2626', animation: 'pulse 1.2s infinite' }} />
                        : <Clock size={15} style={{ color: '#94A3B8' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {s.subjects?.name && <><span style={{ color: '#64748B' }}>{s.subjects.name}</span> · </>}
                        {s.total_questions} soal · {s.duration_minutes}m
                        {s.passing_score && <> · KKM {s.passing_score}</>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {fmtDate(s.start_time)} {fmtTime(s.start_time)}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {isLive
                        ? <span style={{ fontSize: '11px', fontWeight: '700', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '999px', padding: '3px 10px' }}>MULAI →</span>
                        : countdown && <span style={{ fontSize: '11px', color: '#D97706', fontWeight: '600' }}>{countdown}</span>}
                    </div>
                  </div>
                );
              })}
          </SectionCard>

          {/* Riwayat Nilai */}
          <SectionCard title="Riwayat Nilai" icon={Award} iconColor="#D97706" iconBg="#FFFBEB"
            right={<span style={{ fontSize: '12px', color: '#94A3B8' }}>{data?.stats.totalExams || 0} ujian</span>}
            delay={360}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Shimmer w="44px" h={44} r={99} /><div style={{ flex: 1 }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="60%" h={11} /></div></div>
              </div>
            )) : !data?.recentResults?.length
              ? <EmptyState icon="📊" text="Belum ada riwayat nilai" />
              : data.recentResults.map((r, i) => {
                const statusMeta = {
                  graded:      { label: 'Dinilai',    color: '#16A34A', bg: '#F0FDF4' },
                  submitted:   { label: 'Dikumpul',   color: '#2563EB', bg: '#EFF6FF' },
                  in_progress: { label: 'Berlangsung',color: '#D97706', bg: '#FFFBEB' },
                  grading:     { label: 'Menunggu',   color: '#9333EA', bg: '#FDF4FF' },
                };
                const sm = statusMeta[r.status] || { label: r.status, color: '#94A3B8', bg: '#F8FAFC' };
                return (
                  <div key={r.id} style={{ padding: '12px 0', borderBottom: i < data.recentResults.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: '13px' }}>
                    <ScoreRing score={r.score} passed={r.passed} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.exam_sessions?.title || 'Ujian'}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {fmtDate(r.submitted_at || r.exam_sessions?.start_time)}
                        {r.passed !== null && <> · <span style={{ color: r.passed ? '#16A34A' : '#DC2626', fontWeight: '600' }}>{r.passed ? '✓ Lulus' : '✗ Tidak Lulus'}</span></>}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: sm.color, background: sm.bg, borderRadius: '999px', padding: '3px 9px', flexShrink: 0 }}>{sm.label}</span>
                  </div>
                );
              })}
          </SectionCard>

          {/* Progress Overview */}
          <SectionCard title="Progress Belajar" icon={TrendingUp} iconColor="#7C3AED" iconBg="#F5F3FF" delay={420}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ padding: '12px 0' }}><Shimmer h={13} /><div style={{ marginTop: '8px' }}><Shimmer h={8} r={4} /></div></div>)
              : !data ? null
              : (() => {
                const metrics = [
                  { label: 'Ujian Selesai', value: data.stats.completed, max: Math.max(data.stats.totalExams, 1), color: '#16A34A', display: `${data.stats.completed} / ${data.stats.totalExams}` },
                  { label: 'Tingkat Kelulusan', value: data.stats.passRate ?? 0, max: 100, color: '#4F46E5', display: `${data.stats.passRate ?? 0}%` },
                  { label: 'Rata-rata Nilai', value: data.stats.avgScore ?? 0, max: 100, color: '#0891B2', display: data.stats.avgScore !== null ? data.stats.avgScore : '—' },
                  { label: 'Nilai Terbaik', value: data.stats.bestScore ?? 0, max: 100, color: '#D97706', display: data.stats.bestScore !== null ? Math.round(data.stats.bestScore) : '—' },
                ];
                return metrics.map((m, i) => (
                  <div key={i} style={{ padding: '11px 0', borderBottom: i < metrics.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#64748B' }}>{m.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>{m.display}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', background: m.color, width: `${Math.min(100, (m.value / m.max) * 100)}%`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ));
              })()}
          </SectionCard>

          {/* Info Siswa */}
          <SectionCard title="Info Akun" icon={BookOpen} iconColor="#0891B2" iconBg="#EFF6FF" delay={480}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between' }}><Shimmer w="80px" h={13} /><Shimmer w="100px" h={13} /></div>)
              : [
                { label: 'Nama',     value: profile?.name || '—' },
                { label: 'Email',    value: profile?.email || '—' },
                { label: 'NIS',      value: profile?.nis || '—' },
                { label: 'Kelas',    value: profile?.class_id ? 'Terdaftar' : 'Belum ada kelas' },
                { label: 'Role',     value: 'Siswa' },
              ].map((row, i, arr) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{row.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#0F172A', textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                </div>
              ))}
          </SectionCard>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0, animation: 'fadeUp 0.4s ease 540ms forwards' }}>
          <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={10} style={{ color: '#4F46E5' }} /> Real-time dari Supabase
          </span>
        </div>
      </div>
    </>
  );
};

export default StudentDashboard;
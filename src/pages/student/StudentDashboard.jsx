import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Award, Clock, CheckCircle2, RefreshCw,
  TrendingUp, BookOpen, Target, Calendar, Zap,
} from 'lucide-react';
import {
  T, DashboardStyles, StatCard, StatCardSkeleton, SectionCard,
  EmptyState, Shimmer, RowItem, LiveDot, ProgressBar,
  ScoreRing, PageHeader, ErrorBanner, StatusBadge, Badge,
  RefreshButton,
} from '../../components/ui/DashboardUI';

const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
const getCountdown = (startTime) => {
  const diff = new Date(startTime) - new Date();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)} hari lagi`;
  if (h > 0)  return `${h}j ${m}m`;
  return `${m} menit lagi`;
};

const StudentDashboard = () => {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id || !profile?.class_id) { setLoading(false); return; }
    try {
      const [sessionsRes, resultsRes] = await Promise.all([
        supabase.from('exam_sessions')
          .select('id, title, exam_type, start_time, end_time, duration_minutes, passing_score, total_questions, token_status, question_banks(subjects(name, code))')
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
      const now      = new Date();
      const resultSessionIds = new Set(results.map(r => r.exam_session_id));
      const liveSessions      = sessions.filter(s => new Date(s.start_time) <= now && new Date(s.end_time) >= now && !resultSessionIds.has(s.id));
      const upcomingSessions  = sessions.filter(s => new Date(s.start_time) > now).slice(0, 5);
      const availableSessions = [...liveSessions, ...upcomingSessions];
      const inProgressResult  = results.find(r => r.status === 'in_progress');
      const gradedResults = results.filter(r => r.status === 'graded' && r.score !== null);
      const avgScore  = gradedResults.length ? Math.round(gradedResults.reduce((s, r) => s + r.score, 0) / gradedResults.length) : null;
      const passCount = gradedResults.filter(r => r.passed).length;
      const passRate  = gradedResults.length ? Math.round((passCount / gradedResults.length) * 100) : null;
      const bestScore = gradedResults.length ? Math.max(...gradedResults.map(r => r.score)) : null;
      setData({ availableSessions, liveSessions, upcomingSessions, inProgressResult, recentResults: results.slice(0, 8),
        stats: { totalExams: results.length, completed: results.filter(r => ['graded','submitted'].includes(r.status)).length, avgScore, passRate, bestScore, passCount } });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.id, profile?.class_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hour     = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const subtitle = !profile?.class_id
    ? <span style={{ color: T.amber }}>⚠ Kamu belum terdaftar di kelas</span>
    : data?.liveSessions?.length
    ? <span style={{ color: T.red, fontWeight: '600' }}>● {data.liveSessions.length} ujian sedang berlangsung!</span>
    : data?.inProgressResult
    ? <span style={{ color: T.amber, fontWeight: '600' }}>◷ Ada ujian yang belum kamu selesaikan</span>
    : 'Pantau jadwal ujian dan riwayat nilaimu';

  return (
    <>
      <DashboardStyles />
      <div style={{ fontFamily: T.fontBody, display: 'flex', flexDirection: 'column', gap: '22px' }}>

        <PageHeader greeting={greeting} name={profile?.name || 'Siswa'} subtitle={subtitle}
          actions={<RefreshButton Icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchData(); }} />} />

        {error && <ErrorBanner message={error} />}

        {!loading && !profile?.class_id && (
          <div style={{ padding: '16px 20px', background: T.amberLight, border: '1px solid #FDE68A', borderRadius: T.rMd, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '20px' }}>📋</div>
            <div>
              <div style={{ fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '13px', color: '#92400E', marginBottom: '3px' }}>Belum Terdaftar di Kelas</div>
              <div style={{ fontSize: '12px', color: '#78350F' }}>Hubungi Admin Sekolah untuk mendaftarkanmu ke kelas yang sesuai.</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px' }}>
          {loading ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />) : data && <>
            <StatCard icon={FileText}    label="Ujian Diikuti"   value={fmt(data.stats.totalExams)} sub="Sepanjang waktu" color={T.brand}  bg={T.brandLight}  delay={0}   />
            <StatCard icon={CheckCircle2} label="Selesai"        value={fmt(data.stats.completed)}  sub="Sudah dikumpul" color={T.green}  bg={T.greenLight}  delay={50}  />
            <StatCard icon={Target}      label="Rata-rata Nilai" value={data.stats.avgScore ?? '—'} sub="Ujian dinilai"   color={T.blue}   bg={T.blueLight}   delay={100} />
            <StatCard icon={Award}       label="Nilai Terbaik"   value={data.stats.bestScore !== null ? Math.round(data.stats.bestScore) : '—'} sub="Tertinggimu" color={T.amber} bg={T.amberLight} delay={150} />
            <StatCard icon={TrendingUp}  label="Tingkat Lulus"   value={data.stats.passRate !== null ? `${data.stats.passRate}%` : '—'} sub={`${data.stats.passCount} dari ${data.stats.completed}`} color={T.purple} bg={T.purpleLight} delay={200} />
          </>}
        </div>

        {!loading && data?.inProgressResult && (
          <div className="du-fadein" style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '1px solid #FDE68A', borderRadius: T.rMd, display: 'flex', alignItems: 'center', gap: '14px', animationDelay: '220ms' }}>
            <span style={{ fontSize: '22px' }}>⚡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '13px', color: '#92400E', marginBottom: '2px' }}>Ujian Belum Selesai</div>
              <div style={{ fontSize: '12px', color: '#78350F' }}>{data.inProgressResult.exam_sessions?.title} — Segera lanjutkan sebelum waktu habis!</div>
            </div>
            <button onClick={() => navigate('/student/exam')} className="du-btn-primary" style={{ background: T.amber, flexShrink: 0, fontSize: '12px' }}>Lanjutkan →</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(295px, 1fr))', gap: '16px' }}>

          <SectionCard title="Ujian Tersedia" icon={Calendar} iconColor={T.red} iconBg={T.redLight} right={`${data?.availableSessions?.length || 0} ujian`} delay={240}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="60%" h={11} /></div></div>
            )) : !data?.availableSessions?.length ? <EmptyState icon="📅" text="Tidak ada ujian tersedia" sub="Pantau jadwal dari guru" />
            : data.availableSessions.map((s, i) => {
              const isLive    = new Date(s.start_time) <= new Date() && new Date(s.end_time) >= new Date();
              const countdown = !isLive ? getCountdown(s.start_time) : null;
              return (
                <RowItem key={s.id} last={i === data.availableSessions.length - 1} onClick={isLive ? () => navigate('/student/exam') : undefined}
                  left={<div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isLive ? T.redLight : T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isLive ? <LiveDot color={T.red} /> : <Clock size={14} style={{ color: T.textMuted }} />}
                  </div>}
                  title={s.title}
                  sub={<span>{s.question_banks?.subjects?.name && <>{s.question_banks.subjects.name} · </>}{s.total_questions} soal · {s.duration_minutes}m{s.passing_score && <> · KKM {s.passing_score}</>}<br />{fmtDate(s.start_time)} {fmtTime(s.start_time)}</span>}
                  right={isLive ? <Badge label="MULAI →" color={T.red} bg={T.redLight} /> : countdown ? <span style={{ fontSize: '11px', color: T.amber, fontWeight: '600', fontFamily: T.fontBody }}>{countdown}</span> : null}
                />
              );
            })}
          </SectionCard>

          <SectionCard title="Riwayat Nilai" icon={Award} iconColor={T.amber} iconBg={T.amberLight} right={`${data?.stats?.totalExams || 0} ujian`} delay={280}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', gap: '11px', alignItems: 'center' }}>
                <Shimmer w="42px" h={42} r={99} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}><Shimmer h={13} /><Shimmer w="55%" h={11} /></div>
              </div>
            )) : !data?.recentResults?.length ? <EmptyState icon="📊" text="Belum ada riwayat nilai" />
            : data.recentResults.map((r, i) => (
              <RowItem key={r.id} last={i === data.recentResults.length - 1}
                left={<ScoreRing score={r.score} passed={r.passed} />}
                title={r.exam_sessions?.title || 'Ujian'}
                sub={<span>{fmtDate(r.submitted_at || r.exam_sessions?.start_time)}{r.passed !== null && <> · <span style={{ color: r.passed ? T.green : T.red, fontWeight: '600' }}>{r.passed ? '✓ Lulus' : '✗ Tidak Lulus'}</span></>}</span>}
                right={<StatusBadge status={r.status} />}
              />
            ))}
          </SectionCard>

          <SectionCard title="Progress Belajar" icon={TrendingUp} iconColor={T.purple} iconBg={T.purpleLight} delay={320}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={12} /><div style={{ marginTop: '8px' }}><Shimmer h={5} r={99} /></div></div>
            )) : !data ? null
            : [
              { label: 'Ujian Selesai',   value: data.stats.completed, max: Math.max(data.stats.totalExams, 1), color: T.green,  display: `${data.stats.completed} / ${data.stats.totalExams}` },
              { label: 'Tingkat Lulus',   value: data.stats.passRate ?? 0, max: 100, color: T.brand, display: `${data.stats.passRate ?? 0}%` },
              { label: 'Rata-rata Nilai', value: data.stats.avgScore ?? 0, max: 100, color: T.blue,  display: data.stats.avgScore !== null ? data.stats.avgScore : '—' },
              { label: 'Nilai Terbaik',   value: data.stats.bestScore ?? 0, max: 100, color: T.amber, display: data.stats.bestScore !== null ? Math.round(data.stats.bestScore) : '—' },
            ].map((m, i, arr) => (
              <div key={i} style={{ padding: '11px 0', borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
                <ProgressBar label={m.label} value={m.value} max={m.max} color={m.color} display={m.display} />
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Info Akun" icon={BookOpen} iconColor={T.blue} iconBg={T.blueLight} delay={360}>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', justifyContent: 'space-between' }}><Shimmer w="60px" h={12} /><Shimmer w="90px" h={12} /></div>
            )) : [
              { label: 'Nama',  value: profile?.name  || '—' },
              { label: 'Email', value: profile?.email || '—' },
              { label: 'NIS',   value: profile?.nis   || '—' },
              { label: 'Kelas', value: profile?.class_id ? 'Terdaftar' : <span style={{ color: T.amber }}>Belum ada kelas</span> },
              { label: 'Role',  value: 'Siswa' },
            ].map((row, i, arr) => (
              <div key={i} style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : 'none' }}>
                <span style={{ fontSize: '12px', color: T.textMuted, fontFamily: T.fontBody }}>{row.label}</span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: T.text, textAlign: 'right', wordBreak: 'break-all', fontFamily: T.fontBody }}>{row.value}</span>
              </div>
            ))}
          </SectionCard>

        </div>

        <div className="du-fadein" style={{ display: 'flex', justifyContent: 'flex-end', animationDelay: '400ms' }}>
          <span style={{ fontSize: '11px', color: T.border, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: T.fontBody }}>
            <Zap size={10} style={{ color: T.brand }} /> Real-time
          </span>
        </div>
      </div>
    </>
  );
};

export default StudentDashboard;
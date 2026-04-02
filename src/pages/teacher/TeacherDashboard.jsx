import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, FileText, Award, Users, RefreshCw, TrendingUp, Clock, BarChart2, Zap, Target } from 'lucide-react';
import {
  T, DashboardStyles, StatCard, StatCardSkeleton, SectionCard,
  EmptyState, Shimmer, RowItem, LiveDot, PageHeader, ErrorBanner,
  StatusBadge, Badge, RefreshButton, IconBox,
} from '../../components/ui/DashboardUI';

const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

const TeacherDashboard = () => {
  const { profile } = useAuth();
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    let mounted = true;
    try {
      const [banksRes, sessionsRes] = await Promise.all([
        supabase.from('question_banks').select('id, name, exam_type, total_questions, created_at, subjects(name, code)').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('exam_sessions').select('id, title, exam_type, start_time, end_time, duration_minutes, token, token_status, passing_score, total_questions, class_id, classes(name)').eq('teacher_id', profile.id).order('start_time', { ascending: false }).limit(20),
      ]);
      if (!mounted) return;
      const banks    = banksRes.data    || [];
      const sessions = sessionsRes.data || [];
      let results = [];
      if (sessions.length > 0) {
        const { data: rd } = await supabase.from('exam_results').select('id, status, score, passed, submitted_at, exam_session_id, student_id').in('exam_session_id', sessions.map(s => s.id)).order('submitted_at', { ascending: false }).limit(50);
        results = rd || [];
      }
      if (!mounted) return;
      const now = new Date();
      const activeSessions   = sessions.filter(s => new Date(s.start_time) <= now && new Date(s.end_time) >= now);
      const gradedResults    = results.filter(r => r.status === 'graded' && r.score !== null);
      const avgScore  = gradedResults.length ? Math.round(gradedResults.reduce((s, r) => s + r.score, 0) / gradedResults.length) : null;
      const passRate  = gradedResults.length ? Math.round((gradedResults.filter(r => r.passed).length / gradedResults.length) * 100) : null;
      const totalQuestions = banks.reduce((s, b) => s + (b.total_questions || 0), 0);
      setData({ banks: banks.slice(0, 5), sessions: sessions.slice(0, 5), recentResults: results.slice(0, 6),
        stats: { totalBanks: banks.length, totalSessions: sessions.length, totalQuestions, totalResults: results.length, activeSessions: activeSessions.length, avgScore, passRate } });
    } catch (err) { if (mounted) setError(err.message); }
    finally { if (mounted) { setLoading(false); setRefreshing(false); } }
    return () => { mounted = false; };
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hour     = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const subtitle = data?.stats?.activeSessions
    ? <span style={{ color: T.green, fontWeight: '600' }}>● {data.stats.activeSessions} ujian sedang berlangsung sekarang</span>
    : 'Kelola bank soal dan sesi ujian kamu';

  return (
    <>
      <DashboardStyles />
      <div style={{ fontFamily: T.fontBody, display: 'flex', flexDirection: 'column', gap: '22px' }}>

        <PageHeader greeting={greeting} name={profile?.name || 'Guru'} subtitle={subtitle}
          actions={<RefreshButton Icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchData(); }} />} />

        {error && <ErrorBanner message={error} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {loading ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />) : data && <>
            <StatCard icon={BookOpen}  label="Bank Soal"      value={fmt(data.stats.totalBanks)}     sub={`${fmt(data.stats.totalQuestions)} soal`} color={T.brand}  bg={T.brandLight}  delay={0}   />
            <StatCard icon={FileText}  label="Sesi Ujian"     value={fmt(data.stats.totalSessions)}  sub="Ujian dibuat"                              color={T.blue}   bg={T.blueLight}   delay={50}  />
            <StatCard icon={Users}     label="Hasil Masuk"    value={fmt(data.stats.totalResults)}   sub="Total jawaban"                             color={T.purple} bg={T.purpleLight} delay={100} />
            <StatCard icon={Target}    label="Rata-rata Nilai" value={data.stats.avgScore ?? '—'}     sub="Ujian dinilai"                            color={T.amber}  bg={T.amberLight}  delay={150} />
            <StatCard icon={Award}     label="Tingkat Lulus"  value={data.stats.passRate !== null ? `${data.stats.passRate}%` : '—'} sub="Lulus KKM" color={T.green} bg={T.greenLight}  delay={200} />
          </>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(295px, 1fr))', gap: '16px' }}>

          <SectionCard title="Sesi Ujian" icon={Clock} iconColor={T.blue} iconBg={T.blueLight} right={`${data?.sessions?.length || 0} total`} delay={240}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="60%" h={11} /></div></div>
            )) : !data?.sessions?.length ? <EmptyState icon="📋" text="Belum ada sesi ujian" />
            : data.sessions.map((s, i) => {
              const now = new Date();
              const isLive     = new Date(s.start_time) <= now && new Date(s.end_time) >= now;
              const isUpcoming = new Date(s.start_time) > now;
              return (
                <RowItem key={s.id} last={i === data.sessions.length - 1}
                  left={<div style={{ width: '34px', height: '34px', borderRadius: '10px', background: isLive ? T.greenLight : T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isLive ? <LiveDot color={T.green} /> : <FileText size={14} style={{ color: T.textMuted }} />}
                  </div>}
                  title={s.title}
                  sub={<span>{fmtDate(s.start_time)} · {fmtTime(s.start_time)} · {s.duration_minutes}m{s.classes?.name && <> · {s.classes.name}</>}</span>}
                  right={isLive ? <Badge label="LIVE" color={T.green} bg={T.greenLight} /> : isUpcoming ? <Badge label="Segera" color={T.amber} bg={T.amberLight} /> : null}
                />
              );
            })}
          </SectionCard>

          <SectionCard title="Bank Soal" icon={BookOpen} iconColor={T.brand} iconBg={T.brandLight} right={`${data?.stats?.totalBanks || 0} bank`} delay={280}>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="50%" h={11} /></div></div>
            )) : !data?.banks?.length ? <EmptyState icon="📚" text="Belum ada bank soal" />
            : data.banks.map((b, i) => (
              <RowItem key={b.id} last={i === data.banks.length - 1}
                left={<IconBox size={34} r={10} bg={T.brandLight} color={T.brand} icon={BookOpen} iconSize={14} />}
                title={b.name}
                sub={<span>{b.subjects?.name || '—'} · {b.total_questions || 0} soal <Badge label={b.exam_type} color={T.textMuted} bg={T.surfaceAlt} /></span>}
              />
            ))}
          </SectionCard>

          <SectionCard title="Hasil Ujian Terbaru" icon={BarChart2} iconColor={T.purple} iconBg={T.purpleLight} right={`${data?.stats?.totalResults || 0} total`} delay={320}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="55%" h={11} /></div></div>
            )) : !data?.recentResults?.length ? <EmptyState icon="📊" text="Belum ada hasil ujian" />
            : data.recentResults.map((r, i) => (
              <RowItem key={r.id} last={i === data.recentResults.length - 1}
                left={<div style={{ width: '34px', height: '34px', borderRadius: '10px', background: r.passed ? T.greenLight : r.status === 'in_progress' ? T.amberLight : T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '13px', color: r.passed ? T.green : T.textMuted }}>
                  {r.score !== null ? Math.round(r.score) : '—'}
                </div>}
                title={'Ujian'}
                sub={fmtDate(r.submitted_at)}
                right={<StatusBadge status={r.status} />}
              />
            ))}
          </SectionCard>

          <SectionCard title="Ringkasan Kinerja" icon={TrendingUp} iconColor={T.green} iconBg={T.greenLight} delay={360}>
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', justifyContent: 'space-between' }}><Shimmer w="100px" h={12} /><Shimmer w="50px" h={12} /></div>
            )) : !data ? null
            : [
              { label: 'Bank soal dibuat',    value: fmt(data.stats.totalBanks) },
              { label: 'Total soal tersedia', value: fmt(data.stats.totalQuestions) },
              { label: 'Sesi ujian diadakan', value: fmt(data.stats.totalSessions) },
              { label: 'Hasil masuk',         value: fmt(data.stats.totalResults) },
              { label: 'Rata-rata nilai',     value: data.stats.avgScore ?? '—' },
              { label: 'Tingkat kelulusan',   value: data.stats.passRate !== null ? `${data.stats.passRate}%` : '—' },
            ].map((row, i, arr) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: T.textSub, fontFamily: T.fontBody }}>{row.label}</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: T.text, fontFamily: T.fontDisplay }}>{row.value}</span>
              </div>
            ))}
          </SectionCard>

        </div>

        <div className="du-fadein" style={{ display: 'flex', justifyContent: 'flex-end', animationDelay: '400ms' }}>
        </div>
      </div>
    </>
  );
};

export default TeacherDashboard;
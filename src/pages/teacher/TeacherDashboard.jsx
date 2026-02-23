import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpen, FileText, Award, Users, RefreshCw,
  AlertCircle, TrendingUp, Clock, CheckCircle2,
  BarChart2, Zap, PlusCircle, ChevronRight, Target,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';

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

const StatusBadge = ({ status }) => {
  const map = {
    graded:      { label: 'Selesai',   bg: '#F0FDF4', color: '#16A34A' },
    submitted:   { label: 'Dikumpul', bg: '#EFF6FF', color: '#2563EB' },
    in_progress: { label: 'Berlangsung', bg: '#FFFBEB', color: '#D97706' },
    grading:     { label: 'Dinilai',  bg: '#FDF4FF', color: '#9333EA' },
  };
  const m = map[status] || { label: status, bg: '#F1F5F9', color: '#64748B' };
  return <span style={{ padding: '3px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', background: m.bg, color: m.color }}>{m.label}</span>;
};

// ── Main ──────────────────────────────────────────────────────────
const TeacherDashboard = () => {
  const { profile } = useAuth();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    let mounted = true;
    try {
      const [banksRes, sessionsRes] = await Promise.all([
        supabase.from('question_banks')
          .select('id, name, exam_type, total_questions, created_at, subjects(name, code)')
          .eq('teacher_id', profile.id)
          .order('created_at', { ascending: false }),

        supabase.from('exam_sessions')
          .select('id, title, exam_type, start_time, end_time, duration_minutes, token, token_status, passing_score, total_questions, class_id, classes(name)')
          .eq('teacher_id', profile.id)
          .order('start_time', { ascending: false })
          .limit(20),
      ]);

      if (!mounted) return;

      const banks    = banksRes.data    || [];
      const sessions = sessionsRes.data || [];

      // BUG #3 FIX: Ambil results berdasarkan session IDs milik guru ini,
      // bukan filter via join (tidak reliable di Supabase JS v2)
      let results = [];
      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: resultsData } = await supabase
          .from('exam_results')
          .select('id, status, score, passed, submitted_at, exam_session_id, student_id')
          .in('exam_session_id', sessionIds)
          .order('submitted_at', { ascending: false })
          .limit(50);
        results = resultsData || [];
      }

      if (!mounted) return;

      const now = new Date();
      const activeSessions = sessions.filter(s => new Date(s.start_time) <= now && new Date(s.end_time) >= now);
      const upcomingSessions = sessions.filter(s => new Date(s.start_time) > now).slice(0, 3);

      const gradedResults = results.filter(r => r.status === 'graded' && r.score !== null);
      const avgScore = gradedResults.length
        ? Math.round(gradedResults.reduce((sum, r) => sum + r.score, 0) / gradedResults.length)
        : null;
      const passRate = gradedResults.length
        ? Math.round((gradedResults.filter(r => r.passed).length / gradedResults.length) * 100)
        : null;

      const totalQuestions = banks.reduce((sum, b) => sum + (b.total_questions || 0), 0);

      setData({
        banks: banks.slice(0, 5),
        allBanks: banks,
        sessions: sessions.slice(0, 5),
        activeSessions,
        upcomingSessions,
        recentResults: results.slice(0, 6),
        stats: {
          totalBanks: banks.length,
          totalSessions: sessions.length,
          totalQuestions,
          totalResults: results.length,
          activeSessions: activeSessions.length,
          avgScore,
          passRate,
        },
      });
    } catch (err) {
      if (mounted) setError(err.message);
    } finally {
      if (mounted) { setLoading(false); setRefreshing(false); }
    }
    return () => { mounted = false; };
  }, [profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const name = profile?.name || 'Guru';
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;} 100%{background-position:400px 0;} }
        @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Header ── */}
        <div style={{ opacity: 0, animation: 'fadeUp 0.4s ease forwards', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px' }}>
              {greeting}, <span style={{ color: '#4F46E5' }}>{name}</span> 👋
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              {data?.stats.activeSessions
                ? <span style={{ color: '#16A34A', fontWeight: '600' }}>● {data.stats.activeSessions} ujian sedang berlangsung sekarang</span>
                : 'Kelola bank soal dan sesi ujian kamu'}
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

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><Shimmer w="80px" /><Shimmer w="36px" h={36} r={10} /></div>
              <Shimmer w="60px" h={28} r={8} /><Shimmer w="100px" h={11} />
            </div>
          )) : data && <>
            <StatCard icon={BookOpen}   label="Bank Soal"       value={fmt(data.stats.totalBanks)}     sub={`${fmt(data.stats.totalQuestions)} soal total`} color="#4F46E5" bg="#EEF2FF" delay={0}   />
            <StatCard icon={FileText}   label="Sesi Ujian"      value={fmt(data.stats.totalSessions)}  sub="Ujian dibuat"                                   color="#0891B2" bg="#EFF6FF" delay={60}  />
            <StatCard icon={Users}      label="Hasil Ujian"     value={fmt(data.stats.totalResults)}   sub="Semua jawaban masuk"                            color="#7C3AED" bg="#F5F3FF" delay={120} />
            <StatCard icon={Target}     label="Rata-rata Nilai" value={data.stats.avgScore !== null ? data.stats.avgScore : '—'} sub="Dari ujian yang sudah dinilai" color="#D97706" bg="#FFFBEB" delay={180} />
            <StatCard icon={Award}      label="Tingkat Lulus"   value={data.stats.passRate !== null ? `${data.stats.passRate}%` : '—'} sub="Siswa yang lulus KKM"  color="#16A34A" bg="#F0FDF4" delay={240} />
          </>}
        </div>

        {/* ── 2-col grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>

          {/* Sesi Aktif & Upcoming */}
          <SectionCard title="Sesi Ujian" icon={Clock} iconColor="#0891B2" iconBg="#EFF6FF"
            right={<span style={{ fontSize: '12px', color: '#94A3B8' }}>{data?.sessions.length || 0} total</span>}
            delay={300}>
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid #F8FAFC' }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="60%" h={11} /></div></div>) :
              !data?.sessions.length ? <EmptyState icon="📋" text="Belum ada sesi ujian" /> :
              data.sessions.map((s, i) => {
                const now = new Date();
                const start = new Date(s.start_time);
                const end   = new Date(s.end_time);
                const isLive = start <= now && end >= now;
                const isUpcoming = start > now;
                return (
                  <div key={s.id} style={{ padding: '11px 0', borderBottom: i < data.sessions.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: isLive ? '#F0FDF4' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isLive
                        ? <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', animation: 'pulse 1.5s infinite' }} />
                        : <FileText size={14} style={{ color: '#94A3B8' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {fmtDate(s.start_time)} · {fmtTime(s.start_time)} · {s.duration_minutes}m
                        {s.classes?.name && <> · <span style={{ color: '#64748B' }}>{s.classes.name}</span></>}
                      </div>
                    </div>
                    {isLive && <span style={{ fontSize: '10px', fontWeight: '700', color: '#16A34A', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '999px', padding: '2px 8px', flexShrink: 0 }}>LIVE</span>}
                    {isUpcoming && <span style={{ fontSize: '10px', fontWeight: '600', color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '999px', padding: '2px 8px', flexShrink: 0 }}>Segera</span>}
                  </div>
                );
              })}
          </SectionCard>

          {/* Bank Soal */}
          <SectionCard title="Bank Soal" icon={BookOpen} iconColor="#4F46E5" iconBg="#EEF2FF"
            right={<span style={{ fontSize: '12px', color: '#94A3B8' }}>{data?.stats.totalBanks || 0} bank</span>}
            delay={360}>
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid #F8FAFC' }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="50%" h={11} /></div></div>) :
              !data?.banks.length ? <EmptyState icon="📚" text="Belum ada bank soal" /> :
              data.banks.map((b, i) => (
                <div key={b.id} style={{ padding: '11px 0', borderBottom: i < data.banks.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={14} style={{ color: '#4F46E5' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {b.subjects?.name || '—'} · {b.total_questions || 0} soal
                      <span style={{ marginLeft: '6px', padding: '1px 7px', borderRadius: '999px', background: '#F1F5F9', color: '#64748B', fontSize: '10px', fontWeight: '600' }}>{b.exam_type}</span>
                    </div>
                  </div>
                </div>
              ))}
          </SectionCard>

          {/* Hasil Ujian Terbaru */}
          <SectionCard title="Hasil Ujian Terbaru" icon={BarChart2} iconColor="#7C3AED" iconBg="#F5F3FF"
            right={<span style={{ fontSize: '12px', color: '#94A3B8' }}>{data?.stats.totalResults || 0} total</span>}
            delay={420}>
            {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid #F8FAFC' }}><Shimmer h={13} /><div style={{ marginTop: '6px' }}><Shimmer w="55%" h={11} /></div></div>) :
              !data?.recentResults.length ? <EmptyState icon="📊" text="Belum ada hasil ujian" /> :
              data.recentResults.map((r, i) => (
                <div key={r.id} style={{ padding: '11px 0', borderBottom: i < data.recentResults.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: r.passed ? '#F0FDF4' : r.status === 'in_progress' ? '#FFFBEB' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Sora, sans-serif', fontWeight: '700', fontSize: '13px', color: r.passed ? '#16A34A' : '#94A3B8' }}>
                    {r.score !== null ? Math.round(r.score) : '—'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.exam_sessions?.title || 'Ujian'}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtDate(r.submitted_at)}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
          </SectionCard>

          {/* Quick Stats */}
          <SectionCard title="Ringkasan Kinerja" icon={TrendingUp} iconColor="#16A34A" iconBg="#F0FDF4" delay={480}>
            {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between' }}><Shimmer w="100px" h={13} /><Shimmer w="50px" h={13} /></div>) :
              !data ? null :
              [
                { label: 'Bank soal dibuat', value: fmt(data.stats.totalBanks) },
                { label: 'Total soal tersedia', value: fmt(data.stats.totalQuestions) },
                { label: 'Sesi ujian diadakan', value: fmt(data.stats.totalSessions) },
                { label: 'Hasil masuk', value: fmt(data.stats.totalResults) },
                { label: 'Rata-rata nilai', value: data.stats.avgScore !== null ? data.stats.avgScore : '—' },
                { label: 'Tingkat kelulusan', value: data.stats.passRate !== null ? `${data.stats.passRate}%` : '—' },
              ].map((row, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>{row.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>{row.value}</span>
                </div>
              ))}
          </SectionCard>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0, animation: 'fadeUp 0.4s ease 540ms forwards' }}>
          <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={10} style={{ color: '#4F46E5' }} /> Data Real-time
          </span>
        </div>
      </div>
    </>
  );
};

export default TeacherDashboard;
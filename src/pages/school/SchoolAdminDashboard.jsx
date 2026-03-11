import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, BookOpen, GraduationCap, BarChart2,
  AlertCircle, RefreshCw, Layers, CheckCircle2,
  Clock, Calendar, Zap,
} from 'lucide-react';
import {
  T, DashboardStyles, StatCard, StatCardSkeleton, SectionCard,
  EmptyState, Shimmer, RowItem, LiveDot, PageHeader, ErrorBanner,
  Badge, RefreshButton, IconBox, ProgressBar,
} from '../../components/ui/DashboardUI';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Subscription Banner ────────────────────────────────────────────
const SubBanner = ({ school }) => {
  if (!school) return null;
  const days = school.subscription_end_date
    ? Math.ceil((new Date(school.subscription_end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  if (school.subscription_status === 'active' && (days === null || days > 30)) return null;

  const isExpired = school.subscription_status === 'expired' || (days !== null && days < 0);
  const isWarning = days !== null && days <= 14 && days >= 0;

  const cfg = isExpired
    ? { bg: T.redLight,   border: '#FECACA', icon: AlertCircle, color: T.red,   text: 'Langganan Anda telah habis. Hubungi Super Admin untuk perpanjangan.' }
    : isWarning
    ? { bg: T.amberLight, border: '#FDE68A', icon: Clock,        color: T.amber, text: `Langganan berakhir dalam ${days} hari. Segera perpanjang agar tidak terganggu.` }
    : { bg: T.blueLight,  border: '#BFDBFE', icon: Zap,          color: '#2563EB', text: 'Anda sedang dalam masa trial. Upgrade untuk akses penuh.' };

  const Icon = cfg.icon;
  return (
    <div className="du-fadein" style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 16px', borderRadius: T.rMd, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
      <p style={{ fontSize: '13px', color: cfg.color, fontWeight: '500', margin: 0, fontFamily: T.fontBody }}>{cfg.text}</p>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────
const SchoolAdminDashboard = () => {
  const { profile } = useAuth();
  const [data,       setData]       = useState({ school: null, teachers: [], students: [], classes: [], subjects: [], recentSessions: [] });
  const [stats,      setStats]      = useState({ teachers: 0, students: 0, classes: 0, subjects: 0, exams: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    const sid = profile.school_id;
    try {
      const [schoolRes, profilesRes, classesRes, subjectsRes, sessionsRes] = await Promise.all([
        supabase.from('schools').select('id, name, subscription_status, subscription_end_date, subscription_tier, max_students, max_teachers').eq('id', sid).single(),
        supabase.from('profiles').select('id, name, email, role, created_at').eq('school_id', sid),
        supabase.from('classes').select('id, name, grade_level, academic_year, homeroom_teacher_id').eq('school_id', sid).order('grade_level'),
        supabase.from('subjects').select('id, name, code').eq('school_id', sid).order('name'),
        supabase.from('exam_sessions').select('id, title, exam_type, start_time, end_time, total_questions').eq('school_id', sid).order('start_time', { ascending: false }).limit(6),
      ]);
      if (schoolRes.error) throw schoolRes.error;

      const profiles  = profilesRes.data || [];
      const teachers  = profiles.filter(p => p.role === 'teacher');
      const students  = profiles.filter(p => p.role === 'student');
      const classes   = classesRes.data  || [];
      const subjects  = subjectsRes.data || [];
      const sessions  = sessionsRes.data || [];

      setData({ school: schoolRes.data, teachers: teachers.slice(0, 5), students: students.slice(0, 5), classes, subjects, recentSessions: sessions });
      setStats({ teachers: teachers.length, students: students.length, classes: classes.length, subjects: subjects.length, exams: sessions.length });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [profile?.school_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const schoolName  = data.school?.name || profile?.schools?.name || 'Sekolah Anda';
  const now         = new Date();
  const activeExams = data.recentSessions.filter(s => new Date(s.start_time) <= now && new Date(s.end_time) >= now);

  const TIER_META = {
    starter:      { label: 'Starter',      color: T.green,  bg: T.greenLight  },
    professional: { label: 'Professional', color: '#2563EB', bg: T.blueLight  },
    enterprise:   { label: 'Enterprise',   color: T.purple, bg: T.purpleLight },
  };
  const tier = TIER_META[data.school?.subscription_tier] || TIER_META.starter;

  // subtitle buat PageHeader
  const subtitle = (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '13px', color: T.textSub, fontFamily: T.fontBody }}>
        Selamat datang kembali, <strong style={{ color: T.text }}>{profile?.name || 'Admin'}</strong>
      </span>
      <Badge label={tier.label} color={tier.color} bg={tier.bg} />
      {activeExams.length > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: T.green, background: T.greenLight, border: `1px solid #BBF7D0`, borderRadius: '999px', padding: '2px 9px', fontFamily: T.fontBody }}>
          <LiveDot color={T.green} /> {activeExams.length} ujian berlangsung
        </span>
      )}
    </span>
  );

  return (
    <>
      <DashboardStyles />
      <div style={{ fontFamily: T.fontBody, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Header ── */}
        <div className="du-fadein" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: '20px', fontWeight: '700', color: T.text, margin: '0 0 5px', letterSpacing: '-0.02em' }}>
              {schoolName}
            </h1>
            {subtitle}
          </div>
          <RefreshButton Icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchData(); }} />
        </div>

        {/* ── Subscription Banner ── */}
        <SubBanner school={data.school} />

        {error && <ErrorBanner message={error} />}

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '12px' }}>
          {loading ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />) : <>
            <StatCard icon={Users}        label="Guru"           value={stats.teachers} sub={`Maks ${data.school?.max_teachers || '—'}`} color={T.brand}  bg={T.brandLight}  delay={0}   />
            <StatCard icon={GraduationCap} label="Siswa"         value={stats.students} sub={`Maks ${data.school?.max_students || '—'}`} color={T.blue}   bg={T.blueLight}   delay={50}  />
            <StatCard icon={Layers}       label="Kelas"          value={stats.classes}  sub="Kelas aktif"                               color={T.purple} bg={T.purpleLight} delay={100} />
            <StatCard icon={BookOpen}     label="Mata Pelajaran" value={stats.subjects} sub="Mapel tersedia"                            color={T.amber}  bg={T.amberLight}  delay={150} />
            <StatCard icon={BarChart2}    label="Sesi Ujian"     value={stats.exams}    sub="6 terbaru"                                 color={T.green}  bg={T.greenLight}  delay={200} />
          </>}
        </div>

        {/* ── Kapasitas Bar ── */}
        {!loading && data.school && (
          <div className="du-fadein" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', animationDelay: '220ms' }}>
            {[
              { label: 'Kapasitas Guru',  current: stats.teachers, max: data.school.max_teachers, color: T.brand  },
              { label: 'Kapasitas Siswa', current: stats.students, max: data.school.max_students, color: T.blue   },
            ].map(b => (
              <div key={b.label} style={{ background: T.surface, borderRadius: T.rMd, padding: '14px 16px', border: `1px solid ${T.borderLight}`, boxShadow: T.shadowSm }}>
                <ProgressBar label={b.label} value={b.current} max={b.max} color={b.color} display={`${b.current} / ${b.max}`} />
              </div>
            ))}
          </div>
        )}

        {/* ── 4-card grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>

          {/* Kelas */}
          <SectionCard title="Daftar Kelas" icon={Layers} iconColor={T.purple} iconBg={T.purpleLight} right={`${data.classes.length} kelas`} delay={260}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={12} /><div style={{ marginTop: '5px' }}><Shimmer w="55%" h={11} /></div></div>
            )) : !data.classes.length ? <EmptyState icon="🏫" text="Belum ada kelas" sub="Tambahkan kelas di menu Kelas" />
            : <>
              {data.classes.slice(0, 6).map((c, i, arr) => (
                <RowItem key={c.id} last={i === Math.min(arr.length, 6) - 1 && data.classes.length <= 6}
                  left={<div style={{ width: '34px', height: '34px', borderRadius: '9px', background: T.purpleLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '13px', color: T.purple, flexShrink: 0 }}>{c.grade_level || '?'}</div>}
                  title={c.name}
                  sub={c.academic_year ? `TA ${c.academic_year}` : undefined}
                  right={<span style={{ fontSize: '11px', color: T.textMuted, fontFamily: T.fontBody }}>Maks {c.max_students}</span>}
                />
              ))}
              {data.classes.length > 6 && (
                <div style={{ padding: '10px 0', textAlign: 'center', fontSize: '12px', color: T.brand, fontWeight: '600', cursor: 'pointer', fontFamily: T.fontBody }}>
                  +{data.classes.length - 6} kelas lainnya →
                </div>
              )}
            </>}
          </SectionCard>

          {/* Mata Pelajaran */}
          <SectionCard title="Mata Pelajaran" icon={BookOpen} iconColor={T.amber} iconBg={T.amberLight} right={`${data.subjects.length} mapel`} delay={300}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={12} /><div style={{ marginTop: '5px' }}><Shimmer w="40%" h={11} /></div></div>
            )) : !data.subjects.length ? <EmptyState icon="📚" text="Belum ada mata pelajaran" />
            : data.subjects.slice(0, 6).map((s, i, arr) => (
              <RowItem key={s.id} last={i === Math.min(arr.length, 6) - 1}
                left={<div style={{ width: '34px', height: '34px', borderRadius: '9px', background: T.amberLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '11px', color: T.amber, flexShrink: 0 }}>{s.code?.substring(0, 3).toUpperCase() || '??'}</div>}
                title={s.name}
                sub={s.code || undefined}
              />
            ))}
          </SectionCard>

          {/* Guru */}
          <SectionCard title="Guru" icon={Users} iconColor={T.brand} iconBg={T.brandLight} right={`${stats.teachers} total`} delay={340}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Shimmer w="34px" h={34} r={9} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}><Shimmer h={12} /><Shimmer w="65%" h={11} /></div>
              </div>
            )) : !data.teachers.length ? <EmptyState icon="👨‍🏫" text="Belum ada guru terdaftar" />
            : data.teachers.map((t, i, arr) => (
              <RowItem key={t.id} last={i === arr.length - 1}
                left={<div style={{ width: '34px', height: '34px', borderRadius: '9px', background: T.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '13px', color: T.brand, flexShrink: 0 }}>{t.name.charAt(0).toUpperCase()}</div>}
                title={t.name}
                sub={t.email}
              />
            ))}
          </SectionCard>

          {/* Sesi Ujian */}
          <SectionCard title="Sesi Ujian Terbaru" icon={Calendar} iconColor={T.green} iconBg={T.greenLight} right="6 terbaru" delay={380}>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={12} /><div style={{ marginTop: '5px' }}><Shimmer w="60%" h={11} /></div></div>
            )) : !data.recentSessions.length ? <EmptyState icon="📋" text="Belum ada sesi ujian" />
            : data.recentSessions.map((s, i, arr) => {
              const isLive = new Date(s.start_time) <= now && new Date(s.end_time) >= now;
              return (
                <RowItem key={s.id} last={i === arr.length - 1}
                  left={<div style={{ width: '34px', height: '34px', borderRadius: '9px', background: isLive ? T.greenLight : T.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isLive ? <LiveDot color={T.green} /> : <BarChart2 size={14} style={{ color: T.textMuted }} />}
                  </div>}
                  title={s.title}
                  sub={<span>{fmtDate(s.start_time)}{s.total_questions ? ` · ${s.total_questions} soal` : ''}</span>}
                  right={isLive ? <Badge label="LIVE" color={T.green} bg={T.greenLight} /> : null}
                />
              );
            })}
          </SectionCard>

        </div>

        {/* ── Footer ── */}
        <div className="du-fadein" style={{ display: 'flex', justifyContent: 'flex-end', animationDelay: '420ms' }}>
          <span style={{ fontSize: '11px', color: T.border, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: T.fontBody }}>
            <Zap size={10} style={{ color: T.brand }} /> Real-time
          </span>
        </div>

      </div>
    </>
  );
};

export default SchoolAdminDashboard;
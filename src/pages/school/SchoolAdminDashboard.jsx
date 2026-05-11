import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, Layers, BarChart2,
  AlertCircle, RefreshCw, GraduationCap,
  Clock, Zap, ChevronRight, ArrowRight,
} from 'lucide-react';

/* ─── Design tokens (inline — mirrors index.css vars) ──────────────────────── */
const T = {
  bg: '#f4f3f0', surface: '#ffffff', surface2: '#f9f8f5',
  border: '#ddd9d2', border2: '#c5c2bc',
  text1: '#1a1c26', text2: '#4a4c5e', text3: '#9a9790',
  indigo: '#6366f1', indigoBg: '#ede9ff', indigoHov: '#4f51c9',
  teal: '#14b8a6', tealBg: '#E1F5EE',
  amber: '#f59e0b', amberD: '#d97706', amberBg: '#FAEEDA',
  red: '#E24B4A', redBg: '#FCEBEB',
  green: '#1D9E75', greenBg: '#E1F5EE',
  slate: '#64748b', slateBg: '#F1F5F9',
  purpleBg: '#EEEDFE', purple: '#534AB7',
  mono: 'JetBrains Mono, monospace',
  heading: 'Sora, sans-serif',
};

/* ─── Entity accent map ────────────────────────────────────────────────────── */
const ENTITY = {
  guru:    { color: T.indigo,  bg: T.indigoBg  },
  siswa:   { color: T.teal,   bg: T.tealBg    },
  kelas:   { color: T.slate,  bg: T.slateBg   },
  mapel:   { color: T.slate,  bg: T.slateBg   },
  ujian:   { color: T.amberD, bg: T.amberBg   },
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const capPct = (v, m) => (!m || m === 0 ? 0 : Math.min(100, (v / m) * 100));

const capColor = (pct) =>
  pct >= 100 ? T.red : pct >= 80 ? T.amber : T.indigo;

const capTrackBg = (pct) =>
  pct >= 100 ? '#F7C1C1' : '#ede9e2';

const AVATAR_PAL = [
  { bg: '#EEEDFE', c: '#3C3489' }, { bg: '#E1F5EE', c: '#085041' },
  { bg: '#FAEEDA', c: '#633806' }, { bg: '#E6F1FB', c: '#185FA5' },
  { bg: '#FCEBEB', c: '#A32D2D' }, { bg: '#F0F4FF', c: '#3B5BDB' },
];
const pal = (name = '') => AVATAR_PAL[(name.charCodeAt(0) || 0) % AVATAR_PAL.length];

/* ─── Micro components ─────────────────────────────────────────────────────── */

/** Skeleton shimmer block */
const Sk = ({ w = '100%', h = 12, r = 4 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: '#ede9e2', animation: 'zdShimmer 1.4s ease-in-out infinite' }} />
);

/** Badge */
const Badge = ({ label, color, bg }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    fontSize: '9px', fontFamily: T.mono,
    padding: '2px 7px', borderRadius: '4px',
    fontWeight: '500', letterSpacing: '0.02em',
    background: bg, color,
  }}>{label}</span>
);

/** Section header label */
const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: '9px', fontFamily: T.mono,
    fontWeight: '600', color: T.text3,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '10px',
  }}>
    {children}
    <div style={{ flex: 1, height: '0.5px', background: T.border }} />
  </div>
);

/** Single stat card */
const StatCard = ({ label, value, accentColor, sub, to, loading }) => {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => to && navigate(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#f4f3ff' : T.surface,
        border: `0.5px solid ${hov ? T.indigo : T.border}`,
        borderTop: `2px solid ${loading ? '#ede9e2' : accentColor}`,
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: to ? 'pointer' : 'default',
        transition: 'background 0.12s, border-color 0.12s',
        flex: 1, minWidth: '100px',
      }}
    >
      {loading ? (
        <>
          <Sk h={22} w="40px" r={4} />
          <div style={{ marginTop: '6px' }}><Sk h={8} w="60px" /></div>
        </>
      ) : (
        <>
          <div style={{
            fontSize: '22px', fontWeight: '700',
            fontFamily: T.mono, lineHeight: 1,
            letterSpacing: '-0.02em',
            color: hov ? T.indigo : accentColor,
          }}>
            {String(value).padStart(2, '0')}
          </div>
          <div style={{
            fontSize: '8px', letterSpacing: '0.07em',
            textTransform: 'uppercase', color: T.text3,
            marginTop: '4px', fontFamily: T.mono,
          }}>{label}</div>
          {sub && (
            <div style={{ fontSize: '8px', color: T.text3, marginTop: '2px', fontFamily: T.mono }}>
              {sub}
            </div>
          )}
          {hov && to && (
            <div style={{ fontSize: '9px', color: T.indigo, marginTop: '5px', fontFamily: T.mono }}>
              → lihat semua
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** Capacity progress row */
const CapRow = ({ label, value, max, color }) => {
  const pct = capPct(value, max);
  const fill = capColor(pct);
  const track = capTrackBg(pct);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: '500', color: pct >= 100 ? T.red : T.text2 }}>{label}</span>
        <span style={{ fontSize: '9px', fontFamily: T.mono, color: pct >= 100 ? T.red : T.text3 }}>
          {value} / {max}
        </span>
      </div>
      <div style={{ height: '4px', background: track, borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: fill, borderRadius: '2px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      {pct >= 80 && pct < 100 && (
        <div style={{ fontSize: '8px', color: T.amber, marginTop: '2px', fontFamily: T.mono }}>
          {Math.round(pct)}% — hampir penuh
        </div>
      )}
      {pct >= 100 && (
        <div style={{ fontSize: '8px', color: T.red, marginTop: '2px', fontFamily: T.mono }}>
          100% — penuh! Upgrade untuk tambah slot.
        </div>
      )}
    </div>
  );
};

/** List item row (session / class / subject / teacher) */
const ListRow = ({ left, title, meta, right, last = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 0',
    borderBottom: last ? 'none' : `0.5px solid ${T.border}`,
  }}>
    {left}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '11px', fontWeight: '500', color: T.text1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{title}</div>
      {meta && (
        <div style={{ fontSize: '9px', color: T.text3, fontFamily: T.mono, marginTop: '1px' }}>
          {meta}
        </div>
      )}
    </div>
    {right && <div style={{ flexShrink: 0 }}>{right}</div>}
  </div>
);

/** Avatar initials circle */
const Avatar = ({ name, size = 28 }) => {
  const p = pal(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: p.bg, color: p.c,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: size * 0.35,
      flexShrink: 0,
    }}>
      {(name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
};

/** Section card wrapper */
const SCard = ({ title, count, countColor = T.text3, children, to }) => {
  const navigate = useNavigate();
  return (
    <div style={{
      background: T.surface, border: `0.5px solid ${T.border}`,
      borderRadius: '10px', padding: '14px 16px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: T.text1 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {count !== undefined && (
            <span style={{ fontSize: '9px', fontFamily: T.mono, color: countColor }}>
              {count}
            </span>
          )}
          {to && (
            <div
              onClick={() => navigate(to)}
              style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '10px', color: T.indigo, cursor: 'pointer', fontWeight: '500',
              }}
            >
              Lihat semua <ChevronRight size={11} />
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

/** Subscription warning banner */
const SubBanner = ({ school }) => {
  if (!school) return null;
  const days = school.subscription_end_date
    ? Math.ceil((new Date(school.subscription_end_date) - new Date()) / 86400000)
    : null;
  if (school.subscription_status === 'active' && (days === null || days > 30)) return null;

  const isExpired = school.subscription_status === 'expired' || (days !== null && days < 0);
  const isWarning = days !== null && days <= 14 && days >= 0;

  const cfg = isExpired
    ? { bg: T.redBg, border: '#F7C1C1', Icon: AlertCircle, color: T.red, text: 'Langganan Anda telah habis. Hubungi Super Admin untuk perpanjangan.' }
    : isWarning
    ? { bg: T.amberBg, border: '#FDE68A', Icon: Clock, color: T.amber, text: `Langganan berakhir dalam ${days} hari. Segera perpanjang.` }
    : { bg: '#E6F1FB', border: '#BFDBFE', Icon: Zap, color: '#2563EB', text: 'Anda sedang dalam masa trial. Upgrade untuk akses penuh.' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '11px 14px', borderRadius: '7px',
      background: cfg.bg, border: `0.5px solid ${cfg.border}`,
    }}>
      <cfg.Icon size={15} style={{ color: cfg.color, flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: cfg.color, fontWeight: '500' }}>{cfg.text}</span>
    </div>
  );
};

/** Empty state */
const Empty = ({ text, action, onAction }) => (
  <div style={{
    border: `0.5px dashed ${T.border}`, borderRadius: '6px',
    padding: '18px', textAlign: 'center',
  }}>
    <div style={{ fontSize: '11px', color: T.text3, lineHeight: 1.5, marginBottom: action ? '8px' : 0 }}>{text}</div>
    {action && (
      <div onClick={onAction} style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        fontSize: '10px', color: T.indigo, fontWeight: '500', cursor: 'pointer',
      }}>
        {action} <ArrowRight size={11} />
      </div>
    )}
  </div>
);

/* ─── Main component ───────────────────────────────────────────────────────── */
const SchoolAdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState({
    school: null, teachers: [], students: [],
    classes: [], subjects: [], recentSessions: [],
  });
  const [stats, setStats] = useState({ teachers: 0, students: 0, classes: 0, subjects: 0, exams: 0 });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    const sid = profile.school_id;
    try {
      const [schoolRes, profilesRes, classesRes, subjectsRes, sessionsRes] = await Promise.all([
        supabase.from('schools')
          .select('id, name, subscription_status, subscription_end_date, subscription_tier, max_students, max_teachers')
          .eq('id', sid).single(),
        supabase.from('profiles').select('id, name, email, role, created_at').eq('school_id', sid),
        supabase.from('classes').select('id, name, grade_level, jurusan, academic_year, max_students').eq('school_id', sid).order('grade_level'),
        supabase.from('subjects').select('id, name, code').eq('school_id', sid).order('name'),
        supabase.from('exam_sessions')
          .select('id, title, exam_type, start_time, end_time, total_questions')
          .eq('school_id', sid).order('start_time', { ascending: false }).limit(6),
      ]);
      if (schoolRes.error) throw schoolRes.error;

      const profiles  = profilesRes.data || [];
      const teachers  = profiles.filter(p => p.role === 'teacher');
      const students  = profiles.filter(p => p.role === 'student');
      const classes   = classesRes.data  || [];
      const subjects  = subjectsRes.data || [];
      const sessions  = sessionsRes.data || [];

      setData({ school: schoolRes.data, teachers, students, classes, subjects, recentSessions: sessions });
      setStats({ teachers: teachers.length, students: students.length, classes: classes.length, subjects: subjects.length, exams: sessions.length });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.school_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const schoolName = data.school?.name || profile?.schools?.name || 'Sekolah Anda';
  const adminName  = profile?.name || profile?.full_name || 'Admin';
  const now        = new Date();

  const PLAN_BADGE = {
    starter:      { label: 'Starter',    bg: T.amberBg, color: '#854F0B' },
    professional: { label: 'Pro',        bg: T.tealBg,  color: '#085041' },
    enterprise:   { label: 'Enterprise', bg: T.purpleBg, color: T.purple },
  };
  const plan = PLAN_BADGE[data.school?.subscription_tier] || PLAN_BADGE.starter;

  // Exam type badge
  const examBadge = (type) => {
    const map = {
      remedial: { label: 'Remedial', bg: T.redBg,   color: T.red   },
      uh:       { label: 'UH',       bg: T.amberBg, color: T.amberD },
      uts:      { label: 'UTS',      bg: T.indigoBg, color: T.indigo },
      uas:      { label: 'UAS',      bg: T.purpleBg, color: T.purple },
    };
    const m = map[(type || '').toLowerCase()] || { label: 'Ujian', bg: '#E6F1FB', color: '#185FA5' };
    return <Badge {...m} />;
  };

  return (
    <>
      <style>{`
        @keyframes zdShimmer { 0%,100%{opacity:.5} 50%{opacity:.85} }
        @keyframes zdFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .zd-page { animation: zdFadeUp 0.22s ease both; }
        .zd-delay-1 { animation-delay: 0.04s; }
        .zd-delay-2 { animation-delay: 0.08s; }
        .zd-delay-3 { animation-delay: 0.12s; }
        .zd-delay-4 { animation-delay: 0.16s; }
      `}</style>

      <div className="zd-page" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <h1 style={{
                fontFamily: T.heading, fontSize: '20px', fontWeight: '600',
                color: T.text1, margin: 0, letterSpacing: '-0.02em',
              }}>{schoolName}</h1>
              {!loading && <Badge label={plan.label} bg={plan.bg} color={plan.color} />}
            </div>
            <div style={{ fontSize: '11px', color: T.text3, fontFamily: T.mono, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              ADMIN SEKOLAH · {adminName}
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '6px',
              border: `0.5px solid ${T.border2}`,
              background: 'transparent', cursor: 'pointer',
              fontSize: '11px', color: T.text2, fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.indigoBg; e.currentTarget.style.borderColor = T.indigo; e.currentTarget.style.color = T.indigo; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.text2; }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'zdShimmer 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* ── Subscription banner ──────────────────────────────────────── */}
        <SubBanner school={data.school} />

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 14px', borderRadius: '7px',
            background: T.redBg, border: `0.5px solid #F7C1C1`,
          }}>
            <AlertCircle size={15} style={{ color: T.red, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: T.red }}>Gagal memuat data: {error}</span>
            <button onClick={() => { setError(null); setLoading(true); fetchData(); }} style={{
              marginLeft: 'auto', fontSize: '10px', padding: '3px 9px', borderRadius: '4px',
              border: `0.5px solid ${T.red}`, background: 'transparent',
              color: T.red, cursor: 'pointer', fontWeight: '500',
            }}>Coba lagi</button>
          </div>
        )}

        {/* ── Stat cards row ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <StatCard loading={loading} label="Guru"          value={stats.teachers} accentColor={ENTITY.guru.color}  sub={data.school ? `maks ${data.school.max_teachers}` : undefined} to="/school/staff"    />
          <StatCard loading={loading} label="Siswa"         value={stats.students} accentColor={ENTITY.siswa.color} sub={data.school ? `maks ${data.school.max_students}` : undefined} to="/school/staff"    />
          <StatCard loading={loading} label="Kelas"         value={stats.classes}  accentColor={ENTITY.kelas.color} sub="kelas aktif"  to="/school/classes"  />
          <StatCard loading={loading} label="Mata Pelajaran" value={stats.subjects} accentColor={ENTITY.mapel.color} sub="tersedia"     to="/school/subjects" />
          <StatCard loading={loading} label="Sesi Ujian"    value={stats.exams}    accentColor={ENTITY.ujian.color} sub="6 terbaru"   />
        </div>

        {/* ── Capacity bars ────────────────────────────────────────────── */}
        {!loading && data.school && (
          <div className="zd-delay-1 zd-page" style={{
            background: T.surface, border: `0.5px solid ${T.border}`,
            borderRadius: '10px', padding: '14px 16px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px',
          }}>
            <CapRow label="Kapasitas Guru"  value={stats.teachers} max={data.school.max_teachers} />
            <CapRow label="Kapasitas Siswa" value={stats.students} max={data.school.max_students} />
          </div>
        )}

        {/* ── Main content grid ────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>

          {/* Sesi Ujian Terbaru */}
          <div className="zd-delay-1 zd-page">
            <SCard title="Sesi Ujian Terbaru" count={`${stats.exams} total`}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: `0.5px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <Sk h={11} /><Sk h={9} w="60%" />
                    </div>
                  ))
                : !data.recentSessions.length
                ? <Empty text="Belum ada sesi ujian." action="Buat sesi" onAction={() => navigate('/teacher/exams')} />
                : data.recentSessions.map((s, i, arr) => {
                    const isLive = new Date(s.start_time) <= now && new Date(s.end_time) >= now;
                    return (
                      <ListRow
                        key={s.id}
                        last={i === arr.length - 1}
                        left={
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: isLive ? T.greenBg : T.surface2,
                            border: `0.5px solid ${isLive ? '#a7e8d4' : T.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <BarChart2 size={12} style={{ color: isLive ? T.green : T.text3 }} />
                          </div>
                        }
                        title={s.title}
                        meta={`${fmtDate(s.start_time)}${s.total_questions ? ` · ${s.total_questions} soal` : ''}`}
                        right={
                          isLive
                            ? <Badge label="LIVE" bg={T.greenBg} color={T.green} />
                            : examBadge(s.exam_type)
                        }
                      />
                    );
                  })
              }
            </SCard>
          </div>

          {/* Guru */}
          <div className="zd-delay-2 zd-page">
            <SCard title="Guru" count={`${stats.teachers} total`} to="/school/staff">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: `0.5px solid ${T.border}`, alignItems: 'center' }}>
                      <Sk w="28px" h={28} r={99} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}><Sk h={11} /><Sk h={9} w="65%" /></div>
                    </div>
                  ))
                : !data.teachers.length
                ? <Empty text="Belum ada guru terdaftar." action="Tambah guru" onAction={() => navigate('/school/staff')} />
                : data.teachers.slice(0, 5).map((t, i, arr) => (
                    <ListRow
                      key={t.id}
                      last={i === arr.length - 1}
                      left={<Avatar name={t.name} size={28} />}
                      title={t.name}
                      meta={t.email}
                      right={<Badge label="Aktif" bg={T.tealBg} color={T.green} />}
                    />
                  ))
              }
            </SCard>
          </div>

          {/* Daftar Kelas */}
          <div className="zd-delay-3 zd-page">
            <SCard title="Daftar Kelas" count={`${stats.classes} kelas`} to="/school/classes">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: `0.5px solid ${T.border}`, display: 'flex', gap: '8px' }}>
                      <Sk w="28px" h={28} r={6} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}><Sk h={11} /><Sk h={9} w="50%" /></div>
                    </div>
                  ))
                : !data.classes.length
                ? <Empty text="Belum ada kelas." action="Buat kelas" onAction={() => navigate('/school/classes')} />
                : data.classes.slice(0, 5).map((c, i, arr) => {
                    const lvlColor = c.grade_level === 10 ? T.indigo : c.grade_level === 11 ? T.amber : c.grade_level === 12 ? T.teal : T.slate;
                    return (
                      <ListRow
                        key={c.id}
                        last={i === arr.length - 1}
                        left={
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: `${lvlColor}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: T.mono, fontWeight: '700',
                            fontSize: '11px', color: lvlColor, flexShrink: 0,
                          }}>{c.grade_level || '?'}</div>
                        }
                        title={c.name}
                        meta={[c.jurusan && c.jurusan !== 'Umum' ? c.jurusan : null, c.academic_year ? `TA ${c.academic_year}` : null].filter(Boolean).join(' · ') || undefined}
                        right={c.max_students
                          ? <span style={{ fontSize: '9px', color: T.text3, fontFamily: T.mono }}>maks {c.max_students}</span>
                          : null
                        }
                      />
                    );
                  })
              }
            </SCard>
          </div>

          {/* Mata Pelajaran */}
          <div className="zd-delay-4 zd-page">
            <SCard title="Mata Pelajaran" count={`${stats.subjects} mapel`} to="/school/subjects">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: `0.5px solid ${T.border}`, display: 'flex', gap: '8px' }}>
                      <Sk w="28px" h={28} r={6} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}><Sk h={11} /><Sk h={9} w="40%" /></div>
                    </div>
                  ))
                : !data.subjects.length
                ? <Empty text="Belum ada mata pelajaran." action="Tambah mapel" onAction={() => navigate('/school/subjects')} />
                : data.subjects.slice(0, 5).map((s, i, arr) => {
                    // Color from code prefix
                    const codeLC = (s.code || '').toLowerCase();
                    const barColor = codeLC.startsWith('bi') || codeLC.startsWith('b.') ? T.indigo
                      : codeLC.startsWith('mtk') || codeLC.startsWith('mat') ? T.amber
                      : codeLC.startsWith('ipa') || codeLC.startsWith('fis') || codeLC.startsWith('kim') ? T.teal
                      : T.slate;
                    return (
                      <ListRow
                        key={s.id}
                        last={i === arr.length - 1}
                        left={
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '3px', height: '28px', background: barColor, borderRadius: '2px', flexShrink: 0 }} />
                          </div>
                        }
                        title={s.name}
                        meta={s.code || undefined}
                      />
                    );
                  })
              }
            </SCard>
          </div>

        </div>
      </div>
    </>
  );
};

export default SchoolAdminDashboard;

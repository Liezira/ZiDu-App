import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  BookOpen,
  GraduationCap,
  BarChart2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Layers,
  CheckCircle2,
  Clock,
  Calendar,
  Zap,
  ChevronRight,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString('id-ID');

const SkeletonCard = () => (
  <div
    style={{
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #F1F5F9',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div
        style={{ height: '13px', width: '100px', borderRadius: '6px' }}
        className="zidu-shimmer"
      />
      <div
        style={{ width: '38px', height: '38px', borderRadius: '10px' }}
        className="zidu-shimmer"
      />
    </div>
    <div
      style={{ height: '32px', width: '70px', borderRadius: '8px' }}
      className="zidu-shimmer"
    />
    <div
      style={{ height: '11px', width: '130px', borderRadius: '6px' }}
      className="zidu-shimmer"
    />
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
  max,
  delay = 0,
}) => {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : null;
  return (
    <div
      className="zidu-fadeup"
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #F1F5F9',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#64748B',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#0F172A',
              lineHeight: 1,
              fontFamily: 'Sora, sans-serif',
            }}
          >
            {fmt(value)}
          </span>
          {max && (
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>
              / {fmt(max)}
            </span>
          )}
        </div>
        {sub && (
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '5px' }}>
            {sub}
          </div>
        )}
      </div>
      {pct !== null && (
        <div>
          <div
            style={{
              height: '5px',
              borderRadius: '99px',
              background: '#F1F5F9',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: '99px',
                background: pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : color,
                width: `${pct}%`,
                transition: 'width 0.8s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
            {pct}% kapasitas terpakai
          </div>
        </div>
      )}
    </div>
  );
};

// ── Quick List Row ────────────────────────────────────────────────
const ListRow = ({
  avatar,
  title,
  sub,
  right,
  color = '#4F46E5',
  bg = '#EEF2FF',
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '11px 0',
      borderBottom: '1px solid #F8FAFC',
    }}
  >
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Sora, sans-serif',
        fontWeight: '700',
        fontSize: '14px',
        color,
        flexShrink: 0,
      }}
    >
      {avatar}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#0F172A',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </div>
      {sub && <div style={{ fontSize: '12px', color: '#94A3B8' }}>{sub}</div>}
    </div>
    {right && (
      <div style={{ fontSize: '12px', color: '#64748B', flexShrink: 0 }}>
        {right}
      </div>
    )}
  </div>
);

// ── Subscription Banner ───────────────────────────────────────────
const SubBanner = ({ school }) => {
  if (!school) return null;
  const days = school.subscription_end_date
    ? Math.ceil(
        (new Date(school.subscription_end_date) - new Date()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  if (school.subscription_status === 'active' && (days === null || days > 30))
    return null;

  const isExpired =
    school.subscription_status === 'expired' || (days !== null && days < 0);
  const isWarning = days !== null && days <= 14 && days >= 0;
  const isTrial = school.subscription_status === 'trial';

  const config = isExpired
    ? {
        bg: '#FEF2F2',
        border: '#FECACA',
        icon: AlertCircle,
        color: '#DC2626',
        text: 'Langganan Anda telah habis. Hubungi Super Admin untuk perpanjangan.',
      }
    : isWarning
    ? {
        bg: '#FFFBEB',
        border: '#FDE68A',
        icon: Clock,
        color: '#D97706',
        text: `Langganan berakhir dalam ${days} hari. Segera perpanjang agar tidak terganggu.`,
      }
    : {
        bg: '#EFF6FF',
        border: '#BFDBFE',
        icon: Zap,
        color: '#2563EB',
        text: `Anda sedang dalam masa trial. Upgrade untuk akses penuh.`,
      };

  return (
    <div
      className="zidu-fadeup"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        borderRadius: '12px',
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      <config.icon size={18} style={{ color: config.color, flexShrink: 0 }} />
      <p
        style={{
          fontSize: '13px',
          color: config.color,
          fontWeight: '500',
          margin: 0,
        }}
      >
        {config.text}
      </p>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────
const SchoolAdminDashboard = () => {
  const { profile } = useAuth();
  const [data, setData] = useState({
    school: null,
    teachers: [],
    students: [],
    classes: [],
    subjects: [],
    recentSessions: [],
  });
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    classes: 0,
    subjects: 0,
    exams: 0,
    avgScore: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }
    const sid = profile.school_id;

    try {
      const [schoolRes, profilesRes, classesRes, subjectsRes, sessionsRes] =
        await Promise.all([
          supabase.from('schools').select('*').eq('id', sid).single(),
          supabase
            .from('profiles')
            .select('id, name, email, role, created_at')
            .eq('school_id', sid),
          supabase
            .from('classes')
            .select('*')
            .eq('school_id', sid)
            .order('grade_level'),
          supabase
            .from('subjects')
            .select('*')
            .eq('school_id', sid)
            .order('name'),
          supabase
            .from('exam_sessions')
            .select(
              'id, title, exam_type, start_time, end_time, total_questions'
            )
            .eq('school_id', sid)
            .order('start_time', { ascending: false })
            .limit(5),
        ]);

      if (schoolRes.error) throw schoolRes.error;

      const profiles = profilesRes.data || [];
      const teachers = profiles.filter((p) => p.role === 'teacher');
      const students = profiles.filter((p) => p.role === 'student');

      setData({
        school: schoolRes.data,
        teachers: teachers.slice(0, 5),
        students: students.slice(0, 5),
        classes: classesRes.data || [],
        subjects: subjectsRes.data || [],
        recentSessions: sessionsRes.data || [],
      });

      setStats({
        teachers: teachers.length,
        students: students.length,
        classes: (classesRes.data || []).length,
        subjects: (subjectsRes.data || []).length,
        exams: (sessionsRes.data || []).length,
        avgScore: null, // bisa di-extend dengan query exam_results
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile?.school_id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const schoolName =
    data.school?.name || profile?.schools?.name || 'Sekolah Anda';
  const tierMeta = {
    starter: { label: 'Starter', color: '#16A34A', bg: '#F0FDF4' },
    professional: { label: 'Professional', color: '#2563EB', bg: '#EFF6FF' },
    enterprise: { label: 'Enterprise', color: '#9333EA', bg: '#FDF4FF' },
  };
  const tier = tierMeta[data.school?.subscription_tier] || tierMeta.starter;

  const now = new Date();
  const activeExams = data.recentSessions.filter(
    (s) => new Date(s.start_time) <= now && new Date(s.end_time) >= now
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;} 100%{background-position:400px 0;} }
        @keyframes pulse   { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
        .zidu-fadeup  { opacity:0; animation: fadeUp 0.45s ease forwards; }
        .zidu-shimmer { background: linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%); background-size:800px 100%; animation:shimmer 1.2s infinite; }
        .zidu-card-hover:hover { box-shadow: 0 4px 20px rgba(79,70,229,0.08) !important; transform: translateY(-1px); transition: all 0.2s; }
        .zidu-search:focus { outline:none; border-color:#4F46E5; box-shadow:0 0 0 3px rgba(79,70,229,0.12); }
      `}</style>

      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* ── Header ── */}
        <div
          className="zidu-fadeup"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                {schoolName}
              </h1>
              <span
                style={{
                  padding: '3px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: tier.bg,
                  color: tier.color,
                }}
              >
                {tier.label}
              </span>
              {activeExams.length > 0 && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: '#F0FDF4',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#16A34A',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  {activeExams.length} ujian berlangsung
                </span>
              )}
            </div>
            <p
              style={{ fontSize: '14px', color: '#64748B', margin: '6px 0 0' }}
            >
              Selamat datang kembali,{' '}
              <strong style={{ color: '#0F172A' }}>
                {profile?.name || 'Admin'}
              </strong>
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              background: '#fff',
              fontSize: '13px',
              fontWeight: '500',
              color: '#475569',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              }}
            />
            Refresh
          </button>
        </div>

        {/* ── Subscription Banner ── */}
        <SubBanner school={data.school} />

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              padding: '16px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '12px',
              color: '#DC2626',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={16} /> Gagal memuat data: {error}
          </div>
        )}

        {/* ── Stat Cards ── */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
            }}
          >
            <StatCard
              icon={Users}
              label="Guru"
              value={stats.teachers}
              max={data.school?.max_teachers}
              sub="Tenaga pengajar aktif"
              color="#4F46E5"
              bg="#EEF2FF"
              delay={0}
            />
            <StatCard
              icon={GraduationCap}
              label="Siswa"
              value={stats.students}
              max={data.school?.max_students}
              sub="Total siswa terdaftar"
              color="#0891B2"
              bg="#EFF6FF"
              delay={60}
            />
            <StatCard
              icon={Layers}
              label="Kelas"
              value={stats.classes}
              sub="Kelas aktif tahun ini"
              color="#7C3AED"
              bg="#F5F3FF"
              delay={120}
            />
            <StatCard
              icon={BookOpen}
              label="Mata Pelajaran"
              value={stats.subjects}
              sub="Mapel tersedia"
              color="#D97706"
              bg="#FFFBEB"
              delay={180}
            />
            <StatCard
              icon={BarChart2}
              label="Sesi Ujian"
              value={stats.exams}
              sub="Ujian dibuat (5 terbaru)"
              color="#16A34A"
              bg="#F0FDF4"
              delay={240}
            />
          </div>
        )}

        {/* ── 2-Column Section ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Kelas */}
          <div
            className="zidu-fadeup zidu-card-hover"
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #F1F5F9',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              animationDelay: '300ms',
            }}
          >
            <div
              style={{
                padding: '18px 20px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F8FAFC',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Layers size={15} style={{ color: '#7C3AED' }} />
                <h3
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0F172A',
                    margin: 0,
                  }}
                >
                  Daftar Kelas
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                {data.classes.length} kelas
              </span>
            </div>
            <div style={{ padding: '4px 20px 8px' }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '12px',
                      borderRadius: '6px',
                      margin: '12px 0',
                    }}
                    className="zidu-shimmer"
                  />
                ))
              ) : data.classes.length === 0 ? (
                <div
                  style={{
                    padding: '24px 0',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '13px',
                  }}
                >
                  Belum ada kelas
                </div>
              ) : (
                data.classes
                  .slice(0, 6)
                  .map((c) => (
                    <ListRow
                      key={c.id}
                      avatar={`${c.grade_level || '?'}`}
                      title={c.name}
                      sub={c.academic_year ? `TA ${c.academic_year}` : ''}
                      right={`Maks ${c.max_students} siswa`}
                      color="#7C3AED"
                      bg="#F5F3FF"
                    />
                  ))
              )}
              {data.classes.length > 6 && (
                <div
                  style={{
                    padding: '10px 0',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#4F46E5',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  +{data.classes.length - 6} kelas lainnya →
                </div>
              )}
            </div>
          </div>

          {/* Mata Pelajaran */}
          <div
            className="zidu-fadeup zidu-card-hover"
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #F1F5F9',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              animationDelay: '360ms',
            }}
          >
            <div
              style={{
                padding: '18px 20px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F8FAFC',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <BookOpen size={15} style={{ color: '#D97706' }} />
                <h3
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0F172A',
                    margin: 0,
                  }}
                >
                  Mata Pelajaran
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                {data.subjects.length} mapel
              </span>
            </div>
            <div style={{ padding: '4px 20px 8px' }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '12px',
                      borderRadius: '6px',
                      margin: '12px 0',
                    }}
                    className="zidu-shimmer"
                  />
                ))
              ) : data.subjects.length === 0 ? (
                <div
                  style={{
                    padding: '24px 0',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '13px',
                  }}
                >
                  Belum ada mata pelajaran
                </div>
              ) : (
                data.subjects
                  .slice(0, 6)
                  .map((s) => (
                    <ListRow
                      key={s.id}
                      avatar={s.code?.substring(0, 2).toUpperCase() || '?'}
                      title={s.name}
                      sub={s.code}
                      color="#D97706"
                      bg="#FFFBEB"
                    />
                  ))
              )}
            </div>
          </div>

          {/* Guru Terbaru */}
          <div
            className="zidu-fadeup zidu-card-hover"
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #F1F5F9',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              animationDelay: '420ms',
            }}
          >
            <div
              style={{
                padding: '18px 20px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F8FAFC',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Users size={15} style={{ color: '#4F46E5' }} />
                <h3
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0F172A',
                    margin: 0,
                  }}
                >
                  Guru Terbaru
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                {stats.teachers} total
              </span>
            </div>
            <div style={{ padding: '4px 20px 8px' }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '12px',
                      borderRadius: '6px',
                      margin: '12px 0',
                    }}
                    className="zidu-shimmer"
                  />
                ))
              ) : data.teachers.length === 0 ? (
                <div
                  style={{
                    padding: '24px 0',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '13px',
                  }}
                >
                  Belum ada guru terdaftar
                </div>
              ) : (
                data.teachers.map((t) => (
                  <ListRow
                    key={t.id}
                    avatar={t.name.charAt(0).toUpperCase()}
                    title={t.name}
                    sub={t.email}
                    color="#4F46E5"
                    bg="#EEF2FF"
                  />
                ))
              )}
            </div>
          </div>

          {/* Sesi Ujian Terbaru */}
          <div
            className="zidu-fadeup zidu-card-hover"
            style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid #F1F5F9',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              animationDelay: '480ms',
            }}
          >
            <div
              style={{
                padding: '18px 20px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #F8FAFC',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Calendar size={15} style={{ color: '#16A34A' }} />
                <h3
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0F172A',
                    margin: 0,
                  }}
                >
                  Sesi Ujian
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                5 terbaru
              </span>
            </div>
            <div style={{ padding: '4px 20px 8px' }}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '12px',
                      borderRadius: '6px',
                      margin: '12px 0',
                    }}
                    className="zidu-shimmer"
                  />
                ))
              ) : data.recentSessions.length === 0 ? (
                <div
                  style={{
                    padding: '24px 0',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '13px',
                  }}
                >
                  Belum ada sesi ujian
                </div>
              ) : (
                data.recentSessions.map((s) => {
                  const isLive =
                    new Date(s.start_time) <= now &&
                    new Date(s.end_time) >= now;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '11px 0',
                        borderBottom: '1px solid #F8FAFC',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isLive ? '#F0FDF4' : '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isLive ? (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#16A34A',
                              animation: 'pulse 1.5s infinite',
                            }}
                          />
                        ) : (
                          <BarChart2 size={14} style={{ color: '#94A3B8' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#0F172A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {new Date(s.start_time).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {s.total_questions
                            ? ` · ${s.total_questions} soal`
                            : ''}
                        </div>
                      </div>
                      {isLive && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#16A34A',
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            flexShrink: 0,
                          }}
                        >
                          LIVE
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div
          className="zidu-fadeup"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            animationDelay: '500ms',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#CBD5E1',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Zap size={10} style={{ color: '#4F46E5' }} /> Data real-time dari
            Supabase
          </span>
        </div>
      </div>
    </>
  );
};

export default SchoolAdminDashboard;

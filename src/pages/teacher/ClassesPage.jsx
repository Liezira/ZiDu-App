import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, BookOpen, BarChart2, Calendar, ChevronRight,
  Search, X, GraduationCap, TrendingUp, Clock, CheckCircle2,
  AlertCircle, RefreshCw, Layers,
} from 'lucide-react';
import {
  T, DashboardStyles, Shimmer, SectionCard, EmptyState,
  RowItem, PageHeader, ErrorBanner, Badge, StatCard,
  StatCardSkeleton, RefreshButton, IconBox, LiveDot, ScoreRing,
} from '../../components/ui/DashboardUI';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  : '—';

// ── Chip tab ──────────────────────────────────────────────────────
const Tab = ({ label, active, onClick, count }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 16px', borderRadius: '999px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: '600', fontFamily: T.fontBody,
    background: active ? T.brand : 'transparent',
    color: active ? '#fff' : T.textSub,
    transition: 'all .2s',
  }}>
    {label}
    {count !== undefined && (
      <span style={{
        padding: '1px 7px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
        background: active ? 'rgba(255,255,255,0.25)' : T.borderLight,
        color: active ? '#fff' : T.textMuted,
      }}>{count}</span>
    )}
  </button>
);

// ── Student row ───────────────────────────────────────────────────
const StudentRow = ({ student, avg, last }) => {
  const initial = (student.name || '?').charAt(0).toUpperCase();
  const scoreColor = avg >= 75 ? T.green : avg > 0 ? T.amber : T.textMuted;
  return (
    <RowItem last={last}
      left={
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: T.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '13px', color: T.brand, flexShrink: 0 }}>
          {initial}
        </div>
      }
      title={student.name}
      sub={student.nis ? `NIS: ${student.nis}` : student.email}
      right={
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: scoreColor, fontFamily: T.fontDisplay }}>{avg > 0 ? avg.toFixed(0) : '—'}</div>
          <div style={{ fontSize: '10px', color: T.textMuted }}>rata-rata</div>
        </div>
      }
    />
  );
};

// ── Session row ───────────────────────────────────────────────────
const SessionRow = ({ session, last }) => {
  const now = new Date();
  const start = new Date(session.start_time);
  const end = new Date(session.end_time);
  const isLive = start <= now && end >= now;
  const isPast = end < now;
  const status = isLive ? { label: 'LIVE', color: T.green, bg: T.greenLight }
    : isPast ? { label: 'Selesai', color: T.textMuted, bg: T.surfaceAlt }
    : { label: 'Upcoming', color: T.amber, bg: T.amberLight };

  return (
    <RowItem last={last}
      left={
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: status.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isLive ? <LiveDot color={T.green} /> : <Calendar size={14} style={{ color: status.color }} />}
        </div>
      }
      title={session.title}
      sub={`${fmtDate(session.start_time)} · ${fmtTime(session.start_time)} — ${fmtTime(session.end_time)}`}
      right={<Badge label={status.label} color={status.color} bg={status.bg} />}
    />
  );
};

// ── Class Detail Panel ────────────────────────────────────────────
const ClassPanel = ({ cls, teacherId, schoolId, onClose }) => {
  const [tab,       setTab]       = useState('siswa');
  const [students,  setStudents]  = useState([]);
  const [sessions,  setSessions]  = useState([]);
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [studRes, sessRes] = await Promise.all([
        supabase.from('profiles').select('id, name, email, nis, status')
          .eq('class_id', cls.id).eq('role', 'student').eq('status', 'active').order('name'),
        supabase.from('exam_sessions').select('id, title, start_time, end_time, total_questions')
          .eq('class_id', cls.id).eq('teacher_id', teacherId).order('start_time', { ascending: false }).limit(10),
      ]);
      const studs = studRes.data || [];
      const sess  = sessRes.data || [];
      setStudents(studs);
      setSessions(sess);

      // Fetch hasil ujian untuk hitung avg per siswa
      if (sess.length > 0 && studs.length > 0) {
        const sessIds = sess.map(s => s.id);
        const { data: res } = await supabase.from('exam_results')
          .select('student_id, score, status')
          .in('exam_session_id', sessIds)
          .in('status', ['submitted', 'graded']);
        setResults(res || []);
      }
      setLoading(false);
    };
    fetch();
  }, [cls.id, teacherId]);

  // Hitung avg score per siswa
  const avgByStudent = (studentId) => {
    const scores = results.filter(r => r.student_id === studentId && r.score !== null).map(r => r.score);
    if (!scores.length) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const classAvg = students.length > 0
    ? students.reduce((acc, s) => acc + avgByStudent(s.id), 0) / students.length
    : 0;

  const liveCount = sessions.filter(s => {
    const n = new Date(); return new Date(s.start_time) <= n && new Date(s.end_time) >= n;
  }).length;

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.nis || '').includes(search)
  );

  const JURUSAN_COLOR = { IPA: T.blue, IPS: T.green, Umum: T.brand, Bahasa: T.purple, SMK: T.amber };
  const jColor = JURUSAN_COLOR[cls.jurusan] || T.brand;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />

      {/* Drawer */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: '520px', background: T.surface, boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideIn .25s ease' }}>
        <style>{`@keyframes slideIn{from{transform:translateX(100%);}to{transform:translateX(0);}}`}</style>

        {/* Header drawer */}
        <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${T.borderLight}`, paddingBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h2 style={{ fontFamily: T.fontDisplay, fontSize: '18px', fontWeight: '700', color: T.text, margin: 0 }}>{cls.name}</h2>
                <Badge label={cls.jurusan || 'Umum'} color={jColor} bg={jColor + '18'} />
                {liveCount > 0 && <Badge label={`${liveCount} LIVE`} color={T.green} bg={T.greenLight} />}
              </div>
              <div style={{ fontSize: '12px', color: T.textMuted, fontFamily: T.fontBody }}>
                Kelas {cls.grade_level} · TA {cls.academic_year || '—'}
              </div>
            </div>
            <button onClick={onClose} style={{ padding: '6px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.surface, cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center' }}>
              <X size={16} />
            </button>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            {[
              { label: 'Siswa', value: loading ? '…' : students.length, icon: Users, color: T.brand, bg: T.brandLight },
              { label: 'Ujian', value: loading ? '…' : sessions.length, icon: Calendar, color: T.amber, bg: T.amberLight },
              { label: 'Rata-rata', value: loading ? '…' : classAvg > 0 ? classAvg.toFixed(0) : '—', icon: TrendingUp, color: classAvg >= 75 ? T.green : T.amber, bg: classAvg >= 75 ? T.greenLight : T.amberLight },
            ].map(s => (
              <div key={s.label} style={{ padding: '10px 12px', borderRadius: T.rMd, background: s.bg, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <s.icon size={14} style={{ color: s.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: s.color, fontFamily: T.fontDisplay, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: s.color + 'aa', fontFamily: T.fontBody }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: T.surfaceAlt, borderRadius: '999px', padding: '3px' }}>
            <Tab label="Siswa" active={tab === 'siswa'} onClick={() => setTab('siswa')} count={students.length} />
            <Tab label="Ujian" active={tab === 'ujian'} onClick={() => setTab('ujian')} count={sessions.length} />
            <Tab label="Nilai" active={tab === 'nilai'} onClick={() => setTab('nilai')} />
          </div>
        </div>

        {/* Body drawer */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {/* Tab: Siswa */}
          {tab === 'siswa' && (
            <>
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: T.textMuted, pointerEvents: 'none' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NIS..." style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: T.rMd, border: `1.5px solid ${T.border}`, background: T.surfaceAlt, fontSize: '13px', color: T.text, outline: 'none', fontFamily: T.fontBody, boxSizing: 'border-box' }} />
                {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex' }}><X size={14} /></button>}
              </div>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Shimmer w="34px" h={34} r={34} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}><Shimmer h={12} /><Shimmer w="55%" h={11} /></div>
                </div>
              )) : !filtered.length ? <EmptyState icon="🔍" text="Tidak ada siswa ditemukan" sub={search ? 'Coba kata kunci lain' : 'Belum ada siswa aktif di kelas ini'} />
              : filtered.map((s, i) => <StudentRow key={s.id} student={s} avg={avgByStudent(s.id)} last={i === filtered.length - 1} />)}
            </>
          )}

          {/* Tab: Ujian */}
          {tab === 'ujian' && (
            loading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={12} /><div style={{ marginTop: '5px' }}><Shimmer w="60%" h={11} /></div></div>
            )) : !sessions.length ? <EmptyState icon="📋" text="Belum ada ujian di kelas ini" sub="Buat ujian baru di menu Kelola Ujian" />
            : sessions.map((s, i) => <SessionRow key={s.id} session={s} last={i === sessions.length - 1} />)
          )}

          {/* Tab: Nilai */}
          {tab === 'nilai' && (
            loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} h={48} r={10} />)}</div>
            : !students.length ? <EmptyState icon="📊" text="Belum ada data nilai" />
            : (
              <>
                {/* Class avg banner */}
                <div style={{ padding: '14px 16px', borderRadius: T.rMd, background: classAvg >= 75 ? T.greenLight : T.amberLight, border: `1px solid ${classAvg >= 75 ? '#BBF7D0' : '#FDE68A'}`, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: classAvg >= 75 ? T.green : T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={18} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: classAvg >= 75 ? T.green : T.amber, fontWeight: '600', fontFamily: T.fontBody }}>RATA-RATA KELAS</div>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: classAvg >= 75 ? T.green : T.amber, fontFamily: T.fontDisplay }}>{classAvg > 0 ? classAvg.toFixed(1) : '—'}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: classAvg >= 75 ? T.green : T.amber, fontWeight: '500', fontFamily: T.fontBody }}>
                    {classAvg >= 75 ? '✅ Di atas KKM' : classAvg > 0 ? '⚠️ Di bawah KKM' : 'Belum ada ujian'}
                  </div>
                </div>

                {/* Per-student scores */}
                {students.map((s, i) => {
                  const avg = avgByStudent(s.id);
                  const color = avg >= 75 ? T.green : avg > 0 ? T.amber : T.textMuted;
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i === students.length - 1 ? 'none' : `1px solid ${T.borderLight}` }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: T.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '11px', color: T.brand, flexShrink: 0 }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: T.text, fontFamily: T.fontBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: T.textMuted, fontFamily: T.fontBody }}>{s.nis ? `NIS ${s.nis}` : s.email}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color, fontFamily: T.fontDisplay }}>{avg > 0 ? avg.toFixed(0) : '—'}</div>
                        {avg > 0 && <div style={{ fontSize: '10px', color, fontWeight: '600' }}>{avg >= 75 ? 'LULUS' : 'REMEDIAL'}</div>}
                      </div>
                    </div>
                  );
                })}
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const ClassesPage = () => {
  const { profile } = useAuth();
  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState(null);

  const fetchClasses = useCallback(async () => {
    if (!profile?.school_id) { setLoading(false); return; }
    try {
      // Ambil kelas berdasarkan subject_teachers → subject_classes → classes
      const { data: stRows } = await supabase
        .from('subject_teachers')
        .select('subject_id')
        .eq('teacher_id', profile.id);

      const subjectIds = (stRows || []).map(r => r.subject_id);

      if (!subjectIds.length) { setClasses([]); setLoading(false); setRefreshing(false); return; }

      const { data: scRows } = await supabase
        .from('subject_classes')
        .select('class_id')
        .in('subject_id', subjectIds);

      const classIds = [...new Set((scRows || []).map(r => r.class_id))];

      if (!classIds.length) { setClasses([]); setLoading(false); setRefreshing(false); return; }

      const { data, error: err } = await supabase
        .from('classes')
        .select('id, name, grade_level, jurusan, academic_year, max_students, wali_kelas_id, profiles!classes_wali_kelas_id_fkey(name)')
        .in('id', classIds)
        .order('grade_level');

      if (err) throw err;

      // Hitung jumlah siswa per kelas
      const { data: counts } = await supabase
        .from('profiles')
        .select('class_id')
        .in('class_id', classIds)
        .eq('role', 'student')
        .eq('status', 'active');

      const countMap = (counts || []).reduce((acc, r) => {
        acc[r.class_id] = (acc[r.class_id] || 0) + 1;
        return acc;
      }, {});

      setClasses((data || []).map(c => ({ ...c, studentCount: countMap[c.id] || 0 })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id, profile?.school_id]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const JURUSAN_COLOR = { IPA: T.blue, IPS: T.green, Umum: T.brand, Bahasa: T.purple, SMK: T.amber };

  return (
    <>
      <DashboardStyles />
      <div style={{ fontFamily: T.fontBody, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div className="du-fadein" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: '20px', fontWeight: '700', color: T.text, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Kelas Saya
            </h1>
            <p style={{ fontSize: '13px', color: T.textSub, margin: 0 }}>
              Kelas yang diampu berdasarkan mata pelajaran yang diajarkan
            </p>
          </div>
          <RefreshButton Icon={RefreshCw} loading={refreshing} onClick={() => { setRefreshing(true); fetchClasses(); }} />
        </div>

        {error && <ErrorBanner message={error} />}

        {/* Stat summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {loading ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />) : <>
            <StatCard icon={Layers}       label="Total Kelas"  value={classes.length}                              color={T.brand}  bg={T.brandLight}  delay={0}   />
            <StatCard icon={Users}        label="Total Siswa"  value={classes.reduce((a, c) => a + c.studentCount, 0)} color={T.blue}   bg={T.blueLight}   delay={60}  />
            <StatCard icon={GraduationCap} label="Max Siswa"  value={classes.reduce((a, c) => a + c.max_students, 0)} color={T.purple} bg={T.purpleLight} delay={120} />
          </>}
        </div>

        {/* Class cards grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: T.surface, borderRadius: T.rLg, border: `1px solid ${T.borderLight}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Shimmer h={14} w="60%" /><Shimmer h={11} w="40%" /><Shimmer h={6} r={6} /><Shimmer h={11} w="55%" />
              </div>
            ))}
          </div>
        ) : !classes.length ? (
          <EmptyState icon="🏫" text="Belum ada kelas yang diampu" sub="Pastikan mata pelajaran Anda sudah di-assign ke kelas oleh School Admin" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {classes.map((cls, i) => {
              const jColor = JURUSAN_COLOR[cls.jurusan] || T.brand;
              const pct = Math.min(100, Math.round((cls.studentCount / cls.max_students) * 100));
              const wali = cls.profiles?.name;
              return (
                <div key={cls.id} className="du-fadein du-card-hover" onClick={() => setSelected(cls)}
                  style={{ background: T.surface, borderRadius: T.rLg, border: `1px solid ${T.borderLight}`, padding: '20px', cursor: 'pointer', boxShadow: T.shadowSm, display: 'flex', flexDirection: 'column', gap: '14px', animationDelay: `${i * 50}ms` }}>

                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontFamily: T.fontDisplay, fontSize: '16px', fontWeight: '700', color: T.text, marginBottom: '3px' }}>{cls.name}</div>
                      <div style={{ fontSize: '12px', color: T.textMuted }}>Kelas {cls.grade_level} · TA {cls.academic_year || '—'}</div>
                    </div>
                    <Badge label={cls.jurusan || 'Umum'} color={jColor} bg={jColor + '18'} />
                  </div>

                  {/* Capacity bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '11px', color: T.textMuted }}>Siswa aktif</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: pct > 80 ? T.red : T.text }}>{cls.studentCount}/{cls.max_students}</span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '99px', background: T.borderLight, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', background: pct > 80 ? T.red : pct > 60 ? T.amber : T.brand, width: `${pct}%`, transition: 'width .8s ease' }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '12px', color: T.textMuted }}>
                      {wali ? <>👤 {wali}</> : <span style={{ color: T.border }}>Belum ada wali kelas</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: T.brand, fontWeight: '600' }}>
                      Detail <ChevronRight size={13} />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <ClassPanel
          cls={selected}
          teacherId={profile.id}
          schoolId={profile.school_id}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
};

export default ClassesPage;
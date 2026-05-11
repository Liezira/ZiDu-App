import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, Calendar, BarChart2, BookOpen,
  GraduationCap, TrendingUp, Clock, CheckCircle2,
  Search, X, User, Layers,
} from 'lucide-react';
import {
  T, DashboardStyles, Shimmer, SectionCard, EmptyState,
  RowItem, ErrorBanner, Badge, StatCard, StatCardSkeleton,
  IconBox, LiveDot, ScoreRing,
} from '../../components/ui/DashboardUI';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  : '—';

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
      <span style={{ padding: '1px 7px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: active ? 'rgba(255,255,255,0.25)' : T.borderLight, color: active ? '#fff' : T.textMuted }}>{count}</span>
    )}
  </button>
);

const MyClassPage = () => {
  const { profile } = useAuth();
  const [tab,        setTab]        = useState('teman');
  const [classInfo,  setClassInfo]  = useState(null);
  const [classmates, setClassmates] = useState([]);
  const [sessions,   setSessions]   = useState([]);
  const [myResults,  setMyResults]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState('');

  const fetchAll = useCallback(async () => {
    if (!profile?.class_id) { setLoading(false); return; }
    try {
      const [clsRes, matesRes, sessRes] = await Promise.all([
        // Info kelas + wali kelas
        supabase.from('classes')
          .select('*, profiles!classes_wali_kelas_id_fkey(id, name, email, avatar_url)')
          .eq('id', profile.class_id).single(),
        // Teman sekelas
        supabase.from('profiles')
          .select('id, name, email, nis, avatar_url')
          .eq('class_id', profile.class_id)
          .eq('role', 'student')
          .eq('status', 'active')
          .neq('id', profile.id)
          .order('name'),
        // Sesi ujian kelas ini
        supabase.from('exam_sessions')
          .select('id, title, exam_type, start_time, end_time, duration_minutes, total_questions, passing_score')
          .eq('class_id', profile.class_id)
          .order('start_time', { ascending: false })
          .limit(20),
      ]);

      if (clsRes.error) throw clsRes.error;
      setClassInfo(clsRes.data);
      setClassmates(matesRes.data || []);
      setSessions(sessRes.data || []);

      // Ambil hasil ujian saya
      const sessIds = (sessRes.data || []).map(s => s.id);
      if (sessIds.length) {
        const { data: resData } = await supabase
          .from('exam_results')
          .select('exam_session_id, score, status, submitted_at, passed')
          .eq('student_id', profile.id)
          .in('exam_session_id', sessIds)
          .in('status', ['submitted', 'graded']);
        setMyResults(resData || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.class_id, profile?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Kalkulasi stats
  const now = new Date();
  const liveCount = sessions.filter(s => new Date(s.start_time) <= now && new Date(s.end_time) >= now).length;
  const upcoming  = sessions.filter(s => new Date(s.start_time) > now);
  const myAvg     = myResults.length
    ? myResults.filter(r => r.score !== null).reduce((a, r) => a + r.score, 0) / myResults.filter(r => r.score !== null).length
    : 0;
  const lulusCount = myResults.filter(r => r.passed).length;

  const JURUSAN_COLOR = { IPA: T.blue, IPS: T.green, Umum: T.brand, Bahasa: T.purple, SMK: T.amber };
  const jColor = JURUSAN_COLOR[classInfo?.jurusan] || T.brand;

  const filteredMates = classmates.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.nis || '').includes(search)
  );

  if (!profile?.class_id && !loading) {
    return (
      <>
        <DashboardStyles />
        <EmptyState icon="🏫" text="Kamu belum terdaftar di kelas manapun" sub="Hubungi School Admin untuk di-assign ke kelas" />
      </>
    );
  }

  return (
    <>
      <DashboardStyles />
      <div style={{ fontFamily: T.fontBody, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Header Kelas ── */}
        {loading ? (
          <div style={{ background: T.surface, borderRadius: T.rXl, border: `1px solid ${T.borderLight}`, padding: '24px', boxShadow: T.shadowSm }}>
            <Shimmer h={20} w="40%" /><div style={{ marginTop: '8px' }}><Shimmer h={13} w="60%" /></div>
          </div>
        ) : classInfo && (
          <div className="du-fadein" style={{ background: T.surface, borderRadius: T.rXl, border: `1px solid ${T.borderLight}`, padding: '24px', boxShadow: T.shadowSm }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h1 style={{ fontFamily: T.fontDisplay, fontSize: '22px', fontWeight: '700', color: T.text, margin: 0, letterSpacing: '-0.02em' }}>{classInfo.name}</h1>
                  <Badge label={classInfo.jurusan || 'Umum'} color={jColor} bg={jColor + '18'} />
                  {liveCount > 0 && <Badge label={`${liveCount} Ujian LIVE`} color={T.green} bg={T.greenLight} />}
                </div>
                <div style={{ display: 'flex', align: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: T.textSub }}>📚 Kelas {classInfo.grade_level}</span>
                  <span style={{ fontSize: '13px', color: T.textSub }}>📅 TA {classInfo.academic_year || '—'}</span>
                  {classInfo.profiles?.name && <span style={{ fontSize: '13px', color: T.textSub }}>👤 Wali: <strong style={{ color: T.text }}>{classInfo.profiles.name}</strong></span>}
                </div>
              </div>
              {/* Score ring my avg */}
              {myAvg > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: T.rMd, background: myAvg >= 75 ? T.greenLight : T.amberLight, border: `1px solid ${myAvg >= 75 ? '#BBF7D0' : '#FDE68A'}` }}>
                  <ScoreRing score={myAvg} size={48} passing={classInfo.passing_score || 75} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: myAvg >= 75 ? T.green : T.amber }}>RATA-RATA SAYA</div>
                    <div style={{ fontSize: '11px', color: T.textMuted }}>{lulusCount}/{myResults.length} ujian lulus</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : <>
            <StatCard icon={Users}        label="Teman Sekelas" value={classmates.length}    color={T.brand}  bg={T.brandLight}  delay={0}   />
            <StatCard icon={Calendar}     label="Total Ujian"   value={sessions.length}      color={T.amber}  bg={T.amberLight}  delay={50}  />
            <StatCard icon={CheckCircle2} label="Saya Ikut"     value={myResults.length}     color={T.green}  bg={T.greenLight}  delay={100} />
            <StatCard icon={TrendingUp}   label="Nilai Rata-rata" value={myAvg > 0 ? myAvg.toFixed(0) : '—'} color={myAvg >= 75 ? T.green : T.amber} bg={myAvg >= 75 ? T.greenLight : T.amberLight} delay={150} />
          </>}
        </div>

        {/* ── Tabs ── */}
        <div className="du-fadein" style={{ background: T.surface, borderRadius: T.rXl, border: `1px solid ${T.borderLight}`, overflow: 'hidden', boxShadow: T.shadowSm }}>
          {/* Tab bar */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderLight}`, display: 'flex', gap: '4px', background: T.surfaceAlt }}>
            <Tab label="Teman Sekelas" active={tab === 'teman'} onClick={() => setTab('teman')} count={classmates.length} />
            <Tab label="Jadwal Ujian"  active={tab === 'ujian'} onClick={() => setTab('ujian')} count={sessions.length} />
            <Tab label="Nilai Saya"    active={tab === 'nilai'} onClick={() => setTab('nilai')} count={myResults.length} />
          </div>

          <div style={{ padding: '16px 20px' }}>

            {/* Tab: Teman Sekelas */}
            {tab === 'teman' && (
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
                )) : !filteredMates.length ? (
                  <EmptyState icon="👥" text={search ? 'Tidak ditemukan' : 'Belum ada teman sekelas'} sub={search ? 'Coba kata kunci lain' : 'Kamu satu-satunya siswa aktif di kelas ini'} />
                ) : filteredMates.map((m, i) => (
                  <RowItem key={m.id} last={i === filteredMates.length - 1}
                    left={<div style={{ width: '34px', height: '34px', borderRadius: '50%', background: T.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.fontDisplay, fontWeight: '700', fontSize: '13px', color: T.brand, flexShrink: 0 }}>{m.name.charAt(0).toUpperCase()}</div>}
                    title={m.name}
                    sub={m.nis ? `NIS: ${m.nis}` : m.email}
                  />
                ))}
              </>
            )}

            {/* Tab: Jadwal Ujian */}
            {tab === 'ujian' && (
              loading ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: `1px solid ${T.borderLight}` }}><Shimmer h={13} /><div style={{ marginTop: '5px' }}><Shimmer w="55%" h={11} /></div></div>
              )) : !sessions.length ? <EmptyState icon="📋" text="Belum ada ujian dijadwalkan" /> : (
                <>
                  {/* Upcoming highlight */}
                  {upcoming.length > 0 && (
                    <div style={{ padding: '12px 14px', background: T.amberLight, border: `1px solid #FDE68A`, borderRadius: T.rMd, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={15} style={{ color: T.amber, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: T.amber, fontWeight: '600', fontFamily: T.fontBody }}>
                        {upcoming.length} ujian akan datang — ujian terdekat: {fmtDate(upcoming[upcoming.length - 1].start_time)}
                      </span>
                    </div>
                  )}
                  {sessions.map((s, i) => {
                    const start = new Date(s.start_time);
                    const end   = new Date(s.end_time);
                    const isLive = start <= now && end >= now;
                    const isPast = end < now;
                    const myRes  = myResults.find(r => r.exam_session_id === s.id);
                    const status = isLive ? { label: 'LIVE', color: T.green, bg: T.greenLight }
                      : isPast ? { label: 'Selesai', color: T.textMuted, bg: T.surfaceAlt }
                      : { label: 'Upcoming', color: T.amber, bg: T.amberLight };
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i === sessions.length - 1 ? 'none' : `1px solid ${T.borderLight}` }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: status.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isLive ? <LiveDot color={T.green} /> : <Calendar size={14} style={{ color: status.color }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: T.text, fontFamily: T.fontBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                          <div style={{ fontSize: '11px', color: T.textMuted }}>{fmtDate(s.start_time)} · {fmtTime(s.start_time)} — {fmtTime(s.end_time)} · {s.duration_minutes}m</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                          <Badge label={status.label} color={status.color} bg={status.bg} />
                          {myRes && <span style={{ fontSize: '11px', fontWeight: '700', color: myRes.passed ? T.green : T.red }}>{myRes.score?.toFixed(0)}</span>}
                          {!myRes && isPast && <span style={{ fontSize: '10px', color: T.textMuted }}>Tidak ikut</span>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            )}

            {/* Tab: Nilai Saya */}
            {tab === 'nilai' && (
              loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} h={56} r={10} />)}</div>
              : !myResults.length ? <EmptyState icon="📊" text="Belum ada nilai ujian" sub="Nilai akan muncul setelah kamu mengikuti ujian" />
              : (
                <>
                  {/* Summary banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { label: 'Rata-rata', value: myAvg > 0 ? myAvg.toFixed(1) : '—', color: myAvg >= 75 ? T.green : T.amber, bg: myAvg >= 75 ? T.greenLight : T.amberLight },
                      { label: 'Lulus', value: lulusCount, color: T.green, bg: T.greenLight },
                      { label: 'Remedial', value: myResults.filter(r => r.passed === false).length, color: T.red, bg: T.redLight },
                    ].map(s => (
                      <div key={s.label} style={{ padding: '12px', borderRadius: T.rMd, background: s.bg, textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: s.color, fontFamily: T.fontDisplay }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: s.color + 'aa', fontFamily: T.fontBody }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Per-exam scores */}
                  {myResults.map((r, i) => {
                    const sess = sessions.find(s => s.id === r.exam_session_id);
                    if (!sess) return null;
                    const score = r.score ?? 0;
                    const passed = r.passed;
                    return (
                      <div key={r.exam_session_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: i === myResults.length - 1 ? 'none' : `1px solid ${T.borderLight}` }}>
                        <ScoreRing score={score} size={44} passing={sess.passing_score || 75} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: T.text, fontFamily: T.fontBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sess.title}</div>
                          <div style={{ fontSize: '11px', color: T.textMuted }}>{fmtDate(r.submitted_at)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: passed ? T.green : T.red, fontFamily: T.fontDisplay }}>{score.toFixed(0)}</div>
                          <div style={{ fontSize: '10px', fontWeight: '700', color: passed ? T.green : T.red }}>{passed ? 'LULUS' : 'REMEDIAL'}</div>
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
    </>
  );
};

export default MyClassPage;
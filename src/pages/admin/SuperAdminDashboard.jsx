import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  School,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ChevronRight,
  Activity,
  Crown,
  Zap,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString('id-ID');

const TIER_META = {
  starter: {
    label: 'Starter',
    bg: '#F0FDF4',
    color: '#16A34A',
    border: '#BBF7D0',
  },
  professional: {
    label: 'Professional',
    bg: '#EFF6FF',
    color: '#2563EB',
    border: '#BFDBFE',
  },
  enterprise: {
    label: 'Enterprise',
    bg: '#FDF4FF',
    color: '#9333EA',
    border: '#E9D5FF',
  },
};

const STATUS_META = {
  active: {
    label: 'Aktif',
    bg: '#F0FDF4',
    color: '#16A34A',
    icon: CheckCircle2,
  },
  trial: { label: 'Trial', bg: '#FFFBEB', color: '#D97706', icon: Clock },
  suspended: {
    label: 'Suspend',
    bg: '#FEF2F2',
    color: '#DC2626',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    bg: '#F8FAFC',
    color: '#94A3B8',
    icon: AlertCircle,
  },
};

// ── Sub-components ────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, bg, delay = 0 }) => (
  <div
    className="zidu-fadeup"
    style={{
      background: '#fff',
      borderRadius: '16px',
      border: '1px solid #F1F5F9',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
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
      <div
        style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#0F172A',
          lineHeight: 1,
          fontFamily: 'Sora, sans-serif',
        }}
      >
        {fmt(value)}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

const Badge = ({ type, meta }) => {
  const m = meta[type] || {
    label: type,
    bg: '#F1F5F9',
    color: '#64748B',
    border: '#E2E8F0',
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: '600',
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.border || m.bg}`,
        whiteSpace: 'nowrap',
      }}
    >
      {m.icon && <m.icon size={11} />}
      {m.label}
    </span>
  );
};

const SkeletonRow = () => (
  <div
    style={{
      display: 'flex',
      gap: '12px',
      padding: '16px 20px',
      alignItems: 'center',
    }}
  >
    {[180, 80, 100, 80, 60].map((w, i) => (
      <div
        key={i}
        style={{
          height: '14px',
          borderRadius: '6px',
          background: '#F1F5F9',
          width: `${w}px`,
          flexShrink: 0,
        }}
        className="zidu-shimmer"
      />
    ))}
  </div>
);

// ── Main Component ────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch semua sekolah
      const { data: schoolData, error: schoolErr } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolErr) throw schoolErr;

      // Fetch jumlah user per sekolah (students)
      const { data: profileData, error: profErr } = await supabase
        .from('profiles')
        .select('school_id, role');

      if (profErr) throw profErr;

      // Hitung stats per sekolah
      const countMap = {};
      profileData?.forEach((p) => {
        if (!p.school_id) return;
        if (!countMap[p.school_id])
          countMap[p.school_id] = { student: 0, teacher: 0, school_admin: 0 };
        countMap[p.school_id][p.role] =
          (countMap[p.school_id][p.role] || 0) + 1;
      });

      const enriched = (schoolData || []).map((s) => ({
        ...s,
        _counts: countMap[s.id] || { student: 0, teacher: 0, school_admin: 0 },
      }));

      const totalStudents =
        profileData?.filter((p) => p.role === 'student').length || 0;

      setSchools(enriched);
      setStats({
        total: enriched.length,
        active: enriched.filter((s) => s.subscription_status === 'active')
          .length,
        trial: enriched.filter((s) => s.subscription_status === 'trial').length,
        suspended: enriched.filter((s) =>
          ['suspended', 'expired'].includes(s.subscription_status)
        ).length,
        totalStudents,
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
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filtered = schools.filter((s) => {
    const matchFilter =
      filter === 'all' ||
      s.subscription_status === filter ||
      (filter === 'problem' &&
        ['suspended', 'expired'].includes(s.subscription_status));
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const daysDiff = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil(
      (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;} 100%{background-position:400px 0;} }
        .zidu-fadeup { opacity:0; animation: fadeUp 0.45s ease forwards; }
        .zidu-shimmer { background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%); background-size: 800px 100%; animation: shimmer 1.2s infinite; }
        .zidu-row:hover { background: #FAFBFF !important; }
        .zidu-filter-btn { cursor:pointer; border:none; transition: all 0.15s; }
        .zidu-filter-btn:hover { transform: translateY(-1px); }
        .zidu-search:focus { outline:none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79,70,229,0.12); }
      `}</style>

      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
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
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#EEF2FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown size={16} style={{ color: '#4F46E5' }} />
              </div>
              <h1
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                Super Admin
              </h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
              Pantau seluruh ekosistem sekolah di platform ZiDu
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

        {/* ── Stat Cards ── */}
        {error ? (
          <div
            style={{
              padding: '20px',
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
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            <StatCard
              icon={School}
              label="Total Sekolah"
              value={loading ? '—' : stats.total}
              sub="Terdaftar di platform"
              color="#4F46E5"
              bg="#EEF2FF"
              delay={0}
            />
            <StatCard
              icon={CheckCircle2}
              label="Aktif"
              value={loading ? '—' : stats.active}
              sub="Langganan berjalan"
              color="#16A34A"
              bg="#F0FDF4"
              delay={80}
            />
            <StatCard
              icon={Clock}
              label="Trial"
              value={loading ? '—' : stats.trial}
              sub="Masa percobaan"
              color="#D97706"
              bg="#FFFBEB"
              delay={160}
            />
            <StatCard
              icon={AlertCircle}
              label="Bermasalah"
              value={loading ? '—' : stats.suspended}
              sub="Suspended / expired"
              color="#DC2626"
              bg="#FEF2F2"
              delay={240}
            />
            <StatCard
              icon={Users}
              label="Total Siswa"
              value={loading ? '—' : stats.totalStudents}
              sub="Di semua sekolah"
              color="#0891B2"
              bg="#EFF6FF"
              delay={320}
            />
          </div>
        )}

        {/* ── Schools Table ── */}
        <div
          className="zidu-fadeup"
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #F1F5F9',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            animationDelay: '200ms',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              padding: '20px 24px 0',
              borderBottom: '1px solid #F8FAFC',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Activity size={16} style={{ color: '#4F46E5' }} />
                <h2
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#0F172A',
                    margin: 0,
                  }}
                >
                  Daftar Sekolah
                </h2>
                <span
                  style={{
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    borderRadius: '999px',
                    padding: '2px 9px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {filtered.length}
                </span>
              </div>

              {/* Search */}
              <input
                className="zidu-search"
                type="text"
                placeholder="Cari nama / email sekolah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  fontSize: '13px',
                  color: '#0F172A',
                  width: '220px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                overflowX: 'auto',
                paddingBottom: '1px',
              }}
            >
              {[
                { key: 'all', label: 'Semua', count: schools.length },
                { key: 'active', label: '✓ Aktif', count: stats.active },
                { key: 'trial', label: '◷ Trial', count: stats.trial },
                { key: 'problem', label: '⚠ Masalah', count: stats.suspended },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="zidu-filter-btn"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px 8px 0 0',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: filter === f.key ? '#fff' : 'transparent',
                    color: filter === f.key ? '#4F46E5' : '#64748B',
                    borderBottom:
                      filter === f.key
                        ? '2px solid #4F46E5'
                        : '2px solid transparent',
                  }}
                >
                  {f.label}{' '}
                  <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                    ({f.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '700px',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#FAFBFF',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  {[
                    'Nama Sekolah',
                    'Paket',
                    'Status',
                    'Guru',
                    'Siswa',
                    'Kadaluarsa',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 20px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#94A3B8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <SkeletonRow />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '48px',
                        textAlign: 'center',
                        color: '#94A3B8',
                        fontSize: '14px',
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                        🏫
                      </div>
                      Tidak ada sekolah ditemukan
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => {
                    const days = daysDiff(s.subscription_end_date);
                    const isExpiringSoon =
                      days !== null && days > 0 && days <= 14;
                    return (
                      <tr
                        key={s.id}
                        className="zidu-row"
                        style={{
                          borderBottom: '1px solid #F8FAFC',
                          transition: 'background 0.15s',
                          cursor: 'default',
                        }}
                      >
                        <td style={{ padding: '14px 20px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: '#EEF2FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'Sora, sans-serif',
                                fontWeight: '700',
                                fontSize: '14px',
                                color: '#4F46E5',
                                flexShrink: 0,
                              }}
                            >
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#0F172A',
                                }}
                              >
                                {s.name}
                              </div>
                              {s.email && (
                                <div
                                  style={{ fontSize: '12px', color: '#94A3B8' }}
                                >
                                  {s.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <Badge type={s.subscription_tier} meta={TIER_META} />
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <Badge
                            type={s.subscription_status}
                            meta={STATUS_META}
                          />
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#0F172A',
                            }}
                          >
                            {fmt(s._counts.teacher)}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#94A3B8',
                              marginLeft: '3px',
                            }}
                          >
                            / {s.max_teachers}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#0F172A',
                              }}
                            >
                              {fmt(s._counts.student)}
                            </span>
                            <span
                              style={{ fontSize: '12px', color: '#94A3B8' }}
                            >
                              / {s.max_students}
                            </span>
                            {/* Mini progress bar */}
                            <div
                              style={{
                                width: '48px',
                                height: '4px',
                                borderRadius: '99px',
                                background: '#F1F5F9',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  borderRadius: '99px',
                                  background:
                                    s._counts.student / s.max_students > 0.8
                                      ? '#EF4444'
                                      : '#4F46E5',
                                  width: `${Math.min(
                                    100,
                                    (s._counts.student / s.max_students) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {s.subscription_end_date ? (
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: '500',
                                color: isExpiringSoon
                                  ? '#D97706'
                                  : days < 0
                                  ? '#DC2626'
                                  : '#64748B',
                              }}
                            >
                              {days < 0
                                ? `${Math.abs(days)}h lalu`
                                : isExpiringSoon
                                ? `⚠ ${days} hari lagi`
                                : `${days} hari`}
                            </span>
                          ) : (
                            <span
                              style={{ color: '#CBD5E1', fontSize: '13px' }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div
              style={{
                padding: '12px 24px',
                borderTop: '1px solid #F8FAFC',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                Menampilkan {filtered.length} dari {schools.length} sekolah
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#94A3B8',
                }}
              >
                <Zap size={11} style={{ color: '#4F46E5' }} /> Data Real-time
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SuperAdminDashboard;

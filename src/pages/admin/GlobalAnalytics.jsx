import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import {
  TrendingUp, DollarSign, School, Activity,
  RefreshCw, AlertCircle, Zap, BarChart2, PieChart as PieIcon,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────
const TIER_COLORS  = { starter: '#16A34A', professional: '#2563EB', enterprise: '#9333EA' };
const TIER_LABELS  = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };
const STATUS_COLORS = { active: '#16A34A', trial: '#D97706', suspended: '#DC2626', expired: '#94A3B8' };
const STATUS_LABELS = { active: 'Aktif', trial: 'Trial', suspended: 'Suspended', expired: 'Expired' };

// Revenue estimate per tier per bulan (IDR)
const TIER_PRICE = { starter: 299000, professional: 699000, enterprise: 1499000 };

const fmt     = (n) => (n ?? 0).toLocaleString('id-ID');
const fmtIDR  = (n) => 'Rp ' + (n ?? 0).toLocaleString('id-ID');
const fmtMonth = (str) => {
  const [y, m] = str.split('-');
  const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`;
};

// Hasilkan 6 bulan terakhir
const last6Months = () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
};

// ── Custom Tooltip ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F172A', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
      {label && <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', fontWeight: '600' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#fff', marginBottom: i < payload.length - 1 ? '3px' : 0 }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#94A3B8', fontSize: '12px' }}>{p.name}:</span>
          <span style={{ fontWeight: '600' }}>{formatter ? formatter(p.value, p.name) : fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color, bg, delay = 0, trend }) => (
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
    {trend !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: trend >= 0 ? '#16A34A' : '#DC2626' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>vs bulan lalu</span>
      </div>
    )}
  </div>
);

// ── Chart Card ────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, icon: Icon, children, delay = 0 }) => (
  <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', overflow: 'hidden', opacity: 0, animation: `fadeUp 0.4s ease ${delay}ms forwards` }}>
    <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={14} style={{ color: '#4F46E5' }} />
      </div>
      <div>
        <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: '700', color: '#0F172A', margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{subtitle}</p>}
      </div>
    </div>
    <div style={{ padding: '20px 22px' }}>{children}</div>
  </div>
);

// ── Custom Pie Label ──────────────────────────────────────────────
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '12px', fontWeight: '700', fontFamily: "'DM Sans', sans-serif" }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────
const Skeleton = ({ w = '100%', h = 14, r = 6 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize: '800px 100%', animation: 'shimmer 1.2s infinite' }} />
);

// ── Legend Item ───────────────────────────────────────────────────
const LegendItem = ({ color, label, value, pct }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F8FAFC' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{value}</span>
      {pct !== undefined && <span style={{ fontSize: '11px', color: '#94A3B8', minWidth: '32px', textAlign: 'right' }}>{pct}%</span>}
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────
const GlobalAnalytics = () => {
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);
  const [data, setData]           = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [schoolsRes, examsRes] = await Promise.all([
        supabase.from('schools').select('id, subscription_tier, subscription_status, created_at, max_students, max_teachers'),
        supabase.from('exam_sessions').select('id, created_at, school_id').order('created_at'),
      ]);

      if (schoolsRes.error) throw schoolsRes.error;

      const schools = schoolsRes.data || [];
      const exams   = examsRes.data  || [];
      const months  = last6Months();

      // ── 1. Distribusi paket (donut) ────────────────────────────
      const tierCount = {};
      schools.forEach(s => { tierCount[s.subscription_tier] = (tierCount[s.subscription_tier] || 0) + 1; });
      const tierData = Object.entries(tierCount).map(([tier, count]) => ({
        name: TIER_LABELS[tier] || tier,
        value: count,
        color: TIER_COLORS[tier] || '#94A3B8',
        tier,
      }));

      // ── 2. Status sekolah (donut) ──────────────────────────────
      const statusCount = {};
      schools.forEach(s => { statusCount[s.subscription_status] = (statusCount[s.subscription_status] || 0) + 1; });
      const statusData = Object.entries(statusCount).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || '#94A3B8',
        status,
      }));

      // ── 3. Revenue estimate per bulan ─────────────────────────
      const revenueByMonth = months.map(mo => {
        const activeInMonth = schools.filter(s => {
          const created = s.created_at?.substring(0, 7);
          return created <= mo && s.subscription_status === 'active';
        });
        const revenue = activeInMonth.reduce((sum, s) => sum + (TIER_PRICE[s.subscription_tier] || 0), 0);
        return { month: fmtMonth(mo), revenue, schools: activeInMonth.length };
      });

      // ── 4. Ujian per bulan (bar) ───────────────────────────────
      const examsByMonth = months.map(mo => {
        const count = exams.filter(e => e.created_at?.substring(0, 7) === mo).length;
        return { month: fmtMonth(mo), ujian: count };
      });

      // ── 5. Summary stats ──────────────────────────────────────
      const totalRevenue = schools
        .filter(s => s.subscription_status === 'active')
        .reduce((sum, s) => sum + (TIER_PRICE[s.subscription_tier] || 0), 0);

      const thisMonth = new Date().toISOString().substring(0, 7);
      const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().substring(0, 7); })();
      const newThisMonth = schools.filter(s => s.created_at?.startsWith(thisMonth)).length;
      const newLastMonth = schools.filter(s => s.created_at?.startsWith(lastMonth)).length;
      const schoolTrend  = newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : 0;

      const examsThisMonth = exams.filter(e => e.created_at?.startsWith(thisMonth)).length;
      const examsLastMonth = exams.filter(e => e.created_at?.startsWith(lastMonth)).length;
      const examTrend = examsLastMonth > 0 ? Math.round(((examsThisMonth - examsLastMonth) / examsLastMonth) * 100) : 0;

      setData({
        tierData, statusData, revenueByMonth, examsByMonth,
        summary: {
          totalSchools:  schools.length,
          activeSchools: schools.filter(s => s.subscription_status === 'active').length,
          totalRevenue,
          totalExams:    exams.length,
          newThisMonth,
          schoolTrend,
          examTrend,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);} to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer { 0%{background-position:-400px 0;} 100%{background-position:400px 0;} }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', opacity: 0, animation: 'fadeUp 0.4s ease forwards' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={16} style={{ color: '#4F46E5' }} />
              </div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: '22px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Analitik Global</h1>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Overview performa platform ZiDu secara keseluruhan</p>
          </div>
          <button
            onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 16px', borderRadius: '9px', border: '1.5px solid #E2E8F0', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={15} /> Gagal memuat data: {error}
          </div>
        )}

        {/* ── Stat Cards ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #F1F5F9', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Skeleton w="90px" /><Skeleton w="36px" h={36} r={10} /></div>
                <Skeleton w="70px" h={28} r={8} />
                <Skeleton w="110px" h={11} />
              </div>
            ))}
          </div>
        ) : data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <StatCard icon={School}     label="Total Sekolah"     value={fmt(data.summary.totalSchools)}  sub={`${data.summary.activeSchools} aktif`}             color="#4F46E5" bg="#EEF2FF" delay={0}   trend={data.summary.schoolTrend} />
            <StatCard icon={DollarSign} label="Est. Revenue/Bln"  value={fmtIDR(data.summary.totalRevenue)} sub="Dari sekolah aktif saat ini"                     color="#16A34A" bg="#F0FDF4" delay={60}  />
            <StatCard icon={Activity}   label="Total Sesi Ujian"  value={fmt(data.summary.totalExams)}    sub="Sepanjang waktu"                                   color="#0891B2" bg="#EFF6FF" delay={120} trend={data.summary.examTrend} />
            <StatCard icon={TrendingUp} label="Sekolah Baru (Bln)"value={fmt(data.summary.newThisMonth)}  sub="Bulan ini"                                         color="#D97706" bg="#FFFBEB" delay={180} />
          </div>
        )}

        {/* ── Charts Row 1: Donut × 2 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {/* Distribusi Paket */}
          <ChartCard title="Distribusi Paket" subtitle="Jumlah sekolah per tier langganan" icon={PieIcon} delay={200}>
            {loading ? <Skeleton h={200} r={12} /> : data && (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <ResponsiveContainer width={180} height={180} style={{ flexShrink: 0 }}>
                  <PieChart>
                    <Pie data={data.tierData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" labelLine={false} label={renderPieLabel}>
                      {data.tierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  {data.tierData.map((d, i) => {
                    const total = data.tierData.reduce((s, x) => s + x.value, 0);
                    return <LegendItem key={i} color={d.color} label={d.name} value={d.value} pct={total ? Math.round((d.value / total) * 100) : 0} />;
                  })}
                  <div style={{ marginTop: '10px', padding: '8px 0', borderTop: '2px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>Total</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>{data.tierData.reduce((s, x) => s + x.value, 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ChartCard>

          {/* Status Sekolah */}
          <ChartCard title="Status Sekolah" subtitle="Aktif, trial, suspended, expired" icon={PieIcon} delay={260}>
            {loading ? <Skeleton h={200} r={12} /> : data && (
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <ResponsiveContainer width={180} height={180} style={{ flexShrink: 0 }}>
                  <PieChart>
                    <Pie data={data.statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value" labelLine={false} label={renderPieLabel}>
                      {data.statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  {data.statusData.map((d, i) => {
                    const total = data.statusData.reduce((s, x) => s + x.value, 0);
                    return <LegendItem key={i} color={d.color} label={d.name} value={d.value} pct={total ? Math.round((d.value / total) * 100) : 0} />;
                  })}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* ── Charts Row 2: Bar ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {/* Revenue per bulan */}
          <ChartCard title="Estimasi Revenue" subtitle="6 bulan terakhir (sekolah aktif × harga tier)" icon={DollarSign} delay={320}>
            {loading ? <Skeleton h={220} r={12} /> : data && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.revenueByMonth} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : v} width={48} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmtIDR(v)} />} cursor={{ fill: '#F8FAFC', radius: 6 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {/* Revenue breakdown per tier */}
            {!loading && data && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F8FAFC' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Breakdown per Tier (saat ini)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {data.tierData.map((t, i) => {
                    const rev = (t.value || 0) * (TIER_PRICE[t.tier] || 0);
                    return rev > 0 ? (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: t.color }} />
                          <span style={{ fontSize: '12px', color: '#374151' }}>{t.name} × {t.value}</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>{fmtIDR(rev)}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </ChartCard>

          {/* Ujian per bulan */}
          <ChartCard title="Sesi Ujian per Bulan" subtitle="Jumlah ujian yang dibuat (6 bulan terakhir)" icon={BarChart2} delay={380}>
            {loading ? <Skeleton h={220} r={12} /> : data && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.examsByMonth} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: "'DM Sans', sans-serif" }} axisLine={false} tickLine={false} allowDecimals={false} width={32} />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v} ujian`} />} cursor={{ fill: '#F8FAFC', radius: 6 }} />
                  <Bar dataKey="ujian" name="Sesi Ujian" fill="#0891B2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {!loading && data && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>{fmt(data.summary.totalExams)}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Total ujian</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>{fmt(data.examsByMonth[data.examsByMonth.length - 1]?.ujian || 0)}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>Bulan ini</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: data.summary.examTrend >= 0 ? '#16A34A' : '#DC2626', fontFamily: 'Sora, sans-serif' }}>
                    {data.summary.examTrend >= 0 ? '+' : ''}{data.summary.examTrend}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>vs bln lalu</div>
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0, animation: 'fadeUp 0.4s ease 440ms forwards' }}>
          <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Zap size={10} style={{ color: '#4F46E5' }} /> Data real-time dari Supabase
          </span>
        </div>
      </div>
    </>
  );
};

export default GlobalAnalytics;
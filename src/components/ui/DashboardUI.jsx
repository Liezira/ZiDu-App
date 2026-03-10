/**
 * DashboardUI.jsx — Shared Dashboard Component Library
 * Design System: "Precision Minimal" — Sora + DM Sans, Indigo accent, surgical whitespace
 * Menggantikan komponen duplikat di StudentDashboard, TeacherDashboard, dll.
 */

import React from 'react';

// ── Design Tokens ──────────────────────────────────────────────────
export const T = {
  // Typography
  fontDisplay: "'Sora', sans-serif",
  fontBody:    "'DM Sans', sans-serif",

  // Colors — Light mode
  bg:          '#F7F8FA',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F8FAFC',
  border:      '#EAECF0',
  borderLight: '#F2F4F7',

  text:        '#0D1117',
  textSub:     '#4B5563',
  textMuted:   '#9CA3AF',

  brand:       '#4F46E5',
  brandLight:  '#EEF2FF',
  brandMid:    'rgba(79,70,229,0.12)',

  // Semantic
  green:       '#16A34A',
  greenLight:  '#F0FDF4',
  amber:       '#D97706',
  amberLight:  '#FFFBEB',
  red:         '#DC2626',
  redLight:    '#FEF2F2',
  blue:        '#0891B2',
  blueLight:   '#EFF6FF',
  purple:      '#7C3AED',
  purpleLight: '#F5F3FF',

  // Radii
  rSm:  '8px',
  rMd:  '12px',
  rLg:  '16px',
  rXl:  '20px',

  // Shadows
  shadowSm: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.06)',
};

// ── Global CSS injector ────────────────────────────────────────────
export const DashboardStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

    @keyframes du-fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes du-shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position: 600px 0; }
    }
    @keyframes du-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.35; }
    }
    @keyframes du-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes du-scalein {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }

    .du-fadein     { animation: du-fadeUp 0.35s ease both; }
    .du-card-hover { transition: box-shadow 0.2s, transform 0.2s; }
    .du-card-hover:hover {
      box-shadow: 0 6px 24px rgba(79,70,229,0.10) !important;
      transform: translateY(-1px);
    }
    .du-row-hover  { transition: background 0.12s; }
    .du-row-hover:hover { background: #FAFBFF !important; }
    .du-btn-ghost  {
      background: none; border: 1.5px solid ${T.border};
      border-radius: ${T.rSm}; cursor: pointer;
      font-family: ${T.fontBody}; font-size: 13px; font-weight: 600;
      color: ${T.textSub}; padding: 8px 14px;
      display: inline-flex; align-items: center; gap: 6px;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
    }
    .du-btn-ghost:hover  { border-color: ${T.brand}; color: ${T.brand}; background: ${T.brandLight}; }
    .du-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
    .du-btn-primary {
      background: ${T.brand}; border: none; border-radius: ${T.rSm};
      cursor: pointer; font-family: ${T.fontBody}; font-size: 13px;
      font-weight: 600; color: #fff; padding: 8px 16px;
      display: inline-flex; align-items: center; gap: 6px;
      transition: opacity 0.15s, transform 0.15s;
    }
    .du-btn-primary:hover:not(:disabled)  { opacity: 0.88; transform: translateY(-1px); }
    .du-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
  `}</style>
);

// ── Shimmer ────────────────────────────────────────────────────────
export const Shimmer = ({ h = 14, w = '100%', r = 6, style: s }) => (
  <div style={{
    height: h, width: w, borderRadius: r, flexShrink: 0,
    background: `linear-gradient(90deg, ${T.borderLight} 25%, ${T.border} 50%, ${T.borderLight} 75%)`,
    backgroundSize: '600px 100%',
    animation: 'du-shimmer 1.4s ease infinite',
    ...s,
  }} />
);

// ── Badge ──────────────────────────────────────────────────────────
export const Badge = ({ label, color = T.brand, bg = T.brandLight, border }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 9px', borderRadius: '999px',
    fontSize: '11px', fontWeight: '700',
    color, background: bg,
    border: border ? `1px solid ${border}` : undefined,
    whiteSpace: 'nowrap',
    fontFamily: T.fontBody,
  }}>
    {label}
  </span>
);

// ── StatCard ───────────────────────────────────────────────────────
export const StatCard = ({ icon: Icon, label, value, sub, color, bg, delay = 0, trend }) => (
  <div
    className="du-fadein"
    style={{
      background: T.surface,
      borderRadius: T.rLg,
      border: `1px solid ${T.borderLight}`,
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '14px',
      boxShadow: T.shadowSm,
      animationDelay: `${delay}ms`,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{
        fontSize: '11px', fontWeight: '600', color: T.textMuted,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        fontFamily: T.fontBody,
      }}>
        {label}
      </span>
      <div style={{
        width: '34px', height: '34px', borderRadius: T.rSm,
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} style={{ color }} />
      </div>
    </div>
    <div>
      <div style={{
        fontSize: '26px', fontWeight: '700', color: T.text, lineHeight: 1,
        fontFamily: T.fontDisplay,
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '12px', color: T.textMuted, marginTop: '5px', fontFamily: T.fontBody }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

// ── StatCard Skeleton ──────────────────────────────────────────────
export const StatCardSkeleton = () => (
  <div style={{
    background: T.surface, borderRadius: T.rLg,
    border: `1px solid ${T.borderLight}`, padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    boxShadow: T.shadowSm,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Shimmer w="72px" h={11} />
      <Shimmer w="34px" h={34} r={8} />
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <Shimmer w="56px" h={26} r={6} />
      <Shimmer w="100px" h={11} />
    </div>
  </div>
);

// ── SectionCard ────────────────────────────────────────────────────
export const SectionCard = ({
  title, icon: Icon,
  iconColor = T.brand, iconBg = T.brandLight,
  right, children, delay = 0,
  noPadding = false,
}) => (
  <div
    className="du-fadein"
    style={{
      background: T.surface,
      borderRadius: T.rLg,
      border: `1px solid ${T.borderLight}`,
      overflow: 'hidden',
      boxShadow: T.shadowSm,
      animationDelay: `${delay}ms`,
    }}
  >
    {/* Header */}
    <div style={{
      padding: '14px 18px',
      borderBottom: `1px solid ${T.borderLight}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{
          width: '26px', height: '26px', borderRadius: '7px',
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={13} style={{ color: iconColor }} />
        </div>
        <h3 style={{
          fontFamily: T.fontDisplay, fontSize: '13px', fontWeight: '700',
          color: T.text, margin: 0, letterSpacing: '-0.01em',
        }}>
          {title}
        </h3>
      </div>
      {right && (
        <div style={{ fontFamily: T.fontBody, fontSize: '12px', color: T.textMuted }}>
          {right}
        </div>
      )}
    </div>
    {/* Body */}
    <div style={noPadding ? {} : { padding: '4px 18px 10px' }}>
      {children}
    </div>
  </div>
);

// ── EmptyState ─────────────────────────────────────────────────────
export const EmptyState = ({ icon = '📭', text = 'Tidak ada data', sub }) => (
  <div style={{
    padding: '36px 0', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
  }}>
    <div style={{
      width: '44px', height: '44px', borderRadius: '12px',
      background: T.surfaceAlt, border: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '20px', marginBottom: '2px',
    }}>
      {icon}
    </div>
    <div style={{ fontSize: '13px', fontWeight: '600', color: T.textSub, fontFamily: T.fontBody }}>
      {text}
    </div>
    {sub && (
      <div style={{ fontSize: '12px', color: T.textMuted, fontFamily: T.fontBody }}>
        {sub}
      </div>
    )}
  </div>
);

// ── RowItem — generic list row ─────────────────────────────────────
export const RowItem = ({ left, title, sub, right, last = false, onClick }) => (
  <div
    className={onClick ? 'du-row-hover' : ''}
    onClick={onClick}
    style={{
      padding: '11px 0',
      borderBottom: last ? 'none' : `1px solid ${T.borderLight}`,
      display: 'flex', alignItems: 'center', gap: '11px',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    {left}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: '13px', fontWeight: '600', color: T.text,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontFamily: T.fontBody,
      }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: T.textMuted, marginTop: '2px', fontFamily: T.fontBody }}>
          {sub}
        </div>
      )}
    </div>
    {right && <div style={{ flexShrink: 0 }}>{right}</div>}
  </div>
);

// ── IconBox — colored icon container ──────────────────────────────
export const IconBox = ({ size = 34, r = 10, bg, color, icon: Icon, iconSize = 15 }) => (
  <div style={{
    width: size, height: size, borderRadius: r,
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  }}>
    <Icon size={iconSize} style={{ color }} />
  </div>
);

// ── LiveDot ────────────────────────────────────────────────────────
export const LiveDot = ({ color = T.green }) => (
  <span style={{
    width: '8px', height: '8px', borderRadius: '50%',
    background: color, display: 'inline-block',
    animation: 'du-pulse 1.4s ease infinite',
    flexShrink: 0,
  }} />
);

// ── ProgressBar ────────────────────────────────────────────────────
export const ProgressBar = ({ value, max, color = T.brand, label, display }) => {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));
  const dangerColor = pct > 85 ? T.red : color;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(label || display) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <span style={{ fontSize: '12px', color: T.textMuted, fontFamily: T.fontBody }}>{label}</span>}
          {display && <span style={{ fontSize: '13px', fontWeight: '700', color: T.text, fontFamily: T.fontDisplay }}>{display}</span>}
        </div>
      )}
      <div style={{ height: '5px', borderRadius: '99px', background: T.borderLight, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '99px',
          background: dangerColor, width: `${pct}%`,
          transition: 'width 0.7s ease',
        }} />
      </div>
    </div>
  );
};

// ── ScoreRing ──────────────────────────────────────────────────────
export const ScoreRing = ({ score, passed, size = 42 }) => {
  const r     = (size - 6) / 2;
  const circ  = 2 * Math.PI * r;
  const pct   = Math.min(100, Math.max(0, score ?? 0)) / 100;
  const color = passed ? T.green : score >= 50 ? T.amber : T.red;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.borderLight} strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: '700', color,
        fontFamily: T.fontDisplay,
      }}>
        {score !== null ? Math.round(score) : '—'}
      </div>
    </div>
  );
};

// ── PageHeader ─────────────────────────────────────────────────────
export const PageHeader = ({ greeting, name, subtitle, actions }) => (
  <div
    className="du-fadein"
    style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
    }}
  >
    <div>
      <h1 style={{
        fontFamily: T.fontDisplay,
        fontSize: '20px', fontWeight: '700', color: T.text,
        margin: '0 0 4px', letterSpacing: '-0.02em', lineHeight: 1.3,
      }}>
        {greeting && <>{greeting}, </>}
        {name && <span style={{ color: T.brand }}>{name}</span>}
        {!greeting && !name && subtitle}
      </h1>
      {(greeting || name) && subtitle && (
        <p style={{ fontSize: '13px', color: T.textSub, margin: 0, fontFamily: T.fontBody }}>
          {subtitle}
        </p>
      )}
    </div>
    {actions && (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {actions}
      </div>
    )}
  </div>
);

// ── ErrorBanner ────────────────────────────────────────────────────
export const ErrorBanner = ({ message }) => (
  <div style={{
    padding: '12px 16px',
    background: T.redLight, border: `1px solid #FECACA`,
    borderRadius: T.rMd, color: T.red,
    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: T.fontBody,
  }}>
    ⚠ {message}
  </div>
);

// ── StatusBadge (exam result) ──────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const map = {
    graded:      { label: 'Dinilai',    color: T.green,  bg: T.greenLight  },
    submitted:   { label: 'Dikumpul',   color: '#2563EB', bg: '#EFF6FF'    },
    in_progress: { label: 'Berlangsung',color: T.amber,  bg: T.amberLight  },
    grading:     { label: 'Menunggu',   color: T.purple, bg: T.purpleLight },
  };
  const m = map[status] || { label: status, color: T.textMuted, bg: T.surfaceAlt };
  return <Badge label={m.label} color={m.color} bg={m.bg} />;
};

// ── Spinner ────────────────────────────────────────────────────────
export const Spinner = ({ size = 14, color = '#fff' }) => (
  <div style={{
    width: size, height: size,
    border: `2px solid rgba(255,255,255,0.25)`,
    borderTopColor: color,
    borderRadius: '50%',
    animation: 'du-spin 0.7s linear infinite',
    flexShrink: 0,
  }} />
);

// ── RefreshButton ──────────────────────────────────────────────────
export const RefreshButton = ({ onClick, loading, Icon }) => (
  <button onClick={onClick} disabled={loading} className="du-btn-ghost">
    <Icon size={13} style={{ animation: loading ? 'du-spin 0.8s linear infinite' : 'none' }} />
    Refresh
  </button>
);

/**
 * DashboardUI.jsx — ZiDu Shared Component Library
 * Design: Arc × Editorial Clean — Warm Paper + Indigo
 */
import React from 'react';

export const T = {
  fontDisplay: 'Sora, sans-serif',
  fontBody:    'DM Sans, sans-serif',
  fontMono:    'JetBrains Mono, monospace',
  bg:          '#f4f3f0',
  surface:     '#ffffff',
  surfaceAlt:  '#f9f8f5',
  border:      '#ddd9d2',
  borderLight: '#ede9e2',
  text:        '#1a1c26',
  textSub:     '#4a4c5e',
  textMuted:   '#9a9790',
  brand:       '#6366f1',
  brandLight:  '#ede9ff',
  brandMid:    'rgba(99,102,241,0.12)',
  green:       '#1D9E75',
  greenLight:  '#E1F5EE',
  amber:       '#f59e0b',
  amberLight:  '#FAEEDA',
  red:         '#E24B4A',
  redLight:    '#FCEBEB',
  blue:        '#14b8a6',
  blueLight:   '#E1F5EE',
  purple:      '#534AB7',
  purpleLight: '#EEEDFE',
  rSm:  '5px',
  rMd:  '7px',
  rLg:  '8px',
  rXl:  '10px',
  shadowSm: 'none',
  shadowMd: '0 2px 8px rgba(0,0,0,0.06)',
};

export const DashboardStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    @keyframes du-fadeUp  { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
    @keyframes du-shimmer { 0%,100%{opacity:.5}50%{opacity:.85} }
    @keyframes du-pulse   { 0%,100%{opacity:1}50%{opacity:.35} }
    @keyframes du-spin    { to{transform:rotate(360deg);} }
    @keyframes du-scalein { from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);} }
    .du-fadein { animation: du-fadeUp .22s ease both; }
    .du-row-hover { transition: background .12s; }
    .du-row-hover:hover { background: #f4f3ff !important; }
    .du-btn-ghost {
      background:transparent; border:.5px solid #c5c2bc; border-radius:6px;
      cursor:pointer; font-family:DM Sans,sans-serif; font-size:12px; font-weight:500;
      color:#4a4c5e; padding:6px 12px;
      display:inline-flex; align-items:center; gap:5px;
      transition:all .12s;
    }
    .du-btn-ghost:hover { border-color:#6366f1; color:#6366f1; background:#ede9ff; }
    .du-btn-ghost:disabled { opacity:.5; cursor:not-allowed; }
    .du-btn-primary {
      background:#6366f1; border:none; border-radius:6px;
      cursor:pointer; font-family:DM Sans,sans-serif; font-size:12px;
      font-weight:500; color:#fff; padding:7px 14px;
      display:inline-flex; align-items:center; gap:5px; transition:all .12s;
    }
    .du-btn-primary:hover:not(:disabled) { background:#4f51c9; }
    .du-btn-primary:disabled { opacity:.55; cursor:not-allowed; }
  `}</style>
);

export const Shimmer = ({ h=14, w='100%', r=4, style:s }) => (
  <div style={{ height:h, width:w, borderRadius:r, flexShrink:0,
    background:'#ede9e2', animation:'du-shimmer 1.4s ease infinite', ...s }} />
);

export const Badge = ({ label, color=T.brand, bg=T.brandLight, border }) => (
  <span style={{ display:'inline-flex', alignItems:'center',
    padding:'2px 7px', borderRadius:'4px',
    fontSize:'9px', fontWeight:'500', fontFamily:T.fontMono,
    letterSpacing:'.02em', color, background:bg,
    border: border ? `0.5px solid ${border}` : undefined,
    whiteSpace:'nowrap' }}>
    {label}
  </span>
);

export const StatCard = ({ icon:Icon, label, value, sub, color, bg, delay=0 }) => (
  <div className="du-fadein" style={{
    background:T.surface, borderRadius:'8px',
    border:`0.5px solid ${T.border}`, borderTop:`2px solid ${color}`,
    padding:'10px 12px', flex:1, minWidth:'100px',
    animationDelay:`${delay}ms`,
  }}>
    <div style={{ fontSize:'22px', fontWeight:'700', fontFamily:T.fontMono,
      lineHeight:1, letterSpacing:'-.02em', color }}>{value}</div>
    <div style={{ fontSize:'8px', letterSpacing:'.07em', textTransform:'uppercase',
      color:T.textMuted, marginTop:'4px', fontFamily:T.fontMono }}>{label}</div>
    {sub && <div style={{ fontSize:'8px', color:T.textMuted, marginTop:'2px', fontFamily:T.fontMono }}>{sub}</div>}
  </div>
);

export const StatCardSkeleton = () => (
  <div style={{ background:T.surface, borderRadius:'8px',
    border:`0.5px solid ${T.border}`, borderTop:'2px solid #ede9e2',
    padding:'10px 12px', flex:1, minWidth:'100px' }}>
    <Shimmer w="36px" h={20} r={3} />
    <div style={{ marginTop:'6px' }}><Shimmer w="60px" h={8} /></div>
  </div>
);

export const SectionCard = ({ title, icon:Icon, iconColor=T.brand, iconBg=T.brandLight, right, children, delay=0 }) => (
  <div className="du-fadein" style={{
    background:T.surface, borderRadius:'10px',
    border:`0.5px solid ${T.border}`, overflow:'hidden',
    animationDelay:`${delay}ms`,
  }}>
    <div style={{ padding:'12px 14px', borderBottom:`0.5px solid ${T.border}`,
      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ fontSize:'12px', fontWeight:'500', color:T.text }}>{title}</div>
      {right && <div style={{ fontFamily:T.fontMono, fontSize:'9px', color:T.textMuted }}>{right}</div>}
    </div>
    <div style={{ padding:'4px 14px 10px' }}>{children}</div>
  </div>
);

export const EmptyState = ({ icon='📭', text='Tidak ada data', sub }) => (
  <div style={{ padding:'28px 0', textAlign:'center',
    display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
    <div style={{ border:`0.5px dashed ${T.border}`, borderRadius:'6px',
      width:'36px', height:'36px', display:'flex', alignItems:'center',
      justifyContent:'center', fontSize:'16px', color:T.textMuted }}>{icon}</div>
    <div style={{ fontSize:'11px', color:T.textMuted, fontFamily:T.fontBody }}>{text}</div>
    {sub && <div style={{ fontSize:'10px', color:T.textMuted, fontFamily:T.fontMono }}>{sub}</div>}
  </div>
);

export const RowItem = ({ left, title, sub, right, last=false, onClick }) => (
  <div className={onClick?'du-row-hover':''} onClick={onClick}
    style={{ padding:'9px 0', borderBottom:last?'none':`0.5px solid ${T.borderLight}`,
      display:'flex', alignItems:'center', gap:'9px',
      cursor:onClick?'pointer':'default' }}>
    {left}
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:'11px', fontWeight:'500', color:T.text,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        fontFamily:T.fontBody }}>{title}</div>
      {sub && <div style={{ fontSize:'9px', color:T.textMuted, marginTop:'1px',
        fontFamily:T.fontMono }}>{sub}</div>}
    </div>
    {right && <div style={{ flexShrink:0 }}>{right}</div>}
  </div>
);

export const IconBox = ({ size=28, r=6, bg, color, icon:Icon, iconSize=13 }) => (
  <div style={{ width:size, height:size, borderRadius:r, background:bg,
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
    <Icon size={iconSize} style={{ color }} />
  </div>
);

export const LiveDot = ({ color=T.green }) => (
  <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:color,
    display:'inline-block', animation:'du-pulse 1.4s ease infinite', flexShrink:0 }} />
);

export const ProgressBar = ({ value, max, color=T.brand, label, display }) => {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));
  const fill = pct >= 100 ? T.red : pct >= 80 ? T.amber : color;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
      {(label||display) && (
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          {label && <span style={{ fontSize:'10px', fontWeight:'500', color:T.textSub, fontFamily:T.fontBody }}>{label}</span>}
          {display && <span style={{ fontSize:'9px', color:T.textMuted, fontFamily:T.fontMono }}>{display}</span>}
        </div>
      )}
      <div style={{ height:'4px', borderRadius:'2px', background:'#ede9e2', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:'2px', background:fill,
          width:`${pct}%`, transition:'width .6s ease' }} />
      </div>
    </div>
  );
};

export const ScoreRing = ({ score, passed, size=40 }) => {
  const r=size/2-4, circ=2*Math.PI*r, pct=Math.min(100,Math.max(0,score??0))/100;
  const color=passed?T.green:score>=50?T.amber:T.red;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ede9e2" strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset .7s ease' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:'10px', fontWeight:'700', color,
        fontFamily:T.fontMono }}>{score!==null?Math.round(score):'—'}</div>
    </div>
  );
};

export const PageHeader = ({ greeting, name, subtitle, actions }) => (
  <div className="du-fadein" style={{ display:'flex', alignItems:'flex-start',
    justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
    <div>
      <h1 style={{ fontFamily:T.fontDisplay, fontSize:'18px', fontWeight:'600',
        color:T.text, margin:'0 0 3px', letterSpacing:'-.02em' }}>
        {greeting&&<>{greeting}, </>}
        {name&&<span style={{ color:T.brand }}>{name}</span>}
        {!greeting&&!name&&subtitle}
      </h1>
      {(greeting||name)&&subtitle&&(
        <p style={{ fontSize:'11px', color:T.textMuted, margin:0, fontFamily:T.fontMono,
          letterSpacing:'.04em', textTransform:'uppercase' }}>{subtitle}</p>
      )}
    </div>
    {actions&&<div style={{ display:'flex', gap:'7px', flexWrap:'wrap', alignItems:'center' }}>{actions}</div>}
  </div>
);

export const ErrorBanner = ({ message }) => (
  <div style={{ padding:'10px 14px', background:T.redLight,
    border:`0.5px solid #F7C1C1`, borderRadius:'7px', color:T.red,
    fontSize:'12px', display:'flex', alignItems:'center', gap:'7px',
    fontFamily:T.fontBody }}>
    ⚠ {message}
  </div>
);

export const StatusBadge = ({ status, examSession, startedAt }) => {
  const isExpired = (() => {
    if (status !== 'in_progress') return false;
    const now = new Date();
    if (examSession?.end_time && new Date(examSession.end_time) <= now) return true;
    if (!examSession?.end_time && examSession?.duration_minutes && startedAt) {
      const deadline = new Date(new Date(startedAt).getTime() + examSession.duration_minutes * 60 * 1000);
      if (deadline <= now) return true;
    }
    return false;
  })();
  const map = {
    graded:      { label:'Dinilai',    color:T.green,   bg:T.greenLight },
    submitted:   { label:'Dikumpul',   color:'#185FA5', bg:'#E6F1FB' },
    in_progress: isExpired
      ? { label:'Waktu Habis', color:'#5F5E5A', bg:'#F1EFE8' }
      : { label:'Berlangsung', color:T.amber,   bg:T.amberLight },
    grading:     { label:'Menunggu',   color:T.purple,  bg:T.purpleLight },
  };
  const m = map[status]||{ label:status, color:T.textMuted, bg:T.surfaceAlt };
  return <Badge label={m.label} color={m.color} bg={m.bg} />;
};

export const Spinner = ({ size=13, color='#fff' }) => (
  <div style={{ width:size, height:size, border:`2px solid rgba(255,255,255,0.25)`,
    borderTopColor:color, borderRadius:'50%',
    animation:'du-spin .7s linear infinite', flexShrink:0 }} />
);

export const RefreshButton = ({ onClick, loading, Icon }) => (
  <button onClick={onClick} disabled={loading} className="du-btn-ghost">
    <Icon size={12} style={{ animation:loading?'du-spin .8s linear infinite':'none' }} />
    Refresh
  </button>
);

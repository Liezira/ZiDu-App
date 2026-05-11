import React, { useEffect } from 'react';

const ICONS = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};
const COLORS = {
  success:{ bg:'#E1F5EE', color:'#0F6E56', border:'#a7e8d4' },
  error:  { bg:'#FCEBEB', color:'#A32D2D', border:'#F7C1C1' },
  info:   { bg:'#E6F1FB', color:'#185FA5', border:'#BFDBFE' },
  warning:{ bg:'#FAEEDA', color:'#854F0B', border:'#FDE68A' },
};

export const Toast = ({ message, type='success', onClose, duration=3000 }) => {
  useEffect(() => { const t = setTimeout(onClose, duration); return ()=>clearTimeout(t); }, [onClose, duration]);
  const c = COLORS[type]||COLORS.info;
  return (
    <div onClick={onClose} style={{
      position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)',
      zIndex:300, display:'inline-flex', alignItems:'center', gap:'7px',
      padding:'8px 14px', borderRadius:'6px', fontSize:'12px', fontWeight:'500',
      fontFamily:'DM Sans, sans-serif', cursor:'pointer', whiteSpace:'nowrap',
      background:c.bg, color:c.color, border:`0.5px solid ${c.border}`,
      boxShadow:'0 2px 12px rgba(0,0,0,.1)', animation:'zdFU .2s ease',
    }}>
      <span>{ICONS[type]}</span>{message}
    </div>
  );
};
export default Toast;

import React from 'react';

const VARIANTS = {
  easy:    { bg:'#E1F5EE', color:'#0F6E56', border:'#a7e8d4' },
  medium:  { bg:'#FAEEDA', color:'#854F0B', border:'#FDE68A' },
  hard:    { bg:'#FCEBEB', color:'#A32D2D', border:'#F7C1C1' },
  info:    { bg:'#E6F1FB', color:'#185FA5', border:'#BFDBFE' },
  success: { bg:'#E1F5EE', color:'#0F6E56', border:'#a7e8d4' },
  warning: { bg:'#FAEEDA', color:'#854F0B', border:'#FDE68A' },
  danger:  { bg:'#FCEBEB', color:'#A32D2D', border:'#F7C1C1' },
  default: { bg:'#F1EFE8', color:'#5F5E5A', border:'#ddd9d2' },
  purple:  { bg:'#EEEDFE', color:'#534AB7', border:'#c4c0f5' },
  teal:    { bg:'#E1F5EE', color:'#0F6E56', border:'#a7e8d4' },
};

export const Badge = ({ variant='info', children, className='' }) => {
  const v = VARIANTS[variant]||VARIANTS.default;
  return (
    <span style={{ display:'inline-flex', alignItems:'center',
      padding:'2px 7px', borderRadius:'4px',
      fontSize:'9px', fontWeight:'500', fontFamily:'JetBrains Mono, monospace',
      letterSpacing:'.02em', color:v.color, background:v.bg,
      border:`0.5px solid ${v.border}`, whiteSpace:'nowrap' }}
      className={className}>
      {children}
    </span>
  );
};
export default Badge;

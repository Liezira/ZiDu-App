import React from 'react';
import { cn } from './Button';

export const Input = React.forwardRef(({ className, label, error, icon:Icon, required, ...props }, ref) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'4px', width:'100%' }}>
    {label && (
      <label style={{ fontSize:'9px', fontFamily:'JetBrains Mono, monospace',
        fontWeight:'600', color:'#9a9790', letterSpacing:'.07em', textTransform:'uppercase' }}>
        {label}{required && <span style={{ color:'#E24B4A', marginLeft:'2px' }}>*</span>}
      </label>
    )}
    <div style={{ position:'relative' }}>
      {Icon && (
        <div style={{ position:'absolute', left:'9px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <Icon size={13} style={{ color:'#9a9790' }} />
        </div>
      )}
      <input ref={ref} {...props}
        style={{ padding: Icon ? '0 10px 0 30px' : '0 10px',
          height:'34px', width:'100%', boxSizing:'border-box',
          borderRadius:'6px', fontSize:'12px', color:'#1a1c26',
          fontFamily:'DM Sans, sans-serif',
          border:`0.5px solid ${error ? '#E24B4A' : '#c5c2bc'}`,
          background:'#ffffff', outline:'none',
          boxShadow: error ? '0 0 0 2px rgba(226,75,74,.1)' : 'none',
          transition:'border-color .12s, box-shadow .12s',
        }}
        onFocus={e=>{ e.target.style.borderColor='#6366f1'; e.target.style.boxShadow='0 0 0 2px rgba(99,102,241,.12)'; }}
        onBlur={e=>{ e.target.style.borderColor=error?'#E24B4A':'#c5c2bc'; e.target.style.boxShadow=error?'0 0 0 2px rgba(226,75,74,.1)':'none'; }}
      />
    </div>
    {error && <span style={{ fontSize:'9px', color:'#E24B4A', fontFamily:'JetBrains Mono, monospace' }}>{error}</span>}
  </div>
));
Input.displayName = 'Input';
export default Input;

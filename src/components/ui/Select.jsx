import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = ({ label, required, error, options=[], placeholder, className='', ...props }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }} className={className}>
    {label && (
      <label style={{ fontSize:'9px', fontFamily:'JetBrains Mono, monospace',
        fontWeight:'600', color:'#9a9790', letterSpacing:'.07em', textTransform:'uppercase' }}>
        {label}{required && <span style={{ color:'#E24B4A', marginLeft:'2px' }}>*</span>}
      </label>
    )}
    <div style={{ position:'relative' }}>
      <select {...props} style={{
        width:'100%', appearance:'none', padding:'0 28px 0 10px', height:'34px',
        borderRadius:'6px', fontSize:'12px', border:`0.5px solid ${error?'#E24B4A':'#c5c2bc'}`,
        background:'#ffffff', color:'#1a1c26', fontFamily:'DM Sans, sans-serif',
        outline:'none', cursor:'pointer', boxSizing:'border-box',
      }}
        onFocus={e=>{ e.target.style.borderColor='#6366f1'; e.target.style.boxShadow='0 0 0 2px rgba(99,102,241,.12)'; }}
        onBlur={e=>{ e.target.style.borderColor=error?'#E24B4A':'#c5c2bc'; e.target.style.boxShadow='none'; }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o=>{
          const val = typeof o==='string'?o:o.value;
          const lbl = typeof o==='string'?o:o.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      <ChevronDown size={12} style={{ position:'absolute', right:'9px', top:'50%',
        transform:'translateY(-50%)', color:'#9a9790', pointerEvents:'none' }} />
    </div>
    {error && <span style={{ fontSize:'9px', color:'#E24B4A', fontFamily:'JetBrains Mono, monospace' }}>{error}</span>}
  </div>
);
export default Select;

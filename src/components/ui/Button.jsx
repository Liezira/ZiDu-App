import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) { return twMerge(clsx(inputs)); }

const V = {
  primary:   { bg:'#6366f1', hov:'#4f51c9', color:'#fff', border:'#6366f1'  },
  secondary: { bg:'#ffffff', hov:'#f4f3f0', color:'#1a1c26', border:'#c5c2bc' },
  danger:    { bg:'#E24B4A', hov:'#c93b3a', color:'#fff', border:'#E24B4A'  },
  ghost:     { bg:'transparent', hov:'#ede9ff', color:'#4a4c5e', border:'transparent' },
};

export const Button = React.forwardRef(
  ({ children, className, variant='primary', isLoading=false, icon:Icon, disabled, sm, ...props }, ref) => {
    const v = V[variant]||V.primary;
    return (
      <button ref={ref} disabled={disabled||isLoading} {...props}
        style={{
          display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'5px',
          padding: sm ? '5px 10px' : '7px 14px',
          borderRadius:'6px', fontSize: sm ? '11px' : '12px', fontWeight:'500',
          fontFamily:'DM Sans, sans-serif', cursor:(disabled||isLoading)?'not-allowed':'pointer',
          opacity:(disabled||isLoading)?.6:1,
          background:v.bg, color:v.color, border:`0.5px solid ${v.border}`,
          transition:'all .12s', whiteSpace:'nowrap', ...props.style,
        }}
        onMouseEnter={e=>{ if(!disabled&&!isLoading) e.currentTarget.style.background=v.hov; }}
        onMouseLeave={e=>{ e.currentTarget.style.background=v.bg; }}
      >
        {isLoading
          ? <div style={{ width:'12px', height:'12px', border:'2px solid rgba(255,255,255,.3)',
              borderTopColor:v.color, borderRadius:'50%', animation:'spin .7s linear infinite' }} />
          : Icon && <Icon size={sm?11:13} />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;

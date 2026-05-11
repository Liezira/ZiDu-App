import React from 'react';

export const ConfirmDialog = ({
  open, title, message, onConfirm, onCancel,
  loading=false, confirmLabel='Ya, Hapus', confirmVariant='danger',
}) => {
  if (!open) return null;
  const dangerStyle = { bg:'#E24B4A', color:'#fff', hov:'#c93b3a' };
  const primaryStyle = { bg:'#6366f1', color:'#fff', hov:'#4f51c9' };
  const vs = confirmVariant==='danger' ? dangerStyle : primaryStyle;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200,
      background:'rgba(15,23,42,.55)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#ffffff', borderRadius:'8px', padding:'20px 22px',
        width:'100%', maxWidth:'360px', border:'0.5px solid #ddd9d2',
        boxShadow:'0 8px 32px rgba(0,0,0,.12)', animation:'zdScaleIn .2s ease' }}>
        <h3 style={{ fontFamily:'Sora, sans-serif', fontSize:'14px', fontWeight:'600',
          color:'#1a1c26', marginBottom:'7px' }}>{title}</h3>
        <p style={{ fontSize:'12px', color:'#4a4c5e', lineHeight:1.6, marginBottom:'16px' }}>{message}</p>
        <div style={{ display:'flex', gap:'7px', justifyContent:'flex-end' }}>
          <button onClick={onCancel} disabled={loading} style={{
            padding:'6px 12px', borderRadius:'5px', border:'0.5px solid #c5c2bc',
            background:'transparent', fontSize:'12px', color:'#4a4c5e',
            cursor:'pointer', fontFamily:'DM Sans, sans-serif',
          }}>Batal</button>
          <button onClick={onConfirm} disabled={loading} style={{
            display:'inline-flex', alignItems:'center', gap:'5px',
            padding:'6px 12px', borderRadius:'5px', border:'none',
            background:vs.bg, color:vs.color, fontSize:'12px', fontWeight:'500',
            cursor:loading?'not-allowed':'pointer', opacity:loading?.6:1,
            fontFamily:'DM Sans, sans-serif',
          }}>
            {loading && <div style={{ width:'11px', height:'11px',
              border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff',
              borderRadius:'50%', animation:'spin .7s linear infinite' }} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmDialog;

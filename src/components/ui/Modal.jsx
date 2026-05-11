import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ open, onClose, title, maxWidth='540px', children }) => {
  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key==='Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed', inset:0, zIndex:190,
        background:'rgba(15,23,42,.5)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#ffffff', borderRadius:'10px', width:'100%',
        maxWidth, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column',
        border:'0.5px solid #ddd9d2', animation:'zdScaleIn .2s ease',
        boxShadow:'0 8px 32px rgba(0,0,0,.12)' }}>
        <style>{`@keyframes zdScaleIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}`}</style>
        {title && (
          <div style={{ padding:'13px 16px', borderBottom:'0.5px solid #ddd9d2',
            display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ fontSize:'13px', fontWeight:'500', color:'#1a1c26',
              fontFamily:'Sora, sans-serif' }}>{title}</div>
            <button onClick={onClose} style={{ width:'24px', height:'24px', borderRadius:'5px',
              border:'0.5px solid #ddd9d2', background:'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'#9a9790' }}><X size={12} /></button>
          </div>
        )}
        <div style={{ overflowY:'auto', flex:1 }}>{children}</div>
      </div>
    </div>
  );
};
export default Modal;

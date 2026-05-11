import React from 'react';
export const Card = ({ children, className='', ...props }) => (
  <div style={{
    background:'#ffffff', borderRadius:'8px',
    border:'0.5px solid #ddd9d2', padding:'14px 16px',
  }} className={className} {...props}>{children}</div>
);
export default Card;

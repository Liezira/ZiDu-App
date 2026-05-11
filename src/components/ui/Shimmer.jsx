import React from 'react';

export const Shimmer = ({ height=14, width='100%', borderRadius=4, className='' }) => (
  <div className={className} style={{
    height, width, borderRadius, flexShrink:0,
    background:'#ede9e2', animation:'zdSk 1.4s ease infinite',
  }} />
);

export const ShimmerBlock = ({ rows=3 }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'8px', padding:'12px' }}>
    {Array.from({length:rows}).map((_,i) => (
      <Shimmer key={i} height={i===0?16:12} width={i===0?'55%':'100%'} />
    ))}
  </div>
);

export default Shimmer;

import React from 'react';

interface ArchitecturalScaleProps {
  gridIncrement: number; // feet per grid cell
  gridPx: number; // pixels per grid cell
  alignedTop: number; // top position to snap exactly to grid (offset internally by 8px for bar height)
  alignedLeft: number; // left position to snap exactly to grid
}

export const ArchitecturalScale: React.FC<ArchitecturalScaleProps> = ({ gridIncrement, gridPx, alignedTop, alignedLeft }) => {
  return (
    <div style={{ position: 'absolute', top: alignedTop - 8, left: alignedLeft, zIndex: 20 }}>
       <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold', textShadow: '0 1px 2px var(--bg-primary)' }}>
         1 Grid Cell = {gridIncrement}'
       </div>
       <div style={{ display: 'flex', border: '1px solid var(--text-primary)', borderTop: 'none', height: '8px', width: `${gridPx * 4}px`, boxSizing: 'border-box' }}>
          <div style={{ flex: 1, backgroundColor: 'var(--text-primary)' }}></div>
          <div style={{ flex: 1, backgroundColor: 'transparent' }}></div>
          <div style={{ flex: 1, backgroundColor: 'var(--text-primary)' }}></div>
          <div style={{ flex: 1, backgroundColor: 'transparent' }}></div>
       </div>
       <div style={{ display: 'flex', width: `${gridPx * 4}px`, justifyContent: 'space-between', color: 'var(--text-primary)', fontSize: '0.7rem', marginTop: '4px', fontWeight: 'bold', textShadow: '0 1px 2px var(--bg-primary)' }}>
          <span style={{ transform: 'translateX(-50%)' }}>0</span>
          <span style={{ transform: 'translateX(-50%)' }}>{gridIncrement * 2}'</span>
          <span style={{ transform: 'translateX(-50%)' }}>{gridIncrement * 4}'</span>
       </div>
    </div>
  );
};

import React from 'react';
import './DrillDownLayout.css';
export function DrillDownLayout({ 
  leftNav, 
  canvas, 
  inspector,
  canvasStyle
}: { 
  leftNav?: React.ReactNode, 
  canvas: React.ReactNode, 
  inspector: React.ReactNode,
  canvasStyle?: React.CSSProperties
}) {
  return (
    <div className="drill-down-container">
       {leftNav && <div className="drill-down-left-nav">{leftNav}</div>}
       <div className="drill-down-canvas" style={canvasStyle}>
          {canvas}
       </div>
       <div className="drill-down-inspector">
          {inspector}
       </div>
    </div>
  );
}

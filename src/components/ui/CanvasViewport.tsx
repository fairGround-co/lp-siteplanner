import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface CanvasViewportProps {
  children: (props: { 
    scale: number; 
    offsetX: number; 
    offsetY: number; 
    containerSize: { w: number; h: number };
  }) => ReactNode;
  defaultScale?: number;
  minScale?: number;
  maxScale?: number;
  gridSize?: number;
  disablePan?: boolean;
  disableZoom?: boolean;
  initialBounds?: {
    w: number;
    h: number;
    centerX: number;
    centerY: number;
    marginPct?: number; // e.g. 0.8 for 20% total margin
  };
}

export function CanvasViewport({ 
  children, 
  defaultScale = 1, 
  minScale = 0.5, 
  maxScale = 20,
  gridSize = 10,
  disablePan = false,
  disableZoom = false,
  initialBounds
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(defaultScale);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const initialized = useRef(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Center and scale initially
  useEffect(() => {
    if (containerSize.w > 0 && containerSize.h > 0 && !initialized.current) {
      initialized.current = true;
      if (initialBounds) {
        const margin = initialBounds.marginPct || 0.8;
        const s = Math.min(
          (containerSize.w * margin) / initialBounds.w,
          (containerSize.h * margin) / initialBounds.h,
          maxScale
        );
        setScale(s);
        setOffset({
          x: containerSize.w / 2 - initialBounds.centerX * s,
          y: containerSize.h / 2 - initialBounds.centerY * s
        });
      } else {
        setOffset({ x: containerSize.w / 2, y: containerSize.h / 2 });
      }
    }
  }, [containerSize.w, containerSize.h, initialBounds, maxScale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (disableZoom) return;
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    setScale(prev => {
      const newScale = Math.max(minScale, Math.min(maxScale, prev * (1 + delta)));
      
      // Keep mouse position fixed during zoom
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        setOffset(prevOffset => ({
          x: mouseX - (mouseX - prevOffset.x) * (newScale / prev),
          y: mouseY - (mouseY - prevOffset.y) * (newScale / prev)
        }));
      }
      
      return newScale;
    });
  }, [minScale, maxScale]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disablePan) return;
    if (e.button !== 0 && e.button !== 1) return; // Only left or middle click
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
    
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const gridPx = gridSize * scale;
  const bgOffsetX = offset.x % gridPx;
  const bgOffsetY = offset.y % gridPx;

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        overflow: 'hidden',
        cursor: disablePan ? 'default' : isDragging ? 'grabbing' : 'grab',
        backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
        backgroundSize: `${gridPx}px ${gridPx}px`,
        backgroundPosition: `${bgOffsetX}px ${bgOffsetY}px`,
        touchAction: 'none' // Prevent browser scrolling
      }}
    >
      {containerSize.w > 0 && containerSize.h > 0 && children({ scale, offsetX: offset.x, offsetY: offset.y, containerSize })}
    </div>
  );
}

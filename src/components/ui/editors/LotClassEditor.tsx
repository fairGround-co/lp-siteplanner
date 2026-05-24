import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info, AlertTriangle } from 'lucide-react';
import { usePlannerStore } from '../../../store/usePlannerStore';
import type { LotClass } from '../../../types';
import { DrillDownLayout } from '../DrillDownLayout';
import { ColorSwatchPicker } from '../ColorSwatchPicker';
import { RouteLeg } from '../IntersectionNode';

export function LotClassEditor({ id }: { id?: string }) {
  const store = usePlannerStore();
  const gridIncrement = store.config?.baseGridSize || 10;
  const [lot, setLot] = useState<LotClass | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 800 });
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [activeOverride, setActiveOverride] = useState<'front' | 'rear' | 'side' | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);
  const overridesRef = useRef<HTMLDivElement>(null);

  const [previewRoutes, setPreviewRoutes] = useState<{
    top: string | null;
    bottom: string | null;
    left: string | null;
    right: string | null;
  }>({
    top: null,
    bottom: null,
    left: null,
    right: null
  });
  const [activeRouteSelect, setActiveRouteSelect] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);

  // Initialize routes only once store is loaded
  useEffect(() => {
    const routeIds = Object.keys(store.routeClasses);
    if (routeIds.length > 0 && !previewRoutes.top) {
      setPreviewRoutes({
        top: routeIds[0],
        bottom: routeIds[0],
        left: routeIds[0] || null,
        right: routeIds[0] || null
      });
    }
  }, [store.routeClasses]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (activeOverride && overridesRef.current && !overridesRef.current.contains(event.target as Node)) {
        setActiveOverride(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeOverride]);

  useEffect(() => {
    if (id && id !== 'new') {
      const existing = store.lotClasses[id];
      if (existing) setLot(JSON.parse(JSON.stringify(existing)));
    } else {
      setLot({
        id: `lot-${Date.now()}`,
        name: 'New Lot Typology',
        use: 'residential',
        targetWidth: 24,
        minWidth: 16,
        maxWidth: 36,
        minDepth: 80,
        maxDepth: 120,
        minBuildableWidth: 12,
        minBuildableDepth: 40,
        splitPreference: 'split_if_possible',
        setbacks: {
          frontageHierarchy: [],
          front: { default: 10, perRouteClass: {} },
          rear: { default: 5, perRouteClass: {} },
          side: { default: 0, perRouteClass: {} }
        },
        displayStyle: { fillColor: '#4ade80', strokeColor: '#22c55e' }
      });
    }
  }, [id, store.lotClasses]);

  if (!lot) return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading Lot Typology...</div>;

  const usedByRoutes = Object.values(store.routeClasses).flatMap(rc => 
    rc.crossSection.elements.map(el => (el as any).displayStyle?.fillColor?.toLowerCase()).filter(Boolean)
  ) as string[];

  const usedByLots = Object.values(store.lotClasses)
    .filter(lc => lc.id !== lot.id)
    .map(lc => lc.displayStyle?.fillColor?.toLowerCase())
    .filter(Boolean) as string[];

  const handleSave = () => {
    if (id === 'new') {
      store.addLotClass(lot);
    } else {
      store.updateLotClass(lot.id, lot);
    }
  };

  const updateLot = (updates: Partial<LotClass>) => {
    setLot(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateSetback = (edge: 'front' | 'rear' | 'side', value: number) => {
    setLot(prev => {
      if (!prev) return null;
      return {
        ...prev,
        setbacks: {
          ...prev.setbacks,
          [edge]: { ...prev.setbacks[edge], default: value }
        }
      };
    });
  };

  // --- CANVAS RENDERER ---
  const renderCanvas = () => {
    // block context
    const width = lot.targetWidth || 24;
    const depth = Math.min(Math.max(lot.minDepth, 100), lot.maxDepth) || 100;
    
    // 5 lots wide, 2 lots deep.
    const blockW = width * 5;
    const blockD = depth * 2;

    const getRouteWidth = (routeId: string | null) => {
      if (!routeId) return 20; // default alley/path width
      const rc = store.routeClasses[routeId];
      if (!rc) return 20;
      return rc.crossSection.elements.reduce((acc, el) => acc + el.targetWidth, 0);
    };

    const topRouteW = getRouteWidth(previewRoutes.top);
    const bottomRouteW = getRouteWidth(previewRoutes.bottom);
    const leftRouteW = getRouteWidth(previewRoutes.left);
    const rightRouteW = getRouteWidth(previewRoutes.right);

    const totalW = blockW + leftRouteW + rightRouteW;
    const totalD = blockD + topRouteW + bottomRouteW;

    // Expand to fill container, with 5% margin on each side (10% total)
    const marginW = containerSize.w * 0.10;
    const marginH = containerSize.h * 0.10;
    const scale = Math.min((containerSize.w - marginW) / totalW, (containerSize.h - marginH) / totalD, 15);
    const px = (val: number) => val * scale;

    // Use exact integer pixel snapping to prevent blurry CSS transform alignment
    const blockOffsetX = Math.floor(containerSize.w / 2 - px(totalW) / 2);
    const blockOffsetY = Math.floor(containerSize.h / 2 - px(totalD) / 2);

    // We export these so they can be passed to DrillDownLayout canvasStyle
    const gridOffsetX = blockOffsetX + px(leftRouteW);
    const gridOffsetY = blockOffsetY + px(topRouteW);

    const evaluateSetbacks = (row: 0 | 1, col: number) => {
       const adjTop = row === 0 ? (previewRoutes.top || 'LOT') : 'LOT';
       const adjBottom = row === 1 ? (previewRoutes.bottom || 'LOT') : 'LOT';
       const adjLeft = col === 0 ? (previewRoutes.left || 'LOT') : 'LOT';
       const adjRight = col === 4 ? (previewRoutes.right || 'LOT') : 'LOT';

       let availableRoutes: { edge: 'top'|'bottom'|'left'|'right', routeId: string }[] = [];
       if (adjTop !== 'LOT') availableRoutes.push({ edge: 'top', routeId: adjTop as string });
       if (adjBottom !== 'LOT') availableRoutes.push({ edge: 'bottom', routeId: adjBottom as string });
       if (adjLeft !== 'LOT') availableRoutes.push({ edge: 'left', routeId: adjLeft as string });
       if (adjRight !== 'LOT') availableRoutes.push({ edge: 'right', routeId: adjRight as string });

       let frontEdge: 'top'|'bottom'|'left'|'right' = row === 0 ? 'top' : 'bottom';
       let bestPriority = Infinity;

       for (const ar of availableRoutes) {
          const pref = lot.setbacks.frontageHierarchy.find(h => h.routeClassId === ar.routeId);
          const prio = pref ? pref.priority : 999;
          if (prio < bestPriority) {
             bestPriority = prio;
             frontEdge = ar.edge;
          }
       }

       const getSetbackDist = (edgeType: 'front'|'rear'|'side', adjacentId: string | 'LOT') => {
          if (adjacentId === 'LOT') return lot.setbacks[edgeType].default;
          if (lot.setbacks[edgeType].perRouteClass[adjacentId] !== undefined) {
             return lot.setbacks[edgeType].perRouteClass[adjacentId];
          }
          return lot.setbacks[edgeType].default;
       };

       const resolveEdge = (edge: 'top'|'bottom'|'left'|'right', adjacentId: string | 'LOT') => {
          if (edge === frontEdge) return { type: 'front', dist: getSetbackDist('front', adjacentId) };
          const opposites: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
          if (edge === opposites[frontEdge]) return { type: 'rear', dist: getSetbackDist('rear', adjacentId) };
          return { type: 'side', dist: getSetbackDist('side', adjacentId) };
       };

       return {
         frontEdge,
         top: resolveEdge('top', adjTop),
         bottom: resolveEdge('bottom', adjBottom),
         left: resolveEdge('left', adjLeft),
         right: resolveEdge('right', adjRight)
       };
    };

    const RouteRect = ({ edge, routeId, rw, rh, t, l }: any) => {
       const isHovered = hoveredField === `route-${edge}`;
       const isVertical = edge === 'left' || edge === 'right';
       const rc = routeId ? store.routeClasses[routeId] : null;

       return (
         <div 
            onClick={() => setActiveRouteSelect(edge)}
            onMouseEnter={() => setHoveredField(`route-${edge}`)}
            onMouseLeave={() => setHoveredField(null)}
            style={{
              position: 'absolute', top: px(t), left: px(l), width: px(rw), height: px(rh),
              background: routeId ? 'var(--bg-modifier-hover)' : 'var(--bg-modifier-active)',
              border: `1px solid var(--border-subtle)`,
              cursor: 'pointer',
              outline: isHovered ? '2px solid var(--text-primary)' : 'none',
              zIndex: 10,
              overflow: 'hidden'
            }}>
            {rc ? (
              <RouteLeg
                route={rc}
                isHorizontal={!isVertical}
                position="leg"
                config={store.config}
                pxPerFt={scale}
              />
            ) : (
              <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>None</span>
            )}
         </div>
       );
    };

    const renderLots = () => {
       const lots = [];
       for (let row = 0; row < 2; row++) {
         for (let col = 0; col < 5; col++) {
           const sb = evaluateSetbacks(row as 0|1, col);
           const lTop = topRouteW + (row * depth);
           const lLeft = leftRouteW + (col * width);
           
           const arrowRotations: Record<string, number> = { top: 45, right: 135, bottom: 225, left: 315 };
           const rot = arrowRotations[sb.frontEdge];
           
           let arrowTop = '50%';
           let arrowLeft = '50%';
           if (sb.frontEdge === 'top') { arrowTop = `${px(sb.top.dist)}px`; arrowLeft = '50%'; }
           else if (sb.frontEdge === 'bottom') { arrowTop = `${px(depth - sb.bottom.dist)}px`; arrowLeft = '50%'; }
           else if (sb.frontEdge === 'left') { arrowTop = '50%'; arrowLeft = `${px(sb.left.dist)}px`; }
           else if (sb.frontEdge === 'right') { arrowTop = '50%'; arrowLeft = `${px(width - sb.right.dist)}px`; }

           lots.push(
             <div key={`${row}-${col}`} style={{
               position: 'absolute', top: px(lTop), left: px(lLeft), width: px(width), height: px(depth),
               backgroundColor: lot.displayStyle?.fillColor || 'rgba(74, 222, 128, 0.2)',
               border: `1px solid ${lot.displayStyle?.strokeColor || 'var(--border-strong)'}`,
               boxShadow: hoveredField === 'width' ? 'inset 0 0 0 2px rgba(255, 255, 255, 0.5)' : 'none',
               boxSizing: 'border-box'
             }}>
                {/* Arrow */}
                <div style={{
                  position: 'absolute', top: arrowTop, left: arrowLeft, width: px(8), height: px(8),
                  transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                  borderLeft: '2px solid rgba(255,255,255,0.4)',
                  borderTop: '2px solid rgba(255,255,255,0.4)',
                  opacity: 0.6,
                  zIndex: 2
                }} />

                {/* Setbacks */}
                <div 
                   onClick={() => document.getElementById(`input-${sb.top.type}-default`)?.focus()}
                   onMouseEnter={() => setHoveredField(`${sb.top.type}Setback`)}
                   onMouseLeave={() => setHoveredField(null)}
                   style={{
                     position: 'absolute', top: 0, left: 0, right: 0, height: px(sb.top.dist),
                     borderBottom: '1px dashed rgba(255,255,255,0.4)',
                     background: hoveredField === `${sb.top.type}Setback` ? 'rgba(255,255,255,0.2)' : 'transparent',
                     cursor: 'pointer'
                   }} 
                />
                <div 
                   onClick={() => document.getElementById(`input-${sb.bottom.type}-default`)?.focus()}
                   onMouseEnter={() => setHoveredField(`${sb.bottom.type}Setback`)}
                   onMouseLeave={() => setHoveredField(null)}
                   style={{
                     position: 'absolute', bottom: 0, left: 0, right: 0, height: px(sb.bottom.dist),
                     borderTop: '1px dashed rgba(255,255,255,0.4)',
                     background: hoveredField === `${sb.bottom.type}Setback` ? 'rgba(255,255,255,0.2)' : 'transparent',
                     cursor: 'pointer'
                   }} 
                />
                <div 
                   onClick={() => document.getElementById(`input-${sb.left.type}-default`)?.focus()}
                   onMouseEnter={() => setHoveredField(`${sb.left.type}Setback`)}
                   onMouseLeave={() => setHoveredField(null)}
                   style={{
                     position: 'absolute', top: 0, bottom: 0, left: 0, width: px(sb.left.dist),
                     borderRight: '1px dashed rgba(255,255,255,0.4)',
                     background: hoveredField === `${sb.left.type}Setback` ? 'rgba(255,255,255,0.2)' : 'transparent',
                     cursor: 'pointer'
                   }} 
                />
                <div 
                   onClick={() => document.getElementById(`input-${sb.right.type}-default`)?.focus()}
                   onMouseEnter={() => setHoveredField(`${sb.right.type}Setback`)}
                   onMouseLeave={() => setHoveredField(null)}
                   style={{
                     position: 'absolute', top: 0, bottom: 0, right: 0, width: px(sb.right.dist),
                     borderLeft: '1px dashed rgba(255,255,255,0.4)',
                     background: hoveredField === `${sb.right.type}Setback` ? 'rgba(255,255,255,0.2)' : 'transparent',
                     cursor: 'pointer'
                   }} 
                />
             </div>
           );
         }
       }
       return lots;
    };

    return {
       gridProps: {
         backgroundImage: `linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)`,
         backgroundSize: `${px(gridIncrement)}px ${px(gridIncrement)}px`,
         backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`
       },
       node: (
         <div 
           ref={containerRef}
           style={{ 
             position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden'
           }}>
            <div style={{ position: 'absolute', top: blockOffsetY, left: blockOffsetX, width: px(totalW), height: px(totalD) }}>
               {/* Routes */}
               <RouteRect edge="top" routeId={previewRoutes.top} rw={totalW} rh={topRouteW} t={0} l={0} />
               <RouteRect edge="bottom" routeId={previewRoutes.bottom} rw={totalW} rh={bottomRouteW} t={topRouteW + blockD} l={0} />
               <RouteRect edge="left" routeId={previewRoutes.left} rw={leftRouteW} rh={blockD} t={topRouteW} l={0} />
               <RouteRect edge="right" routeId={previewRoutes.right} rw={rightRouteW} rh={blockD} t={topRouteW} l={leftRouteW + blockW} />

               {renderLots()}

               {/* Route Selector Popover */}
               {activeRouteSelect && (
                  <div style={{
                     position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                     background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)',
                     padding: '16px', borderRadius: '8px', zIndex: 100, boxShadow: 'var(--shadow)',
                     display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px'
                  }}>
                     <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>Select Route</h3>
                     <button 
                       className="secondary-btn" 
                       onClick={() => { setPreviewRoutes(p => ({ ...p, [activeRouteSelect]: null })); setActiveRouteSelect(null); }}
                     >
                       None (Alley / Lot)
                     </button>
                     {Object.values(store.routeClasses).map(rc => (
                       <button 
                         key={rc.id} 
                         className="secondary-btn" 
                         onClick={() => { setPreviewRoutes(p => ({ ...p, [activeRouteSelect]: rc.id })); setActiveRouteSelect(null); }}
                         style={{ justifyContent: 'flex-start' }}
                       >
                         {rc.name}
                       </button>
                     ))}
                     <button 
                       className="secondary-btn" 
                       style={{ marginTop: '8px', border: '1px solid var(--border-strong)' }}
                       onClick={() => setActiveRouteSelect(null)}
                     >
                       Cancel
                     </button>
                  </div>
               )}
            </div>
         </div>
       )
    };
  };

  const renderInspector = () => {
    const actionsContainer = document.getElementById('editor-header-actions');
    const saveButtonPortal = actionsContainer ? createPortal(
      <button onClick={handleSave} className="action-button" style={{background: '#4ade80', color: '#000', fontWeight: 'bold', border: 'none'}}>Save</button>,
      actionsContainer
    ) : null;

    return (
      <>
        {saveButtonPortal}
        <h2 style={{margin: '0 0 16px 0', fontSize:'1.2rem'}}>Edit Lot Typology</h2>

      <div className="inspector-section">
        <h3>General</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <ColorSwatchPicker 
            label="Display Color"
            color={lot.displayStyle?.fillColor || '#4ade80'} 
            onChange={c => updateLot({ displayStyle: { ...lot.displayStyle, fillColor: c, strokeColor: c } })} 
            variant="icon"
            hiddenColors={usedByRoutes}
            slashedColors={usedByLots}
          />
          <div className="inspector-field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Name</label>
            <input type="text" value={lot.name} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateLot({ name: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="inspector-section" onMouseEnter={() => setHoveredField('width')} onMouseLeave={() => setHoveredField(null)}>
        <h3>Typical Dimensions (ft)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: 1.4 }}>
          The ideal dimensional footprint for this lot. The engine will attempt to hit this target width when subdividing.
        </p>
        <div className="inspector-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: lot.targetWidth % gridIncrement !== 0 ? '#eab308' : undefined }}>
            Target Width
            {lot.targetWidth % gridIncrement !== 0 && <span title={`Not divisible by ${gridIncrement}ft grid`}><AlertTriangle size={14} /></span>}
          </label>
          <input 
            type="number" 
            value={lot.targetWidth} 
            onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} 
            onChange={e => updateLot({ targetWidth: Number(e.target.value) })} 
            style={{ borderColor: lot.targetWidth % gridIncrement !== 0 ? '#eab308' : undefined }}
          />
        </div>
      </div>

      <div className="inspector-section" ref={overridesRef}>
        <h3>Setbacks (ft)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: 1.4 }}>
          Setbacks define the non-buildable exterior perimeter of the lot, enforcing required yard space between the property line and the actual building footprint.
        </p>
        <div style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div className="inspector-field" style={{ flex: 1, marginBottom: 0 }} onMouseEnter={() => setHoveredField('frontSetback')} onMouseLeave={() => setHoveredField(null)}>
            <label>Front Default</label>
            <input id="input-front-default" type="number" value={lot.setbacks.front.default} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateSetback('front', Number(e.target.value))} />
          </div>
          <button 
            className="secondary-btn" 
            style={{ flex: 1, padding: '6px', fontSize: '0.8rem', height: '32px', background: activeOverride === 'front' ? 'var(--bg-canvas)' : 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            onClick={() => setActiveOverride(activeOverride === 'front' ? null : 'front')}
          >
            Overrides...
          </button>
          {activeOverride === 'front' && (
            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', padding: '12px', borderRadius: '6px', boxShadow: 'var(--shadow)', width: '240px', marginTop: '4px' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Front Setback Overrides</h4>
              {Object.values(store.routeClasses).map(rc => (
                <div key={rc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rc.name}</span>
                  <input type="number" style={{ width: '60px', padding: '2px 4px', fontSize: '0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }} value={lot.setbacks.front.perRouteClass[rc.id] ?? ''} placeholder={String(lot.setbacks.front.default)} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => {
                    const val = e.target.value;
                    const newOverrides = { ...lot.setbacks.front.perRouteClass };
                    if (val === '') delete newOverrides[rc.id]; else newOverrides[rc.id] = Number(val);
                    updateLot({ setbacks: { ...lot.setbacks, front: { ...lot.setbacks.front, perRouteClass: newOverrides } } });
                  }} />
                </div>
              ))}
              {Object.keys(store.routeClasses).length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>No route classes defined.</span>}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div className="inspector-field" style={{ flex: 1, marginBottom: 0 }} onMouseEnter={() => setHoveredField('rearSetback')} onMouseLeave={() => setHoveredField(null)}>
            <label>Rear Default</label>
            <input id="input-rear-default" type="number" value={lot.setbacks.rear.default} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateSetback('rear', Number(e.target.value))} />
          </div>
          <button 
            className="secondary-btn" 
            style={{ flex: 1, padding: '6px', fontSize: '0.8rem', height: '32px', background: activeOverride === 'rear' ? 'var(--bg-canvas)' : 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            onClick={() => setActiveOverride(activeOverride === 'rear' ? null : 'rear')}
          >
            Overrides...
          </button>
          {activeOverride === 'rear' && (
            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', padding: '12px', borderRadius: '6px', boxShadow: 'var(--shadow)', width: '240px', marginTop: '4px' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Rear Setback Overrides</h4>
              {Object.values(store.routeClasses).map(rc => (
                <div key={rc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rc.name}</span>
                  <input type="number" style={{ width: '60px', padding: '2px 4px', fontSize: '0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }} value={lot.setbacks.rear.perRouteClass[rc.id] ?? ''} placeholder={String(lot.setbacks.rear.default)} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => {
                    const val = e.target.value;
                    const newOverrides = { ...lot.setbacks.rear.perRouteClass };
                    if (val === '') delete newOverrides[rc.id]; else newOverrides[rc.id] = Number(val);
                    updateLot({ setbacks: { ...lot.setbacks, rear: { ...lot.setbacks.rear, perRouteClass: newOverrides } } });
                  }} />
                </div>
              ))}
              {Object.keys(store.routeClasses).length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>No route classes defined.</span>}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div className="inspector-field" style={{ flex: 1, marginBottom: 0 }} onMouseEnter={() => setHoveredField('sideSetback')} onMouseLeave={() => setHoveredField(null)}>
            <label>Side Default</label>
            <input id="input-side-default" type="number" value={lot.setbacks.side.default} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateSetback('side', Number(e.target.value))} />
          </div>
          <button 
            className="secondary-btn" 
            style={{ flex: 1, padding: '6px', fontSize: '0.8rem', height: '32px', background: activeOverride === 'side' ? 'var(--bg-canvas)' : 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
            onClick={() => setActiveOverride(activeOverride === 'side' ? null : 'side')}
          >
            Overrides...
          </button>
          {activeOverride === 'side' && (
            <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 50, background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', padding: '12px', borderRadius: '6px', boxShadow: 'var(--shadow)', width: '240px', marginBottom: '4px' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>Side Setback Overrides</h4>
              {Object.values(store.routeClasses).map(rc => (
                <div key={rc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rc.name}</span>
                  <input type="number" style={{ width: '60px', padding: '2px 4px', fontSize: '0.8rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-primary)' }} value={lot.setbacks.side.perRouteClass[rc.id] ?? ''} placeholder={String(lot.setbacks.side.default)} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => {
                    const val = e.target.value;
                    const newOverrides = { ...lot.setbacks.side.perRouteClass };
                    if (val === '') delete newOverrides[rc.id]; else newOverrides[rc.id] = Number(val);
                    updateLot({ setbacks: { ...lot.setbacks, side: { ...lot.setbacks.side, perRouteClass: newOverrides } } });
                  }} />
                </div>
              ))}
              {Object.keys(store.routeClasses).length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>No route classes defined.</span>}
            </div>
          )}
        </div>
      </div>

      <div className="inspector-section">
        <h3>Constraints (ft)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: 1.4 }}>
          Hard mathematical limits for topological warping. The engine will refuse to warp or subdivide the lot beyond these boundaries.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: lot.minWidth % gridIncrement !== 0 ? '#eab308' : undefined }}>
              Min Width
              {lot.minWidth % gridIncrement !== 0 && <span title={`Not divisible by ${gridIncrement}ft grid`}><AlertTriangle size={14} /></span>}
            </label>
            <input type="number" value={lot.minWidth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateLot({ minWidth: Number(e.target.value) })} style={{ borderColor: lot.minWidth % gridIncrement !== 0 ? '#eab308' : undefined }} />
          </div>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: lot.maxWidth % gridIncrement !== 0 ? '#eab308' : undefined }}>
              Max Width
              {lot.maxWidth % gridIncrement !== 0 && <span title={`Not divisible by ${gridIncrement}ft grid`}><AlertTriangle size={14} /></span>}
            </label>
            <input type="number" value={lot.maxWidth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateLot({ maxWidth: Number(e.target.value) })} style={{ borderColor: lot.maxWidth % gridIncrement !== 0 ? '#eab308' : undefined }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: lot.minDepth % gridIncrement !== 0 ? '#eab308' : undefined }}>
              Min Depth
              {lot.minDepth % gridIncrement !== 0 && <span title={`Not divisible by ${gridIncrement}ft grid`}><AlertTriangle size={14} /></span>}
            </label>
            <input type="number" value={lot.minDepth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateLot({ minDepth: Number(e.target.value) })} style={{ borderColor: lot.minDepth % gridIncrement !== 0 ? '#eab308' : undefined }} />
          </div>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: lot.maxDepth % gridIncrement !== 0 ? '#eab308' : undefined }}>
              Max Depth
              {lot.maxDepth % gridIncrement !== 0 && <span title={`Not divisible by ${gridIncrement}ft grid`}><AlertTriangle size={14} /></span>}
            </label>
            <input type="number" value={lot.maxDepth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateLot({ maxDepth: Number(e.target.value) })} style={{ borderColor: lot.maxDepth % gridIncrement !== 0 ? '#eab308' : undefined }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label title="Minimum required buildable width inside setbacks">Buildable Min Width</label>
            <input type="number" value={lot.minBuildableWidth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateLot({ minBuildableWidth: Number(e.target.value) })} />
          </div>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label title="Minimum required buildable depth inside setbacks">Buildable Min Depth</label>
            <input type="number" value={lot.minBuildableDepth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateLot({ minBuildableDepth: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="inspector-section">
        <h3>Rules</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: 1.4 }}>
          This dictates how the Geometry Engine behaves when a space is larger than the lot's maximum width.
        </p>
        <div className="inspector-field" style={{ position: 'relative' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            Split Preference
            <Info 
              size={14} 
              style={{ color: 'var(--text-tertiary)', cursor: 'help' }} 
              onMouseEnter={() => setHoveredField('splitInfo')} 
              onMouseLeave={() => setHoveredField(null)}
            />
          </label>
          <select value={lot.splitPreference} onChange={e => updateLot({ splitPreference: e.target.value as any })}>
            <option value="split_if_possible">Split if Possible</option>
            <option value="always_split">Always Split</option>
            <option value="never_split">Never Split</option>
          </select>
          {hoveredField === 'splitInfo' && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              zIndex: 50,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-strong)',
              padding: '12px',
              borderRadius: '6px',
              boxShadow: 'var(--shadow)',
              width: '240px',
              marginBottom: '8px'
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Split if Possible:</strong> Subdivides into multiple lots based on optimal width math.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Always Split:</strong> Forces subdivision down to the minimum viable width.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Never Split:</strong> Consumes the entire allotted boundary as a single massive lot (e.g., anchor tenants).
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

  const canvasContent = renderCanvas();

  return (
    <DrillDownLayout 
      canvas={canvasContent.node}
      inspector={renderInspector()}
      canvasStyle={canvasContent.gridProps}
    />
  );
}


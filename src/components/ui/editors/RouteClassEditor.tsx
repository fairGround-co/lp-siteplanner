import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePlannerStore } from '../../../store/usePlannerStore';
import type { RouteClass, RouteElement, RouteElementType } from '../../../types';
import { DrillDownLayout } from '../DrillDownLayout';
import { IntersectionNode } from '../IntersectionNode';


import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Copy } from 'lucide-react';

export function RouteClassEditor({ id }: { id?: string }) {
  const store = usePlannerStore();
  const [route, setRoute] = useState<RouteClass | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const laneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollToLane = (index: number) => {
    setHoveredIndex(index);
    laneRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    setRoute(prev => {
      if (!prev) return null;
      const newEls = [...prev.crossSection.elements];
      const [draggedItem] = newEls.splice(draggedIndex, 1);
      newEls.splice(index, 0, draggedItem);
      return { ...prev, crossSection: { ...prev.crossSection, elements: newEls } };
    });
    setDraggedIndex(index);
  };

  const moveElement = (index: number, direction: 'up' | 'down') => {
    setRoute(prev => {
      if (!prev) return null;
      const newEls = [...prev.crossSection.elements];
      if (direction === 'up' && index > 0) {
        [newEls[index - 1], newEls[index]] = [newEls[index], newEls[index - 1]];
      } else if (direction === 'down' && index < newEls.length - 1) {
        [newEls[index + 1], newEls[index]] = [newEls[index], newEls[index + 1]];
      }
      return { ...prev, crossSection: { ...prev.crossSection, elements: newEls } };
    });
  };

  const getParkingWidth = (angle: number) => {
    const pLength = store.config.parkingStallLength || 18;
    const pWidth = store.config.parkingStallWidth || 7;
    if (angle === 0) return pWidth; 
    if (angle === 90) return pLength; 
    const rad = angle * (Math.PI / 180);
    return Math.round(pLength * Math.sin(rad) + pWidth * Math.cos(rad));
  };

  const handleTypeChange = (index: number, newType: RouteElementType) => {
    if (newType === 'parking_lane') {
      const w = getParkingWidth(0);
      updateElement(index, { type: newType, parkingAngle: 0, targetWidth: w, minWidth: w, maxWidth: w, direction: undefined });
    } else if (newType === 'drive_lane') {
      updateElement(index, { type: newType, direction: 'right' });
    } else {
      updateElement(index, { type: newType, direction: undefined });
    }
  };

  const handleAngleChange = (index: number, angle: number) => {
    const w = getParkingWidth(angle);
    updateElement(index, { parkingAngle: angle, targetWidth: w, minWidth: w, maxWidth: w });
  };

  useEffect(() => {
    if (id && id !== 'new') {
      const existing = store.routeClasses[id];
      if (existing) setRoute(JSON.parse(JSON.stringify(existing)));
    } else {
      setRoute({
        id: `route-${Date.now()}`,
        name: 'New Route Typology',
        crossSection: {
          trafficFlow: 'two_way',
          elements: [
            { id: `el-${Date.now()}-1`, type: 'sidewalk', targetWidth: 10, minWidth: 6, maxWidth: 15 },
            { id: `el-${Date.now()}-2`, type: 'drive_lane', targetWidth: 12, minWidth: 10, maxWidth: 14 },
            { id: `el-${Date.now()}-3`, type: 'sidewalk', targetWidth: 10, minWidth: 6, maxWidth: 15 }
          ]
        }
      });
    }
  }, [id, store.routeClasses]);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const canvasRef = useCallback((el: HTMLDivElement | null) => {
    if (observer.current) {
      observer.current.disconnect();
      observer.current = null;
    }
    if (el) {
      observer.current = new ResizeObserver(entries => {
        for (let e of entries) {
          setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
        }
      });
      observer.current.observe(el);
    }
  }, []);

  if (!route) return null;

  const handleSave = () => {
    if (id === 'new') {
      store.addRouteClass(route);
    } else {
      store.updateRouteClass(route.id, route);
    }
  };

  const updateRoute = (updates: Partial<RouteClass>) => {
    setRoute(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateElement = (index: number, updates: Partial<RouteElement>) => {
    setRoute(prev => {
      if (!prev) return null;
      const newEls = [...prev.crossSection.elements];
      newEls[index] = { ...newEls[index], ...updates };
      return { ...prev, crossSection: { ...prev.crossSection, elements: newEls } };
    });
  };

  const addElement = () => {
    setRoute(prev => {
      if (!prev) return null;
      return {
        ...prev,
        crossSection: {
          ...prev.crossSection,
          elements: [...prev.crossSection.elements, { id: `el-${Date.now()}`, type: 'drive_lane', targetWidth: 12, minWidth: 10, maxWidth: 14 }]
        }
      };
    });
  };

  const removeElement = (index: number) => {
    setRoute(prev => {
      if (!prev) return null;
      const newEls = [...prev.crossSection.elements];
      newEls.splice(index, 1);
      return { ...prev, crossSection: { ...prev.crossSection, elements: newEls } };
    });
  };

  const duplicateElement = (index: number) => {
    setRoute(prev => {
      if (!prev) return null;
      const newEls = [...prev.crossSection.elements];
      const copy = { ...newEls[index], id: `el-${Date.now()}` };
      newEls.splice(index + 1, 0, copy);
      return { ...prev, crossSection: { ...prev.crossSection, elements: newEls } };
    });
  };

  // --- CANVAS RENDERER ---
  const renderCanvas = () => {
    const config = store.config;
    const gridFt = config?.baseGridSize || 10;
    
    const pxPerGrid = 40;
    const pxPerFt = pxPerGrid / gridFt;
    
    let baseTotalWidth = route.crossSection.elements.reduce((acc, el) => acc + el.targetWidth, 0);
    let overlapReduction = 0;
    const effectiveWidths = [...route.crossSection.elements.map(el => el.targetWidth)];

    const errors: string[] = [];
    const warnings: string[] = [];

    route.crossSection.elements.forEach((el, i) => {
      if (el.type === 'parking_lane') {
        const hasPrevDrive = route.crossSection.elements[i - 1]?.type === 'drive_lane';
        const hasNextDrive = route.crossSection.elements[i + 1]?.type === 'drive_lane';
        const adjacentDrives = (hasPrevDrive ? 1 : 0) + (hasNextDrive ? 1 : 0);
        
        let driveLane: typeof el | undefined;
        if (hasPrevDrive) driveLane = route.crossSection.elements[i - 1];
        if (hasNextDrive) driveLane = route.crossSection.elements[i + 1];

        if (adjacentDrives !== 1) {
          errors.push(`ERROR: Parking lane at index ${i} must have EXACTLY ONE adjacent drive lane`);
        } else if (driveLane) {
          let totalAisleWidth = 0;
          const dirCount = { left: 0, right: 0, yield: 0 };
          
          if (hasPrevDrive) {
             let j = i - 1;
             while (j >= 0 && route.crossSection.elements[j].type === 'drive_lane') {
               totalAisleWidth += route.crossSection.elements[j].targetWidth;
               const d = route.crossSection.elements[j].direction || 'right';
               dirCount[d]++;
               j--;
             }
          } else if (hasNextDrive) {
             let j = i + 1;
             while (j < route.crossSection.elements.length && route.crossSection.elements[j].type === 'drive_lane') {
               totalAisleWidth += route.crossSection.elements[j].targetWidth;
               const d = route.crossSection.elements[j].direction || 'right';
               dirCount[d]++;
               j++;
             }
          }
          
          const isTwoWay = dirCount.yield > 0 || (dirCount.left > 0 && dirCount.right > 0);
          const angle = Math.abs(el.parkingAngle || 0);
          let minAisle = 20; // Default for two-way
          if (!isTwoWay) {
            if (angle === 0) minAisle = 10.5;
            else if (angle <= 30) minAisle = 11;
            else if (angle <= 45) minAisle = 12;
            else if (angle <= 60) minAisle = 16;
            else if (angle <= 90) minAisle = 20;
          } else {
            minAisle = 20; // 20 ft for all angles if two-way
          }
          
          if (totalAisleWidth < minAisle) {
            warnings.push(`WARNING: Drive aisle adjacent to ${angle}° parking should be at least ${minAisle}' wide for maneuverability.`);
          }
        }
        
        const nextEl = route.crossSection.elements[i + 1];
        if (nextEl?.type === 'parking_lane') {
          const angle1 = el.parkingAngle || 0;
          const angle2 = nextEl.parkingAngle || 0;
          const isNonOrthogonal1 = angle1 > 0 && angle1 < 90;
          const isNonOrthogonal2 = angle2 > 0 && angle2 < 90;
          if (isNonOrthogonal1 && isNonOrthogonal2) {
            if (angle1 === angle2) {
              const rad = angle1 * Math.PI / 180;
              const stallWidth = store.config?.parkingStallWidth || 9;
              const overlapAmt = stallWidth * Math.cos(rad);
              overlapReduction += overlapAmt;
              effectiveWidths[i] -= overlapAmt / 2;
              effectiveWidths[i + 1] -= overlapAmt / 2;
            } else {
              warnings.push(`WARNING: Adjacent angled parking lanes can be staggered in practice to reduce total ROW width.`);
            }
          }
        }
      }
    });

    const totalWidth = Math.round((baseTotalWidth - overlapReduction) * 10) / 10;

    if (totalWidth % (store.config?.baseGridSize || 12) !== 0) {
      warnings.push(`WARNING: Total width is not a multiple of the base grid size (${store.config?.baseGridSize || 12}')`);
    }

    let statusColor = 'var(--color-success)';
    if (warnings.length > 0) statusColor = 'var(--color-warning)';
    if (errors.length > 0) statusColor = 'var(--color-danger)';

    const w_px = Math.round(totalWidth * pxPerFt);

    let anchorX: number | undefined = undefined;
    let anchorY: number | undefined = undefined;
    if (containerSize.w > 0 && containerSize.h > 0) {
      const idealX = containerSize.w / 2 - w_px / 2;
      const idealY = containerSize.h / 2 - w_px / 2;
      // Snap TOP-LEFT corner to grid
      anchorX = Math.round(idealX / pxPerGrid) * pxPerGrid;
      anchorY = Math.round(idealY / pxPerGrid) * pxPerGrid;
    }

    return (
      <div ref={canvasRef} style={{ width: '100%', height: '100%', boxSizing: 'border-box', position: 'relative' }}>
         {/* HUD Report */}
         <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, background: 'var(--bg-inspector)', border: `2px solid ${statusColor}`, padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', boxShadow: 'var(--shadow)', maxWidth: '300px' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total ROW</span>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
              <span style={{ color: statusColor, fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' }}>{totalWidth}'</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>({route.crossSection.elements.reduce((acc, el) => acc + el.minWidth, 0)}' - {route.crossSection.elements.reduce((acc, el) => acc + el.maxWidth, 0)}')</span>
            </div>
         </div>
         
         {(errors.length > 0 || warnings.length > 0) && (
           <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', maxWidth: '400px', background: 'var(--bg-inspector)', padding: '12px', borderRadius: '8px', boxShadow: 'var(--shadow)', borderLeft: `4px solid ${errors.length > 0 ? 'var(--color-danger)' : 'var(--color-warning)'}` }}>
              {errors.map((err, idx) => (
                <span key={`err-${idx}`} style={{ color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'right' }}>{err}</span>
              ))}
              {warnings.map((warn, idx) => (
                <span key={`warn-${idx}`} style={{ color: 'var(--color-warning)', fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'right' }}>{warn}</span>
              ))}
           </div>
         )}
         
         <div style={{position: 'absolute', top: 16, left: 16, color: '#aaa', fontSize: '0.8rem', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px'}}>
           Intersection Preview
         </div>

         <IntersectionNode 
            routeH={route} 
            routeV={route} 
            config={store.config} 
            pxPerFt={pxPerFt} 
            interactive={true}
            hoveredIndex={hoveredIndex}
            draggedIndex={draggedIndex}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragEnd={() => setDraggedIndex(null)}
            onClickLane={scrollToLane}
            onMouseEnterLane={setHoveredIndex}
            onMouseLeaveLane={() => setHoveredIndex(null)}
            anchorX={anchorX}
            anchorY={anchorY}
         />

         {/* Scale Reference Bar */}
         <div style={{ position: 'absolute', bottom: '40px', left: '40px', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold', textShadow: '0 1px 2px var(--bg-primary)' }}>
              1 Grid Cell = {gridFt}'
            </span>
            <div style={{ display: 'flex', border: '1px solid var(--text-primary)', borderTop: 'none', height: '8px', width: `${pxPerGrid * 4}px`, boxSizing: 'border-box' }}>
               <div style={{ flex: 1, backgroundColor: 'var(--text-primary)' }}></div>
               <div style={{ flex: 1, backgroundColor: 'transparent' }}></div>
               <div style={{ flex: 1, backgroundColor: 'var(--text-primary)' }}></div>
               <div style={{ flex: 1, backgroundColor: 'transparent' }}></div>
            </div>
            <div style={{ display: 'flex', width: `${pxPerGrid * 4}px`, justifyContent: 'space-between', color: 'var(--text-primary)', fontSize: '0.7rem', marginTop: '2px', fontWeight: 'bold', textShadow: '0 1px 2px var(--bg-primary)' }}>
               <span>0</span>
               <span>{gridFt * 2}'</span>
               <span>{gridFt * 4}'</span>
            </div>
         </div>
      </div>
    );
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
        <h2 style={{margin: '0 0 16px 0', fontSize:'1.2rem'}}>Edit Route Typology</h2>

        <div className="inspector-section">
          <h3>General</h3>
          <div className="inspector-field">
            <label>Name</label>
            <input type="text" value={route.name} onChange={e => updateRoute({ name: e.target.value })} />
          </div>
          <div className="inspector-field">
            <label>Traffic Flow</label>
            <select value={route.crossSection.trafficFlow} onChange={e => updateRoute({ crossSection: { ...route.crossSection, trafficFlow: e.target.value as any }})}>
              <option value="two_way">Two Way</option>
              <option value="one_way">One Way</option>
            </select>
          </div>
          <div className="inspector-field">
            <label>Curb Radius (ft)</label>
            <input type="number" placeholder={`${store.config?.pedestrianCurbRadius ?? 15} (Default)`} value={route.curbRadius ?? ''} onChange={e => updateRoute({ curbRadius: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        </div>

      <div className="inspector-section">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px'}}>
          <h3 style={{border: 'none', margin: 0, padding: 0}}>Lanes (Left to Right)</h3>
          <button onClick={addElement} style={{background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer'}}><Plus size={16}/></button>
        </div>
        
        {route.crossSection.elements.map((el, i) => (
          <div key={el.id} 
               ref={(elRef) => { laneRefs.current[i] = elRef; }}
               draggable
               onDragStart={() => handleDragStart(i)}
               onDragOver={(e) => handleDragOver(e)}
               onDragEnter={() => handleDragEnter(i)}
               onDragEnd={() => setDraggedIndex(null)}
               onMouseEnter={() => setHoveredIndex(i)} 
               onMouseLeave={() => setHoveredIndex(null)}
               style={{
                 background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', 
                 border: hoveredIndex === i ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                 display: 'flex', flexDirection: 'column', gap: '8px', transition: 'border 0.2s ease',
                 opacity: draggedIndex === i ? 0.5 : 1
               }}>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <div style={{cursor: 'grab', color: '#888', display: 'flex', alignItems: 'center'}}><GripVertical size={16} /></div>
                <select value={el.type} onChange={e => handleTypeChange(i, e.target.value as RouteElementType)} style={{background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px'}}>
                  <option value="drive_lane">Drive Lane</option>
                  <option value="parking_lane">Parking Lane</option>
                  <option value="sidewalk">Sidewalk</option>
                  <option value="lawn_strip">Lawn Strip</option>
                </select>
              </div>
              <div style={{display: 'flex', gap: '4px'}}>
                <button onClick={() => duplicateElement(i)} style={{background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer'}} title="Duplicate Lane"><Copy size={16}/></button>
                <button onClick={() => moveElement(i, 'up')} disabled={i === 0} style={{background: 'transparent', border: 'none', color: i === 0 ? '#555' : '#aaa', cursor: i === 0 ? 'default' : 'pointer'}}><ChevronUp size={16}/></button>
                <button onClick={() => moveElement(i, 'down')} disabled={i === route.crossSection.elements.length - 1} style={{background: 'transparent', border: 'none', color: i === route.crossSection.elements.length - 1 ? '#555' : '#aaa', cursor: i === route.crossSection.elements.length - 1 ? 'default' : 'pointer'}}><ChevronDown size={16}/></button>
                <button onClick={() => removeElement(i)} style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '4px'}}><Trash2 size={16}/></button>
              </div>
            </div>
            
            <div style={{display: 'flex', gap: '8px'}}>
              {el.type === 'drive_lane' && (
                <div className="inspector-field" style={{flex: 1}}>
                  <label>Direction</label>
                  <select value={el.direction || 'right'} onChange={e => updateElement(i, { direction: e.target.value as any })} style={{padding: '4px'}}>
                    <option value="right">Right (Forward)</option>
                    <option value="left">Left (Backward)</option>
                    <option value="yield">Yield (Both)</option>
                  </select>
                </div>
              )}
              {el.type === 'parking_lane' ? (
                <>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Parking Angle</label>
                    <select value={el.parkingAngle || 0} onChange={e => handleAngleChange(i, Number(e.target.value))} style={{padding: '4px'}}>
                      <option value={0}>0° (Parallel)</option>
                      <option value={30}>30° (Angled)</option>
                      <option value={45}>45° (Angled)</option>
                      <option value={60}>60° (Angled)</option>
                      <option value={90}>90° (Perpendicular)</option>
                    </select>
                  </div>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Width</label>
                    <div style={{padding: '4px', fontSize: '0.9rem', color: effectiveWidths[i] !== el.targetWidth ? '#eab308' : '#ccc', display: 'flex', alignItems: 'center', height: '100%', fontWeight: 'bold'}}>
                      {Math.round(effectiveWidths[i] * 10) / 10}' {effectiveWidths[i] !== el.targetWidth && '(Interlocked)'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Width</label>
                    <input type="number" value={el.targetWidth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateElement(i, { targetWidth: Number(e.target.value) })} style={{padding: '4px'}} />
                  </div>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Min</label>
                    <input type="number" value={el.minWidth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateElement(i, { minWidth: Number(e.target.value) })} style={{padding: '4px'}} />
                  </div>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Max</label>
                    <input type="number" value={el.maxWidth} onFocus={e => { const t = e.target; setTimeout(() => t.select(), 10); }} onChange={e => updateElement(i, { maxWidth: Number(e.target.value) })} style={{padding: '4px'}} />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
    const pxPerGrid = 40;

    return (
      <DrillDownLayout 
        canvasStyle={{ 
          backgroundSize: `${pxPerGrid}px ${pxPerGrid}px`,
          backgroundPosition: '0 0'
        }}
        canvas={renderCanvas()}
        inspector={renderInspector()}
      />
    );
}


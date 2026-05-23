import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePlannerStore } from '../../../store/usePlannerStore';
import type { RouteClass, RouteElement, RouteElementType } from '../../../types';
import { DrillDownLayout } from '../DrillDownLayout';
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

  const handleDragOver = (e: React.DragEvent, index: number) => {
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
    
    // Determine a visual scale. Let's make one grid cell = 40px on screen.
    const pxPerGrid = 40;
    const pxPerFt = pxPerGrid / gridFt;
    
    const totalWidth = route.crossSection.elements.reduce((acc, el) => acc + el.targetWidth, 0);
    const pxTotal = totalWidth * pxPerFt;
    
    // A helper to render the cross-section
    const renderCrossSection = (isHorizontal: boolean) => {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: isHorizontal ? 'column' : 'row',
          width: isHorizontal ? '100%' : pxTotal,
          height: isHorizontal ? pxTotal : '100%',
          boxShadow: '0 0 40px rgba(0,0,0,0.5)'
        }}>
           {route.crossSection.elements.map((el, i) => {
             const isHovered = hoveredIndex === i;
             const bgColor = el.type === 'sidewalk' ? '#555' : el.type === 'parking_lane' ? '#333' : el.type === 'drive_lane' ? '#222' : '#4ade80';
             const borderStyle = i < route.crossSection.elements.length - 1 ? '2px dashed rgba(255,255,255,0.2)' : 'none';
             
             let bgImage = 'none';
             if (el.type === 'parking_lane') {
               const pLength = store.config.parkingStallLength || 18;
               const pWidth = store.config.parkingStallWidth || 7;
               const angle = el.parkingAngle || 0;
               
               // Find nearest adjacent drive lane to determine flow
               let adjacentDirection: 'right' | 'left' | 'yield' = 'right';
               let leftDriveDist = Infinity;
               let rightDriveDist = Infinity;
               let leftDir: 'right' | 'left' | 'yield' | null = null;
               let rightDir: 'right' | 'left' | 'yield' | null = null;
               
               for (let j = i - 1; j >= 0; j--) {
                 if (route.crossSection.elements[j].type === 'drive_lane') {
                   leftDriveDist = i - j;
                   leftDir = route.crossSection.elements[j].direction || 'right';
                   break;
                 }
               }
               for (let j = i + 1; j < route.crossSection.elements.length; j++) {
                 if (route.crossSection.elements[j].type === 'drive_lane') {
                   rightDriveDist = j - i;
                   rightDir = route.crossSection.elements[j].direction || 'right';
                   break;
                 }
               }
               if (leftDriveDist < rightDriveDist) adjacentDirection = leftDir || 'right';
               else if (rightDriveDist < leftDriveDist) adjacentDirection = rightDir || 'right';
               else if (leftDir) adjacentDirection = leftDir;

               const flowDir = adjacentDirection === 'yield' ? 'right' : adjacentDirection;
               let carAngle = 0;
               
               if (!isHorizontal) {
                 carAngle = flowDir === 'right' ? angle : 180 + angle;
               } else {
                 carAngle = flowDir === 'right' ? 90 + angle : 270 + angle;
               }
               
               const lineAngle = angle === 0 ? carAngle + 90 : carAngle;
               const gradAngle = lineAngle - 90;
               const spacingFt = angle === 0 ? pLength : pWidth;
               
               const spacingPx = spacingFt * pxPerFt;
               bgImage = `repeating-linear-gradient(${gradAngle}deg, transparent, transparent calc(${spacingPx}px - 2px), rgba(234, 179, 8, 0.5) calc(${spacingPx}px - 2px), rgba(234, 179, 8, 0.5) ${spacingPx}px)`;
             }

             // Direction arrows for drive lanes
             let arrow = null;
             if (el.type === 'drive_lane') {
               const dir = el.direction || 'right';
               if (!isHorizontal) {
                 arrow = dir === 'right' ? '↑' : dir === 'left' ? '↓' : '↕';
               } else {
                 arrow = dir === 'right' ? '→' : dir === 'left' ? '←' : '↔';
               }
             }
             
             return (
               <div key={`${isHorizontal ? 'h' : 'v'}-${el.id}`} 
                 draggable
                 onDragStart={(e) => { e.stopPropagation(); handleDragStart(i); }}
                 onDragOver={(e) => handleDragOver(e, i)}
                 onDragEnter={() => handleDragEnter(i)}
                 onDragEnd={() => setDraggedIndex(null)}
                 onClick={() => scrollToLane(i)}
                 onMouseEnter={() => setHoveredIndex(i)}
                 onMouseLeave={() => setHoveredIndex(null)}
                 style={{
                 flex: el.targetWidth,
                 minWidth: 0,
                 minHeight: 0,
                 overflow: 'hidden',
                 backgroundColor: bgColor,
                 backgroundImage: bgImage,
                 borderRight: !isHorizontal ? borderStyle : 'none',
                 borderBottom: isHorizontal ? borderStyle : 'none',
                 display: 'flex', flexDirection: isHorizontal ? 'row' : 'column', alignItems: 'center', justifyContent: 'center',
                 boxShadow: isHovered ? 'inset 0 0 0 2px #4ade80' : 'none',
                 transition: 'all 0.2s ease',
                 position: 'relative',
                 cursor: 'pointer'
               }}>
                  {!isHorizontal && (
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', pointerEvents: 'none'}}>
                      {arrow && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>{arrow}</span>}
                      <span style={{ color: 'white', fontWeight: 'bold' }}>{el.targetWidth}'</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                        {el.type.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                  {isHorizontal && (
                    <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', pointerEvents: 'none'}}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>
                        {el.type.replace('_', ' ')}
                      </span>
                      <span style={{ color: 'white', fontWeight: 'bold' }}>{el.targetWidth}'</span>
                      {arrow && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>{arrow}</span>}
                    </div>
                  )}
                  {isHovered && !isHorizontal && (
                    <div style={{position: 'absolute', bottom: '40px', background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', color: '#4ade80', fontSize: '0.9rem', width: 'max-content', textAlign: 'center', pointerEvents: 'none', zIndex: 10}}>
                      Min {el.minWidth}' / Max {el.maxWidth}'
                    </div>
                  )}
               </div>
             );
           })}
        </div>
      );
    }
    
    const isValid = totalWidth % (store.config?.baseGridSize || 12) === 0;
    const statusColor = isValid ? 'var(--color-success)' : 'var(--color-warning)';

    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
         {/* HUD Report */}
         <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, background: 'var(--bg-inspector)', border: `2px solid ${statusColor}`, padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: 'var(--shadow)' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total ROW</span>
            <div style={{display: 'flex', alignItems: 'baseline', gap: '8px'}}>
              <span style={{ color: statusColor, fontSize: '1.5rem', fontWeight: 'bold' }}>{totalWidth}'</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>({route.crossSection.elements.reduce((acc, el) => acc + el.minWidth, 0)}' - {route.crossSection.elements.reduce((acc, el) => acc + el.maxWidth, 0)}')</span>
            </div>
         </div>

         {/* North / South Pane */}
         <div style={{ height: '50%', position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
            <span style={{position: 'absolute', top: 16, left: 16, color: '#aaa', fontSize: '0.8rem', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px'}}>North / South</span>
            {renderCrossSection(false)}
         </div>
         
         {/* East / West Pane */}
         <div style={{ height: '50%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <span style={{position: 'absolute', top: 16, left: 16, color: '#aaa', fontSize: '0.8rem', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px'}}>East / West</span>
            {renderCrossSection(true)}
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
               onDragOver={(e) => handleDragOver(e, i)}
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
              ) : (
                <>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Width</label>
                    <input type="number" value={el.targetWidth} onChange={e => updateElement(i, { targetWidth: Number(e.target.value) })} style={{padding: '4px'}} />
                  </div>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Min</label>
                    <input type="number" value={el.minWidth} onChange={e => updateElement(i, { minWidth: Number(e.target.value) })} style={{padding: '4px'}} />
                  </div>
                  <div className="inspector-field" style={{flex: 1}}>
                    <label>Max</label>
                    <input type="number" value={el.maxWidth} onChange={e => updateElement(i, { maxWidth: Number(e.target.value) })} style={{padding: '4px'}} />
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

    const gridFt = store.config?.baseGridSize || 12;
    const pxPerGrid = 40;
    const totalWidth = route.crossSection.elements.reduce((acc, el) => acc + el.targetWidth, 0);
    const gridCells = totalWidth / gridFt;
    const isEven = gridCells % 2 === 0;

    return (
      <DrillDownLayout 
        canvasStyle={{ 
          backgroundSize: `${pxPerGrid}px ${pxPerGrid}px`,
          backgroundPosition: isEven ? `calc(50% - ${pxPerGrid/2}px) calc(50% - ${pxPerGrid/2}px)` : 'center center'
        }}
        canvas={renderCanvas()}
        inspector={renderInspector()}
      />
    );
}

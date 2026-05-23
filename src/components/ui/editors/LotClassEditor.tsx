import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { usePlannerStore } from '../../../store/usePlannerStore';
import type { LotClass } from '../../../types';
import { DrillDownLayout } from '../DrillDownLayout';

export function LotClassEditor({ id }: { id?: string }) {
  const store = usePlannerStore();
  const [lot, setLot] = useState<LotClass | null>(null);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

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
          front: { default: 10, adjacentToLot: 10, perRouteClass: {} },
          rear: { default: 5, adjacentToLot: 5, perRouteClass: {} },
          side: { default: 0, adjacentToLot: 0, perRouteClass: {} }
        },
        displayStyle: { fillColor: '#4ade80', strokeColor: '#22c55e' }
      });
    }
  }, [id, store.lotClasses]);

  if (!lot) return null;

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
    const width = lot.targetWidth || 24;
    const depth = Math.min(Math.max(lot.minDepth, 100), lot.maxDepth) || 100;
    
    // Scale for preview
    const scale = Math.min(400 / width, 600 / depth, 10);
    const pxW = width * scale;
    const pxD = depth * scale;

    const sF = lot.setbacks.front.default * scale;
    const sR = lot.setbacks.rear.default * scale;
    const sS = lot.setbacks.side.default * scale;

    return (
      <div style={{ position: 'relative', width: pxW, height: pxD }}>
        {/* The Lot Boundary */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundColor: lot.displayStyle.fillColor || 'rgba(74, 222, 128, 0.2)',
          border: `2px solid ${lot.displayStyle.strokeColor || '#22c55e'}`,
          boxShadow: hoveredField === 'width' ? '0 0 0 4px rgba(74, 222, 128, 0.5)' : 'none',
          transition: 'all 0.2s ease'
        }} />
        
        {/* Front Setback */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: sF,
          borderBottom: '2px dashed rgba(255,255,255,0.5)',
          backgroundColor: hoveredField === 'frontSetback' ? 'rgba(255,255,255,0.2)' : 'transparent',
          transition: 'background 0.2s ease'
        }}>
           <span style={{position:'absolute', bottom:2, left:4, fontSize:10, color:'#fff'}}>Front: {lot.setbacks.front.default}'</span>
        </div>

        {/* Rear Setback */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: sR,
          borderTop: '2px dashed rgba(255,255,255,0.5)',
          backgroundColor: hoveredField === 'rearSetback' ? 'rgba(255,255,255,0.2)' : 'transparent',
          transition: 'background 0.2s ease'
        }}>
           <span style={{position:'absolute', top:2, left:4, fontSize:10, color:'#fff'}}>Rear: {lot.setbacks.rear.default}'</span>
        </div>

        {/* Side Setbacks */}
        <div style={{
          position: 'absolute', top: sF, bottom: sR, left: 0, width: sS,
          borderRight: '2px dashed rgba(255,255,255,0.5)',
          backgroundColor: hoveredField === 'sideSetback' ? 'rgba(255,255,255,0.2)' : 'transparent',
          transition: 'background 0.2s ease'
        }} />
        <div style={{
          position: 'absolute', top: sF, bottom: sR, right: 0, width: sS,
          borderLeft: '2px dashed rgba(255,255,255,0.5)',
          backgroundColor: hoveredField === 'sideSetback' ? 'rgba(255,255,255,0.2)' : 'transparent',
          transition: 'background 0.2s ease'
        }} />
        
        {/* Width Dimension Line */}
        <div style={{
           position: 'absolute', bottom: -30, left: 0, right: 0, height: 1, background: '#fff',
           opacity: hoveredField === 'width' ? 1 : 0.3
        }}>
           <div style={{position: 'absolute', top:-4, left:0, width:1, height:9, background:'#fff'}}/>
           <div style={{position: 'absolute', top:-4, right:0, width:1, height:9, background:'#fff'}}/>
           <span style={{position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', color:'#fff', fontSize: 12}}>
             {width}' Target Width
           </span>
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
        <h2 style={{margin: '0 0 16px 0', fontSize:'1.2rem'}}>Edit Lot Typology</h2>

        <div className="inspector-section">
        <h3>General</h3>
        <div className="inspector-field">
          <label>Name</label>
          <input type="text" value={lot.name} onChange={e => updateLot({ name: e.target.value })} />
        </div>
        <div className="inspector-field">
          <label>Fill Color</label>
          <input type="color" value={lot.displayStyle.fillColor} onChange={e => updateLot({ displayStyle: { ...lot.displayStyle, fillColor: e.target.value } })} />
        </div>
      </div>

      <div className="inspector-section" onMouseEnter={() => setHoveredField('width')} onMouseLeave={() => setHoveredField(null)}>
        <h3>Dimensions (ft)</h3>
        <div className="inspector-field">
          <label>Target Width</label>
          <input type="number" value={lot.targetWidth} onChange={e => updateLot({ targetWidth: Number(e.target.value) })} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label>Min Width</label>
            <input type="number" value={lot.minWidth} onChange={e => updateLot({ minWidth: Number(e.target.value) })} />
          </div>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label>Max Width</label>
            <input type="number" value={lot.maxWidth} onChange={e => updateLot({ maxWidth: Number(e.target.value) })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label>Min Depth</label>
            <input type="number" value={lot.minDepth} onChange={e => updateLot({ minDepth: Number(e.target.value) })} />
          </div>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label>Max Depth</label>
            <input type="number" value={lot.maxDepth} onChange={e => updateLot({ maxDepth: Number(e.target.value) })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label title="Minimum required buildable width inside setbacks">Bldg Min W</label>
            <input type="number" value={lot.minBuildableWidth} onChange={e => updateLot({ minBuildableWidth: Number(e.target.value) })} />
          </div>
          <div className="inspector-field" style={{ flex: 1 }}>
            <label title="Minimum required buildable depth inside setbacks">Bldg Min D</label>
            <input type="number" value={lot.minBuildableDepth} onChange={e => updateLot({ minBuildableDepth: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="inspector-section">
        <h3>Setbacks (ft)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: 1.4 }}>
          Setbacks define the non-buildable exterior perimeter of the lot, enforcing required yard space between the property line and the actual building footprint.
        </p>
        <div className="inspector-field" onMouseEnter={() => setHoveredField('frontSetback')} onMouseLeave={() => setHoveredField(null)}>
          <label>Front Setback</label>
          <input type="number" value={lot.setbacks.front.default} onChange={e => updateSetback('front', Number(e.target.value))} />
        </div>
        <div className="inspector-field" onMouseEnter={() => setHoveredField('rearSetback')} onMouseLeave={() => setHoveredField(null)}>
          <label>Rear Setback</label>
          <input type="number" value={lot.setbacks.rear.default} onChange={e => updateSetback('rear', Number(e.target.value))} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div className="inspector-field" style={{ flex: 1 }} onMouseEnter={() => setHoveredField('sideSetback')} onMouseLeave={() => setHoveredField(null)}>
            <label title="Side setback adjacent to a street/route">Side (Route)</label>
            <input type="number" value={lot.setbacks.side.default} onChange={e => updateSetback('side', Number(e.target.value))} />
          </div>
          <div className="inspector-field" style={{ flex: 1 }} onMouseEnter={() => setHoveredField('sideSetback')} onMouseLeave={() => setHoveredField(null)}>
            <label title="Side setback adjacent to another lot (e.g. 0 for townhomes)">Side (Lot)</label>
            <input type="number" value={lot.setbacks.side.adjacentToLot} onChange={e => updateLot({ setbacks: { ...lot.setbacks, side: { ...lot.setbacks.side, adjacentToLot: Number(e.target.value) } } })} />
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

  return (
    <DrillDownLayout 
      canvas={renderCanvas()}
      inspector={renderInspector()}
    />
  );
}

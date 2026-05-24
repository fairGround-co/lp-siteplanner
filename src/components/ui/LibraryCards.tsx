import { useState, useEffect } from 'react';
import { Settings, Map, Shapes, LayoutTemplate, Plus, Copy, Trash2 } from 'lucide-react';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { LotClass, RouteClass } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- SORTABLE WRAPPER ---
function SortableTile({ id, children, className, onClick, title, style }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const dynamicStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style
  };

  return (
    <div
      ref={setNodeRef}
      style={dynamicStyle}
      className={className}
      onClick={onClick}
      title={title}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

// --- MINI PREVIEWS ---

export function MiniLotPreview({ lot }: { lot: LotClass }) {
  const width = lot.targetWidth || 24;
  const wRatio = Math.min(width / 60, 1);
  const pxWidth = 20 + (wRatio * 40);

  return (
    <div style={{
      width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', padding: '8px'
    }}>
      <div style={{
        width: `${pxWidth}px`, height: '40px', 
        border: `2px solid ${lot.displayStyle?.strokeColor || '#fff'}`,
        backgroundColor: lot.displayStyle?.fillColor || 'rgba(255,255,255,0.1)',
        position: 'relative'
      }}>
         <div style={{ position: 'absolute', top: '8px', left: '2px', right: '2px', borderTop: '1px dashed rgba(255,255,255,0.3)' }} />
      </div>
    </div>
  );
}

export function MiniRoutePreview({ route }: { route: RouteClass }) {
  if (!route.crossSection || !route.crossSection.elements) return <div style={{ height: '60px', marginBottom: '8px' }} />;

  return (
    <div style={{
      width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px',
      display: 'flex', alignItems: 'stretch', marginBottom: '8px', overflow: 'hidden'
    }}>
      {route.crossSection.elements.map((el, i) => (
        <div key={i} style={{
          flex: el.targetWidth,
          borderRight: i < route.crossSection.elements.length - 1 ? '1px dashed rgba(255,255,255,0.2)' : 'none',
          backgroundColor: el.type === 'sidewalk' ? '#555' : el.type === 'parking_lane' ? '#333' : el.type === 'drive_lane' ? '#222' : '#4ade80',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.5)'
        }}>
           {el.targetWidth}'
        </div>
      ))}
    </div>
  );
}

// --- CARDS ---

export function SystemSettingsCard() {
  const config = usePlannerStore(state => state.config);
  const updateConfig = usePlannerStore(state => state.updateConfig);

  return (
    <div className="bento-card card-system" style={{ cursor: 'default' }}>
       <h2><Settings /> System</h2>
       <p style={{marginBottom: '16px'}}>Global dimensions and behaviors.</p>
       <div className="library-grid">
         
         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)' }}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Theme</span>
            <select 
              value={config.theme || 'system'}
              onChange={e => updateConfig({ theme: e.target.value as any })}
              style={{ 
                fontSize: '1.2rem', 
                background: 'transparent', 
                color: 'var(--text-primary)', 
                border: 'none', 
                padding: 0, 
                outline: 'none', 
                cursor: 'pointer',
                appearance: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
         </div>

         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)' }}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Storage Engine</span>
            <select 
              value={config.storageMode || 'local'}
              onChange={e => {
                updateConfig({ storageMode: e.target.value as any });
                alert("Storage engine change will take effect on next reload. (Note: IndexedDB and File API are placeholders pending implementation).");
              }}
              style={{ 
                fontSize: '1.2rem', 
                background: 'transparent', 
                color: 'var(--text-primary)', 
                border: 'none', 
                padding: 0, 
                outline: 'none', 
                cursor: 'pointer',
                appearance: 'none',
                fontFamily: 'inherit'
              }}
            >
              <option value="local">Local Storage</option>
              <option value="indexedDB" disabled>IndexedDB (WIP)</option>
              <option value="file" disabled>File API (WIP)</option>
            </select>
         </div>

         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)' }}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Base Grid</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <input 
                type="number" 
                value={config.baseGridSize}
                onChange={e => updateConfig({ baseGridSize: parseFloat(e.target.value) || 12 })}
                style={{ 
                  fontSize: '1.2rem', 
                  width: '40px', 
                  background: 'transparent', 
                  color: 'var(--text-primary)', 
                  border: 'none', 
                  padding: 0, 
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <span style={{fontSize: '1.2rem'}}>ft</span>
            </div>
         </div>

         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)', cursor: 'pointer' }}
              onClick={() => updateConfig({ snapToGrid: !config.snapToGrid })}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Snapping</span>
            <span style={{fontSize: '1.2rem', userSelect: 'none'}}>{config.snapToGrid ? 'On' : 'Off'}</span>
         </div>

         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)' }}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Def. Curb Radius</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <input 
                type="number" 
                value={config.pedestrianCurbRadius ?? 15}
                onChange={e => updateConfig({ pedestrianCurbRadius: parseFloat(e.target.value) || 15 })}
                style={{ 
                  fontSize: '1.2rem', 
                  width: '40px', 
                  background: 'transparent', 
                  color: 'var(--text-primary)', 
                  border: 'none', 
                  padding: 0, 
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <span style={{fontSize: '1.2rem'}}>ft</span>
            </div>
         </div>

         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)' }}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Int. Daylight</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <input 
                type="number" 
                value={config.intersectionDaylightDistance ?? 25}
                onChange={e => updateConfig({ intersectionDaylightDistance: parseFloat(e.target.value) || 25 })}
                style={{ 
                  fontSize: '1.2rem', 
                  width: '40px', 
                  background: 'transparent', 
                  color: 'var(--text-primary)', 
                  border: 'none', 
                  padding: 0, 
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <span style={{fontSize: '1.2rem'}}>ft</span>
            </div>
         </div>

         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)' }}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Cosmetic Radius</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <input 
                type="number" 
                value={config.cosmeticCurbRadius ?? 2}
                onChange={e => updateConfig({ cosmeticCurbRadius: parseFloat(e.target.value) || 2 })}
                style={{ 
                  fontSize: '1.2rem', 
                  width: '40px', 
                  background: 'transparent', 
                  color: 'var(--text-primary)', 
                  border: 'none', 
                  padding: 0, 
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <span style={{fontSize: '1.2rem'}}>ft</span>
            </div>
         </div>

         <div className="library-item" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'var(--bg-primary)' }}>
            <span style={{fontSize: '0.8rem', color: 'var(--text-tertiary)'}}>Curb Thickness</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <input 
                type="number" 
                step="0.1"
                value={config.curbThickness ?? 0.5}
                onChange={e => updateConfig({ curbThickness: parseFloat(e.target.value) || 0.5 })}
                style={{ 
                  fontSize: '1.2rem', 
                  width: '40px', 
                  background: 'transparent', 
                  color: 'var(--text-primary)', 
                  border: 'none', 
                  padding: 0, 
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <span style={{fontSize: '1.2rem'}}>ft</span>
            </div>
         </div>

       </div>
    </div>
  );
}

export function LotLibraryCard({ onClickItem, onAdd, onCopy, onDelete }: { onClickItem: (id: string) => void, onAdd: () => void, onCopy: (id: string) => void, onDelete: (id: string, name: string) => void }) {
  const lots = usePlannerStore(state => state.lotClasses);
  // Optional store order tracking (fallback to keys if store architect hasn't implemented it yet)
  const storeOrder = (usePlannerStore as any)((state: any) => state.lotClassOrder) as string[] | undefined;
  const reorderAction = (usePlannerStore as any)((state: any) => state.reorderLotClasses);
  
  const [localOrder, setLocalOrder] = useState<string[]>(storeOrder || Object.keys(lots));

  useEffect(() => {
    if (storeOrder) {
      setLocalOrder(storeOrder);
    } else {
      // Sync local order with any additions/deletions if store doesn't support order arrays natively yet
      const currentKeys = Object.keys(lots);
      setLocalOrder(prev => {
        const valid = prev.filter(k => currentKeys.includes(k));
        const missing = currentKeys.filter(k => !prev.includes(k));
        return [...valid, ...missing];
      });
    }
  }, [lots, storeOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // allow clicking
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = localOrder.indexOf(active.id as string);
      const newIndex = localOrder.indexOf(over?.id as string);
      
      if (reorderAction) {
        reorderAction(oldIndex, newIndex); // Use store action if available
      } else {
        // Fallback local reorder
        const newOrder = [...localOrder];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        setLocalOrder(newOrder);
      }
    }
  }

  return (
    <div className="bento-card card-lots">
       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
         <h2><Shapes /> Lot Typologies</h2>
         <button className="add-btn" onClick={(e) => { e.stopPropagation(); onAdd(); }}><Plus size={16}/></button>
       </div>
       <p style={{marginBottom: '16px'}}>Real estate units and setback rules.</p>
       
       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
         <div className="library-grid auto-fit">
            <SortableContext items={localOrder} strategy={rectSortingStrategy}>
              {localOrder.map(id => {
                 const lot = lots[id];
                 if (!lot) return null;
                 return (
                   <SortableTile key={lot.id} id={lot.id} className="library-item thumbnail-item" onClick={() => onClickItem(lot.id)}>
                     <div className="item-actions">
                       <button onClick={(e) => { e.stopPropagation(); onCopy(lot.id); }} title="Duplicate"><Copy size={14}/></button>
                       <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(lot.id, lot.name); }} title="Delete"><Trash2 size={14}/></button>
                     </div>
                     <MiniLotPreview lot={lot} />
                     <span className="item-name">{lot.name}</span>
                   </SortableTile>
                 );
              })}
            </SortableContext>
            {localOrder.length === 0 && <div className="empty-state">No Lot Types Defined</div>}
         </div>
       </DndContext>
    </div>
  );
}

export function RouteLibraryCard({ onClickItem, onAdd, onCopy, onDelete }: { onClickItem: (id: string) => void, onAdd: () => void, onCopy: (id: string) => void, onDelete: (id: string, name: string) => void }) {
  const routes = usePlannerStore(state => state.routeClasses);
  const config = usePlannerStore(state => state.config);
  
  const storeOrder = (usePlannerStore as any)((state: any) => state.routeClassOrder) as string[] | undefined;
  const reorderAction = (usePlannerStore as any)((state: any) => state.reorderRouteClasses);
  
  const [localOrder, setLocalOrder] = useState<string[]>(storeOrder || Object.keys(routes));

  useEffect(() => {
    if (storeOrder) {
      setLocalOrder(storeOrder);
    } else {
      const currentKeys = Object.keys(routes);
      setLocalOrder(prev => {
        const valid = prev.filter(k => currentKeys.includes(k));
        const missing = currentKeys.filter(k => !prev.includes(k));
        return [...valid, ...missing];
      });
    }
  }, [routes, storeOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = localOrder.indexOf(active.id as string);
      const newIndex = localOrder.indexOf(over?.id as string);
      
      if (reorderAction) {
        reorderAction(oldIndex, newIndex);
      } else {
        const newOrder = [...localOrder];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        setLocalOrder(newOrder);
      }
    }
  }

  return (
    <div className="bento-card card-routes">
       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
         <h2><Map /> Route Library</h2>
         <button className="add-btn" onClick={(e) => { e.stopPropagation(); onAdd(); }}><Plus size={16}/></button>
       </div>
       <p style={{marginBottom: '16px'}}>Cross-sections and street typologies.</p>
       
       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
         <div className="library-grid auto-fit">
            <SortableContext items={localOrder} strategy={rectSortingStrategy}>
              {localOrder.map(id => {
                 const route = routes[id];
                 if (!route) return null;
                 
                 const totalRow = route.crossSection.elements.reduce((acc, el) => acc + el.targetWidth, 0);
                 const isValid = totalRow % (config?.baseGridSize || 12) === 0;
                 const statusColor = isValid ? 'var(--color-success)' : 'var(--color-warning)';
                 return (
                   <SortableTile key={route.id} id={route.id} className="library-item thumbnail-item" onClick={() => onClickItem(route.id)} title={`Total ROW: ${totalRow}'`} style={{ border: `1px solid ${statusColor}` }}>
                     <div className="item-actions">
                       <button onClick={(e) => { e.stopPropagation(); onCopy(route.id); }} title="Duplicate"><Copy size={14}/></button>
                       <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(route.id, route.name); }} title="Delete"><Trash2 size={14}/></button>
                     </div>
                     <MiniRoutePreview route={route} />
                     <span className="item-name">{route.name} <span style={{color: statusColor, fontWeight: 'bold'}}>({totalRow}')</span></span>
                   </SortableTile>
                 );
              })}
            </SortableContext>
            {localOrder.length === 0 && <div className="empty-state">No Route Types Defined</div>}
         </div>
       </DndContext>
    </div>
  );
}

export function TemplateLibraryCard({ onClickItem, onAdd, onCopy, onDelete }: { onClickItem: (id: string) => void, onAdd: () => void, onCopy: (id: string) => void, onDelete: (id: string, name: string) => void }) {
  const templates = usePlannerStore(state => state.blockGroupTemplates);
  
  const storeOrder = (usePlannerStore as any)((state: any) => state.blockGroupTemplateOrder) as string[] | undefined;
  const reorderAction = (usePlannerStore as any)((state: any) => state.reorderBlockGroupTemplates);
  
  const [localOrder, setLocalOrder] = useState<string[]>(storeOrder || Object.keys(templates));

  useEffect(() => {
    if (storeOrder) {
      setLocalOrder(storeOrder);
    } else {
      const currentKeys = Object.keys(templates);
      setLocalOrder(prev => {
        const valid = prev.filter(k => currentKeys.includes(k));
        const missing = currentKeys.filter(k => !prev.includes(k));
        return [...valid, ...missing];
      });
    }
  }, [templates, storeOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = localOrder.indexOf(active.id as string);
      const newIndex = localOrder.indexOf(over?.id as string);
      
      if (reorderAction) {
        reorderAction(oldIndex, newIndex);
      } else {
        const newOrder = [...localOrder];
        const [moved] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, moved);
        setLocalOrder(newOrder);
      }
    }
  }

  return (
    <div className="bento-card card-templates">
       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
         <h2><LayoutTemplate /> BlockGroup Templates</h2>
         <button className="add-btn" onClick={(e) => { e.stopPropagation(); onAdd(); }}><Plus size={16}/></button>
       </div>
       <p style={{marginBottom: '16px'}}>Macro-level topology definitions.</p>
       
       <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
         <div className="library-grid auto-fit">
            <SortableContext items={localOrder} strategy={rectSortingStrategy}>
              {localOrder.map(id => {
                 const tpl = templates[id];
                 if (!tpl) return null;
                 return (
                   <SortableTile key={tpl.id} id={tpl.id} className="library-item thumbnail-item" onClick={() => onClickItem(tpl.id)}>
                     <div className="item-actions">
                       <button onClick={(e) => { e.stopPropagation(); onCopy(tpl.id); }} title="Duplicate"><Copy size={14}/></button>
                       <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(tpl.id, tpl.name); }} title="Delete"><Trash2 size={14}/></button>
                     </div>
                     <div style={{ width: '100%', height: '60px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', marginBottom: '8px' }} />
                     <span className="item-name">{tpl.name}</span>
                   </SortableTile>
                 );
              })}
            </SortableContext>
            {localOrder.length === 0 && <div className="empty-state">No Templates Defined</div>}
         </div>
       </DndContext>
    </div>
  );
}

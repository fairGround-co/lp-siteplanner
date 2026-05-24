import sys

with open('src/components/ui/editors/RouteClassEditor.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Make sure to add the import at the top
import_str = "import { IntersectionNode } from '../IntersectionNode';\n"
if "IntersectionNode" not in code:
    code = code.replace("import { DrillDownLayout } from '../DrillDownLayout';", "import { DrillDownLayout } from '../DrillDownLayout';\n" + import_str)

start_str = "  // --- CANVAS RENDERER ---"
end_str = "  const renderInspector = () => {"

if start_str in code and end_str in code:
    start_idx = code.find(start_str)
    end_idx = code.find(end_str)
    
    new_render_canvas = """  // --- CANVAS RENDERER ---
  const renderCanvas = () => {
    const config = store.config;
    const gridFt = config?.baseGridSize || 10;
    
    const pxPerGrid = 40;
    const pxPerFt = pxPerGrid / gridFt;
    
    const totalWidth = route.crossSection.elements.reduce((acc, el) => acc + el.targetWidth, 0);

    const isValid = totalWidth % (store.config?.baseGridSize || 12) === 0;
    const statusColor = isValid ? 'var(--color-success)' : 'var(--color-warning)';

    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
         {/* HUD Report */}
         <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, background: 'var(--bg-inspector)', border: `2px solid ${statusColor}`, padding: '12px 16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: 'var(--shadow)' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total ROW</span>
            <div style={{display: 'flex', alignItems: 'baseline', gap: '8px'}}>
              <span style={{ color: statusColor, fontSize: '1.5rem', fontWeight: 'bold' }}>{totalWidth}'</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>({route.crossSection.elements.reduce((acc, el) => acc + el.minWidth, 0)}' - {route.crossSection.elements.reduce((acc, el) => acc + el.maxWidth, 0)}')</span>
            </div>
         </div>
         
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
         />

         {/* Scale Reference Bar */}
         <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
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

"""
    
    code = code[:start_idx] + new_render_canvas + code[end_idx:]
    
    # Remove unused getLaneColor
    code = code.replace("import { getLaneColor, getParkingStripeBackground } from '../styleUtils';", "")
    
    with open('src/components/ui/editors/RouteClassEditor.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("SUCCESS")
else:
    print("FAILED TO FIND START OR END")

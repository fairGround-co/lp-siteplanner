import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePlannerStore } from '../../../store/usePlannerStore';
import type { BlockGroupTemplate, TemplateRouteNode, TemplateRouteSegment } from '../../../types';
import { DrillDownLayout } from '../DrillDownLayout';
import { Stage, Layer, Circle, Line } from 'react-konva';
import { MousePointer2, PlusCircle, Link as LinkIcon } from 'lucide-react';

export function BlockGroupTemplateEditor({ id }: { id?: string }) {
  const store = usePlannerStore();
  const [template, setTemplate] = useState<BlockGroupTemplate | null>(null);
  
  // Tools: 'select', 'add_node', 'add_segment'
  const [activeTool, setActiveTool] = useState<'select' | 'add_node' | 'add_segment'>('select');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      const existing = store.blockGroupTemplates[id];
      if (existing) setTemplate(JSON.parse(JSON.stringify(existing)));
    } else {
      // Create default rectangular boundary
      const tl = `node-${Date.now()}-1`;
      const tr = `node-${Date.now()}-2`;
      const br = `node-${Date.now()}-3`;
      const bl = `node-${Date.now()}-4`;
      
      setTemplate({
        id: `tpl-${Date.now()}`,
        name: 'New Block Template',
        anchorNodeIds: [tl, tr, br, bl],
        nodes: [
          { id: tl, position: { x: 200, y: 200 } },
          { id: tr, position: { x: 600, y: 200 } },
          { id: br, position: { x: 600, y: 600 } },
          { id: bl, position: { x: 200, y: 600 } },
        ],
        segments: [],
        lotGroups: [],
        breakRules: []
      });
    }
  }, [id, store.blockGroupTemplates]);

  if (!template) return null;

  const handleSave = () => {
    if (id === 'new') {
      store.addBlockGroupTemplate(template);
    } else {
      store.updateBlockGroupTemplate(template.id, template);
    }
  };

  const updateTemplate = (updates: Partial<BlockGroupTemplate>) => {
    setTemplate(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleStageClick = (e: any) => {
    if (activeTool === 'add_node') {
      const pos = e.target.getStage().getPointerPosition();
      const newNode: TemplateRouteNode = { id: `node-${Date.now()}`, position: { x: pos.x, y: pos.y } };
      updateTemplate({ nodes: [...template.nodes, newNode] });
      setActiveTool('select');
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (activeTool === 'add_segment') {
      if (!selectedNodeId) {
        setSelectedNodeId(nodeId);
      } else {
        if (selectedNodeId !== nodeId) {
          const newSeg: TemplateRouteSegment = {
            id: `seg-${Date.now()}`,
            routeClassId: Object.keys(store.routeClasses)[0] || '', // Fallback
            startNodeId: selectedNodeId,
            endNodeId: nodeId
          };
          updateTemplate({ segments: [...template.segments, newSeg] });
        }
        setSelectedNodeId(null);
        setActiveTool('select');
      }
    } else if (activeTool === 'select') {
      setSelectedNodeId(nodeId);
    }
  };

  const handleNodeDragEnd = (e: any, nodeId: string) => {
    const newPos = { x: e.target.x(), y: e.target.y() };
    const newNodes = template.nodes.map(n => n.id === nodeId ? { ...n, position: newPos } : n);
    updateTemplate({ nodes: newNodes });
  };

  const renderCanvas = () => {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Toolbar */}
        <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8, zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8 }}>
          <button onClick={() => setActiveTool('select')} style={{ background: activeTool === 'select' ? '#4ade80' : 'transparent', color: activeTool === 'select' ? '#000' : '#fff', border: 'none', borderRadius: 4, padding: 8, cursor: 'pointer' }}><MousePointer2 size={16} /></button>
          <button onClick={() => setActiveTool('add_node')} style={{ background: activeTool === 'add_node' ? '#4ade80' : 'transparent', color: activeTool === 'add_node' ? '#000' : '#fff', border: 'none', borderRadius: 4, padding: 8, cursor: 'pointer' }}><PlusCircle size={16} /></button>
          <button onClick={() => setActiveTool('add_segment')} style={{ background: activeTool === 'add_segment' ? '#4ade80' : 'transparent', color: activeTool === 'add_segment' ? '#000' : '#fff', border: 'none', borderRadius: 4, padding: 8, cursor: 'pointer' }}><LinkIcon size={16} /></button>
        </div>

        <Stage width={800} height={800} onClick={handleStageClick} style={{ cursor: activeTool === 'add_node' ? 'crosshair' : 'default' }}>
          <Layer>
             {/* Draw Boundary (Anchors) */}
             {template.anchorNodeIds && (
               <Line
                 points={template.anchorNodeIds.flatMap(id => {
                   const n = template.nodes.find(node => node.id === id);
                   return n ? [n.position.x, n.position.y] : [];
                 })}
                 closed
                 stroke="rgba(255,255,255,0.2)"
                 strokeWidth={2}
                 dash={[10, 5]}
               />
             )}
             
             {/* Draw Segments */}
             {template.segments.map(seg => {
               const n1 = template.nodes.find(n => n.id === seg.startNodeId);
               const n2 = template.nodes.find(n => n.id === seg.endNodeId);
               if (!n1 || !n2) return null;
               return (
                 <Line
                   key={seg.id}
                   points={[n1.position.x, n1.position.y, n2.position.x, n2.position.y]}
                   stroke="#4ade80"
                   strokeWidth={4}
                 />
               );
             })}
             
             {/* Draw Nodes */}
             {template.nodes.map(n => {
               const isAnchor = template.anchorNodeIds.includes(n.id);
               const isSelected = selectedNodeId === n.id;
               return (
                 <Circle
                   key={n.id}
                   x={n.position.x}
                   y={n.position.y}
                   radius={isSelected ? 8 : 6}
                   fill={isAnchor ? '#fff' : '#4ade80'}
                   stroke={isSelected ? '#fff' : 'transparent'}
                   strokeWidth={2}
                   draggable={activeTool === 'select'}
                   onDragEnd={(e) => handleNodeDragEnd(e, n.id)}
                   onClick={(e) => { e.cancelBubble = true; handleNodeClick(n.id); }}
                   onMouseEnter={(e) => {
                     const stage = e.target.getStage();
                     if (stage) stage.container().style.cursor = 'pointer';
                   }}
                   onMouseLeave={(e) => {
                     const stage = e.target.getStage();
                     if (stage) stage.container().style.cursor = activeTool === 'add_node' ? 'crosshair' : 'default';
                   }}
                 />
               );
             })}
          </Layer>
        </Stage>
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
        <h2 style={{margin: '0 0 16px 0', fontSize:'1.2rem'}}>Edit Template</h2>

        <div className="inspector-section">
        <h3>General</h3>
        <div className="inspector-field">
          <label>Name</label>
          <input type="text" value={template.name} onChange={e => updateTemplate({ name: e.target.value })} />
        </div>
      </div>

      <div className="inspector-section">
        <h3>Instructions</h3>
        <p style={{fontSize:'0.85rem', color:'#aaa', lineHeight: 1.5}}>
          1. Select the <strong>+ Node</strong> tool to place internal route nodes on the grid.<br/><br/>
          2. Select the <strong>Link</strong> tool, then click two nodes to connect them with a route segment.<br/><br/>
          3. Drag nodes using the <strong>Select</strong> tool to adjust the topology layout.
        </p>
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

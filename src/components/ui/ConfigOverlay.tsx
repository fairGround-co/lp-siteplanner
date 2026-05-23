import React, { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { X, Download, Upload, ChevronLeft } from 'lucide-react';
import { SystemSettingsCard, LotLibraryCard, RouteLibraryCard, TemplateLibraryCard } from './LibraryCards';
import { ErrorBoundary } from './ErrorBoundary';
import { LotClassEditor } from './editors/LotClassEditor';
import { RouteClassEditor } from './editors/RouteClassEditor';
import { BlockGroupTemplateEditor } from './editors/BlockGroupTemplateEditor';
import './ConfigOverlay.css';

export function ConfigOverlay({ onClose }: { onClose: () => void }) {
  const { exportConfig, importConfig, addLotClass, addRouteClass, addBlockGroupTemplate, deleteLotClass, deleteRouteClass, deleteBlockGroupTemplate } = usePlannerStore();
  const store = usePlannerStore();
  
  // State for drill-down editor
  const [activeEditor, setActiveEditor] = useState<{ type: 'system' | 'lot' | 'route' | 'template', id?: string } | null>(null);
  
  // State for delete modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'lot' | 'route' | 'template', id: string, name: string } | null>(null);

  const handleCopy = (type: 'lot' | 'route' | 'template', id: string) => {
    if (type === 'lot' && store.lotClasses[id]) {
      const orig = store.lotClasses[id];
      addLotClass({ ...orig, id: `lot-${Date.now()}`, name: `${orig.name} (Copy)` });
    } else if (type === 'route' && store.routeClasses[id]) {
      const orig = store.routeClasses[id];
      addRouteClass({ ...orig, id: `route-${Date.now()}`, name: `${orig.name} (Copy)` });
    } else if (type === 'template' && store.blockGroupTemplates[id]) {
      const orig = store.blockGroupTemplates[id];
      addBlockGroupTemplate({ ...orig, id: `tpl-${Date.now()}`, name: `${orig.name} (Copy)` });
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'lot') deleteLotClass(deleteConfirm.id);
    else if (deleteConfirm.type === 'route') deleteRouteClass(deleteConfirm.id);
    else if (deleteConfirm.type === 'template') deleteBlockGroupTemplate(deleteConfirm.id);
    setDeleteConfirm(null);
  };
  
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(exportConfig());
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "siteplanner-config.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          importConfig(event.target.result);
        }
      };
      reader.readAsText(file);
    }
  }

  return (
    <div className="config-overlay-backdrop">
      <div className="config-header">
        {activeEditor ? (
           <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <button className="action-button" onClick={() => setActiveEditor(null)}><ChevronLeft size={20}/> Back to Overview</button>
              <h1>
                 {activeEditor.type === 'system' && 'System Settings'}
                 {activeEditor.type === 'lot' && (activeEditor.id === 'new' ? 'New Lot Typology' : 'Edit Lot Typology')}
                 {activeEditor.type === 'route' && (activeEditor.id === 'new' ? 'New Route Typology' : 'Edit Route Typology')}
                 {activeEditor.type === 'template' && (activeEditor.id === 'new' ? 'New BlockGroup Template' : 'Edit BlockGroup Template')}
              </h1>
           </div>
        ) : (
           <h1>Design System Manager</h1>
        )}
        <div className="header-actions">
           <div id="editor-header-actions" style={{display: 'flex', gap: '8px'}} />
           {!activeEditor && (
             <>
               <label className="action-button">
                 <Upload size={16} /> Import
                 <input type="file" style={{ display: 'none' }} accept=".json" onChange={handleImport} />
               </label>
               <button className="action-button" onClick={handleExport}><Download size={16} /> Export</button>
             </>
           )}
           <button className="action-button close-btn" onClick={() => activeEditor ? setActiveEditor(null) : onClose()}>
             <X size={16} /> Close
           </button>
        </div>
      </div>
      
      {!activeEditor ? (
        <div className="bento-grid">
          <SystemSettingsCard />
          <RouteLibraryCard 
             onClickItem={(id) => setActiveEditor({ type: 'route', id })} 
             onAdd={() => setActiveEditor({ type: 'route', id: 'new' })} 
             onCopy={(id) => handleCopy('route', id)}
             onDelete={(id, name) => setDeleteConfirm({ type: 'route', id, name })}
          />
          <LotLibraryCard 
             onClickItem={(id) => setActiveEditor({ type: 'lot', id })} 
             onAdd={() => setActiveEditor({ type: 'lot', id: 'new' })} 
             onCopy={(id) => handleCopy('lot', id)}
             onDelete={(id, name) => setDeleteConfirm({ type: 'lot', id, name })}
          />
          <TemplateLibraryCard 
             onClickItem={(id) => setActiveEditor({ type: 'template', id })} 
             onAdd={() => setActiveEditor({ type: 'template', id: 'new' })} 
             onCopy={(id) => handleCopy('template', id)}
             onDelete={(id, name) => setDeleteConfirm({ type: 'template', id, name })}
          />
        </div>
      ) : (
        <div className="drill-down-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <ErrorBoundary name={activeEditor.type + " Editor"}>
            {activeEditor.type === 'route' && <RouteClassEditor id={activeEditor.id} />}
            {activeEditor.type === 'lot' && <LotClassEditor id={activeEditor.id} />}
            {activeEditor.type === 'template' && <BlockGroupTemplateEditor id={activeEditor.id} />}
          </ErrorBoundary>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'rgba(30, 30, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px',
            borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: '400px', width: '100%', textAlign: 'center'
          }}>
            <h2 style={{margin: '0 0 16px', fontSize: '1.25rem'}}>Delete Item?</h2>
            <p style={{margin: '0 0 24px', color: 'rgba(255,255,255,0.7)'}}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
            </p>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px 24px', borderRadius: '8px', color: '#fff', cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={confirmDelete} style={{
                background: '#ef4444', border: 'none', padding: '8px 24px', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold'
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

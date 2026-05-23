import { useState, useEffect } from 'react';
import { MapCanvas } from '../components/canvas/MapCanvas';
import { useSubdivisionSolver } from '../components/map/useSubdivisionSolver';
import { ConfigOverlay } from '../components/ui/ConfigOverlay';
import { Settings } from 'lucide-react';

export function MapView() {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isConfigMode, setIsConfigMode] = useState(false);

  // Initialize the background solver hook.
  // As long as MapView is mounted, this hook watches the store and runs the geometry subdivision logic.
  useSubdivisionSolver();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <MapCanvas width={dimensions.width} height={dimensions.height} />
      
      {/* Overlay UI (e.g. tools, properties) would go here and be owned by ui-config */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
        <h2>SitePlanner Geometry Engine</h2>
        <p style={{ margin: 0 }}>Drag the white anchor nodes to warp the Block Group topology.</p>
      </div>

      <button 
        onClick={() => setIsConfigMode(true)}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'sans-serif',
          fontWeight: 500
        }}
      >
        <Settings size={18} /> Configure System
      </button>

      {isConfigMode && <ConfigOverlay onClose={() => setIsConfigMode(false)} />}
    </div>
  );
}

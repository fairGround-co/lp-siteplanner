import { Stage, Layer, Circle, Line } from 'react-konva';
import Konva from 'konva';
import { usePlannerStore } from '../../store/usePlannerStore';
import type { Point } from '../../types';

interface MapCanvasProps {
  width: number;
  height: number;
}

export function MapCanvas({ width, height }: MapCanvasProps) {
  const anchors = usePlannerStore((state) => state.anchors);
  const blockGroups = usePlannerStore((state) => state.blockGroups);
  const updateAnchorPosition = usePlannerStore((state) => state.updateAnchorPosition);
  
  // Render the subdivided lots
  const lots = usePlannerStore((state) => state.lots);

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>, anchorId: string) => {
    // Synchronous update for 60fps mesh warping
    updateAnchorPosition(anchorId, { x: e.target.x(), y: e.target.y() });
  };

  return (
    <Stage width={width} height={height} style={{ backgroundColor: '#1a1a1a' }}>
      <Layer>
        {/* Draw Block Groups (The continuously warped topological mesh) */}
        {Object.values(blockGroups).map((bg) => {
          if (!bg.geometry || !bg.geometry.vertices) return null;
          
          // Flatten vertices for Konva Line (x1, y1, x2, y2, ...)
          const points = bg.geometry.vertices.flatMap((v: Point) => [v.x, v.y]);
          
          return (
            <Line
              key={bg.id}
              points={points}
              closed
              fill="rgba(50, 150, 255, 0.1)"
              stroke="rgba(50, 150, 255, 0.5)"
              strokeWidth={2}
            />
          );
        })}

        {/* Draw Subdivided Lots */}
        {Object.values(lots).map((lot) => {
          if (!lot.geometry || !lot.geometry.vertices) return null;
          
          const points = lot.geometry.vertices.flatMap((v: Point) => [v.x, v.y]);
          
          return (
            <Line
              key={lot.id}
              points={points}
              closed
              fill="rgba(100, 255, 100, 0.2)"
              stroke="rgba(100, 255, 100, 0.8)"
              strokeWidth={1}
            />
          );
        })}

        {/* Draw Anchors (Draggable nodes) */}
        {Object.values(anchors).map((anchor) => (
          <Circle
            key={anchor.id}
            x={anchor.position.x}
            y={anchor.position.y}
            radius={8}
            fill="#ffffff"
            stroke="#333333"
            strokeWidth={2}
            draggable
            onDragMove={(e) => handleDragMove(e, anchor.id)}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'grab';
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'default';
            }}
            onDragStart={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'grabbing';
            }}
            onDragEnd={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'grab';
              handleDragMove(e, anchor.id); // Final commit
            }}
          />
        ))}
      </Layer>
    </Stage>
  );
}

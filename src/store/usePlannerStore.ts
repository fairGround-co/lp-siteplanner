import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { rotatePoint } from '../engine/mathUtils';
import { evaluateBlockGroupGeometry } from '../engine/warpingEngine';
import type {
  SystemConfig,
  RouteClass,
  LotClass,
  AnchorNodeInstance,
  RouteNodeInstance,
  RouteSegmentInstance,
  RouteLineInstance,
  LotInstance,
  LotGroupInstance,
  BlockGroupInstance,
  FreeformLotGroupInstance,
  FreeformRouteSegmentInstance,
  Point
} from '../types';

interface PlannerState {
  config: SystemConfig;

  // --- TEMPLATE LIBRARY ---
  routeClasses: Record<string, RouteClass>;
  lotClasses: Record<string, LotClass>;
  
  // --- THE CONTINUOUS MESH (Top-Level) ---
  anchors: Record<string, AnchorNodeInstance>; 

  // --- INSTANCE DATA (Flat normalized maps) ---
  nodes: Record<string, RouteNodeInstance>;
  segments: Record<string, RouteSegmentInstance>;
  routeLines: Record<string, RouteLineInstance>;
  lots: Record<string, LotInstance>;
  lotGroups: Record<string, LotGroupInstance>;
  blockGroups: Record<string, BlockGroupInstance>;
  
  // --- FREEFORM INSTANCES ---
  freeformLotGroups: Record<string, FreeformLotGroupInstance>;
  freeformSegments: Record<string, FreeformRouteSegmentInstance>;

  // --- ATOMIC ACTIONS ---
  updateAnchorPosition: (anchorId: string, position: Point) => void;
  rotateAnchors: (anchorIds: string[], origin: Point, angleDegrees: number) => void;
  unweldAnchor: (sharedAnchorId: string, blockGroupIdToDetach: string) => void;
  weldAnchors: (targetAnchorId: string, sourceAnchorId: string) => void;
  overrideLotFrontage: (lotId: string, targetSegmentId: string) => void;
  
  // Builders for Freeform entities
  createFreeformSegment: (routeClassId: string, startNodeId: string, endNodeId: string) => void;
  createFreeformLotGroup: (anchorNodeIds: string[]) => void;
}

export const usePlannerStore = create<PlannerState>()(
  immer((set) => ({
    config: {
      baseGridSize: 12,
      snapToGrid: true,
    },

    routeClasses: {},
    lotClasses: {},

    anchors: {},
    nodes: {},
    segments: {},
    routeLines: {},
    lots: {},
    lotGroups: {},
    blockGroups: {},

    freeformLotGroups: {},
    freeformSegments: {},

    // Atomic Actions (Implementations to be fleshed out by geometry-engine and ui-framework)
    updateAnchorPosition: (anchorId, position) => set((state) => {
      if (state.anchors[anchorId]) {
        state.anchors[anchorId].position = position;
        
        // SYNCHRONOUS MESH CASCADE (Topology/Routes only)
        // Find all BlockGroups that share this anchor
        for (const bgId in state.blockGroups) {
          const bg = state.blockGroups[bgId];
          if (bg.anchorNodeIds.includes(anchorId)) {
            bg.geometry = evaluateBlockGroupGeometry(bg, state.anchors);
          }
        }
      }
    }),

    rotateAnchors: (anchorIds, origin, angleDegrees) => set((state) => {
      // Apply mathematical rotation matrix to all specified anchors
      for (const id of anchorIds) {
        const anchor = state.anchors[id];
        if (anchor) {
          anchor.position = rotatePoint(anchor.position, origin, angleDegrees);
        }
      }
      
      // Cascade to block groups
      for (const bgId in state.blockGroups) {
        const bg = state.blockGroups[bgId];
        if (bg.anchorNodeIds.some(id => anchorIds.includes(id))) {
          bg.geometry = evaluateBlockGroupGeometry(bg, state.anchors);
        }
      }
    }),

    unweldAnchor: (sharedAnchorId, blockGroupIdToDetach) => set((state) => {
      const originalAnchor = state.anchors[sharedAnchorId];
      const blockGroup = state.blockGroups[blockGroupIdToDetach];
      
      if (!originalAnchor || !blockGroup) return;
      
      const anchorIndex = blockGroup.anchorNodeIds.indexOf(sharedAnchorId);
      if (anchorIndex === -1) return;
      
      // Clones the shared anchor, creating a new anchor ID
      const newAnchorId = `anchor-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      state.anchors[newAnchorId] = {
        id: newAnchorId,
        position: { ...originalAnchor.position }
      };
      
      // Update the specific blockGroupIdToDetach to point to the new anchor ID.
      blockGroup.anchorNodeIds[anchorIndex] = newAnchorId;
    }),

    weldAnchors: (targetAnchorId, sourceAnchorId) => set((state) => {
      if (!state.anchors[targetAnchorId] || !state.anchors[sourceAnchorId]) return;
      
      // Find all block groups using the sourceAnchorId
      for (const bgId in state.blockGroups) {
        const bg = state.blockGroups[bgId];
        const index = bg.anchorNodeIds.indexOf(sourceAnchorId);
        if (index !== -1) {
          bg.anchorNodeIds[index] = targetAnchorId;
          bg.geometry = evaluateBlockGroupGeometry(bg, state.anchors);
        }
      }
      
      // Delete the source anchor
      delete state.anchors[sourceAnchorId];
    }),

    overrideLotFrontage: (lotId, targetSegmentId) => set((state) => {
      if (state.lots[lotId]) {
        state.lots[lotId].manualFrontageOverrideId = targetSegmentId;
      }
    }),

    createFreeformSegment: (routeClassId, startNodeId, endNodeId) => set((state) => {
      const id = `free-seg-${Date.now()}`;
      state.freeformSegments[id] = { id, routeClassId, startNodeId, endNodeId };
    }),

    createFreeformLotGroup: (anchorNodeIds) => set((state) => {
      const id = `free-group-${Date.now()}`;
      state.freeformLotGroups[id] = {
        id,
        anchorNodeIds,
        geometry: { vertices: [] }, // To be evaluated
        boundarySegmentIds: [],
        subdivisionLogic: { sequence: [], symmetryPreference: 'center' },
        lotIds: []
      };
    })

  }))
);

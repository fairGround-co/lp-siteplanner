import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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
        // The Geometry Engine will hook into this mutation (or listen to it) 
        // to cascade updates to internal nodes and lot geometry.
      }
    }),

    rotateAnchors: (anchorIds, origin, angleDegrees) => set((state) => {
      // Will apply a mathematical rotation matrix to all specified anchors
      // For now, this is a placeholder action to be built by the geometry-engine.
    }),

    unweldAnchor: (sharedAnchorId, blockGroupIdToDetach) => set((state) => {
      // Clones the shared anchor, creating a new anchor ID, and updates
      // the specific blockGroupIdToDetach to point to the new anchor ID.
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

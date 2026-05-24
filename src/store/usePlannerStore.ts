import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { activeStorageAdapter } from './storageAdapter';
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
  BlockGroupTemplate,
  Polygon,
  Point
} from '../types';

interface PlannerState {
  config: SystemConfig;

  // --- TEMPLATE LIBRARY ---
  routeClasses: Record<string, RouteClass>;
  lotClasses: Record<string, LotClass>;
  blockGroupTemplates: Record<string, BlockGroupTemplate>;
  
  // --- CONFIG ACTIONS ---
  updateConfig: (partialConfig: Partial<SystemConfig>) => void;
  addLotClass: (lotClass: LotClass) => void;
  updateLotClass: (id: string, updates: Partial<LotClass>) => void;
  deleteLotClass: (id: string) => void;
  addRouteClass: (routeClass: RouteClass) => void;
  updateRouteClass: (id: string, updates: Partial<RouteClass>) => void;
  deleteRouteClass: (id: string) => void;
  addBlockGroupTemplate: (template: BlockGroupTemplate) => void;
  updateBlockGroupTemplate: (id: string, updates: Partial<BlockGroupTemplate>) => void;
  deleteBlockGroupTemplate: (id: string) => void;
  exportConfig: () => string;
  importConfig: (json: string) => void;

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
  setEvaluatedLots: (lotGroupId: string, lots: Polygon[], overage: Polygon[]) => void;
  
  // Builders for Freeform entities
  createFreeformSegment: (routeClassId: string, startNodeId: string, endNodeId: string) => void;
  createFreeformLotGroup: (anchorNodeIds: string[]) => void;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    immer((set, get) => ({
    config: {
      theme: 'system',
      storageMode: 'local',
      baseGridSize: 12,
      snapToGrid: true,
      parkingStallLength: 18,
      parkingStallWidth: 7,
      cosmeticCurbRadius: 2,
      curbThickness: 0.5,
    },

    routeClasses: {},
    lotClasses: {},
    blockGroupTemplates: {},

    anchors: {},
    nodes: {},
    segments: {},
    routeLines: {},
    lots: {},
    lotGroups: {},
    blockGroups: {},

    freeformLotGroups: {},
    freeformSegments: {},

    // --- CONFIG ACTIONS ---
    updateConfig: (partialConfig) => set((state) => {
      state.config = { ...state.config, ...partialConfig };
    }),
    addLotClass: (lotClass) => set((state) => {
      state.lotClasses[lotClass.id] = lotClass;
    }),
    updateLotClass: (id, updates) => set((state) => {
      if (state.lotClasses[id]) {
        Object.assign(state.lotClasses[id], updates);
      }
    }),
    deleteLotClass: (id) => set((state) => {
      delete state.lotClasses[id];
    }),
    addRouteClass: (routeClass) => set((state) => {
      state.routeClasses[routeClass.id] = routeClass;
    }),
    updateRouteClass: (id, updates) => set((state) => {
      if (state.routeClasses[id]) {
        Object.assign(state.routeClasses[id], updates);
      }
    }),
    deleteRouteClass: (id) => set((state) => {
      delete state.routeClasses[id];
    }),
    addBlockGroupTemplate: (template) => set((state) => {
      state.blockGroupTemplates[template.id] = template;
    }),
    updateBlockGroupTemplate: (id, updates) => set((state) => {
      if (state.blockGroupTemplates[id]) {
        Object.assign(state.blockGroupTemplates[id], updates);
      }
    }),
    deleteBlockGroupTemplate: (id) => set((state) => {
      delete state.blockGroupTemplates[id];
    }),
    exportConfig: () => {
      const state = get();
      const exportData = {
        config: state.config,
        routeClasses: state.routeClasses,
        lotClasses: state.lotClasses,
        blockGroupTemplates: state.blockGroupTemplates
      };
      return JSON.stringify(exportData, null, 2);
    },
    importConfig: (json) => set((state) => {
      try {
        const data = JSON.parse(json);
        if (data.config) state.config = data.config;
        if (data.routeClasses) state.routeClasses = data.routeClasses;
        if (data.lotClasses) state.lotClasses = data.lotClasses;
        if (data.blockGroupTemplates) state.blockGroupTemplates = data.blockGroupTemplates;
      } catch (e) {
        console.error("Failed to import config", e);
      }
    }),

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

    setEvaluatedLots: (lotGroupId, lots, overage) => set((state) => {
      const group = state.lotGroups[lotGroupId];
      if (!group) return;
      
      // 1. Clear out old lots
      for (const oldLotId of group.lotIds) {
        delete state.lots[oldLotId];
      }
      group.lotIds = [];
      
      // 2. Determine classes
      const primaryLotClassId = group.subdivisionLogic.sequence[0]?.lotClassId || 'default-lot-class';
      const overageLotClassId = group.subdivisionLogic.overageLotClassId || primaryLotClassId;
      
      // 3. Instantiate standard lots
      lots.forEach((poly, index) => {
        const lotId = `${lotGroupId}-lot-${Date.now()}-${index}`;
        state.lots[lotId] = {
          id: lotId,
          lotGroupId,
          lotClassId: primaryLotClassId,
          geometry: poly,
          frontageSegmentId: group.boundarySegmentIds[0] || '' // Fallback frontage
        };
        group.lotIds.push(lotId);
      });
      
      // 4. Instantiate overage lots
      overage.forEach((poly, index) => {
        const lotId = `${lotGroupId}-overage-${Date.now()}-${index}`;
        state.lots[lotId] = {
          id: lotId,
          lotGroupId,
          lotClassId: overageLotClassId,
          geometry: poly,
          frontageSegmentId: group.boundarySegmentIds[0] || ''
        };
        group.lotIds.push(lotId);
      });
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

  })),
  {
    name: 'siteplanner-storage',
    storage: createJSONStorage(() => activeStorageAdapter),
  }
));

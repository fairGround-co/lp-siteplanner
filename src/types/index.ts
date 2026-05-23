export interface SystemConfig {
  baseGridSize: number; // Represents an absolute real-world unit (e.g., feet)
  snapToGrid: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  vertices: Point[];
}

export interface Vector2D {
  dx: number;
  dy: number;
}

export interface DisplayStyle {
  fillColor: string;
  strokeColor: string;
  pattern?: 'solid' | 'hatch_diagonal' | 'dots' | 'crosshatch';
  opacity?: number;
}

// ------------------------------------------------------------------
// 1. ROUTES (The Circulation Library)
// ------------------------------------------------------------------

export type RouteElementType = 'drive_lane' | 'parking_lane' | 'sidewalk' | 'lawn_strip';

export interface RouteElement {
  id: string;
  type: RouteElementType;
  targetWidth: number;
  minWidth: number;
  maxWidth: number;
  parkingAngle?: number; // e.g., 0, 45, 90
  displayStyle?: DisplayStyle;
}

export interface RouteCrossSection {
  trafficFlow: 'one_way' | 'two_way';
  // Ordered Left-to-Right looking from Start Node to End Node
  elements: RouteElement[];
}

export interface RouteClass {
  id: string;
  name: string;
  crossSection: RouteCrossSection;
}

// ------------------------------------------------------------------
// 2. LOTS & SETBACKS (The Real Estate Library)
// ------------------------------------------------------------------

export interface SetbackDistance {
  default: number;
  adjacentToLot: number;
  perRouteClass: Record<string, number>; // Overrides default if adjacent to a specific route class
}

export interface FrontagePreference {
  routeClassId: string;
  priority: number; // 1 is highest priority
}

export interface SetbackRules {
  frontageHierarchy: FrontagePreference[];
  front: SetbackDistance;
  rear: SetbackDistance;
  side: SetbackDistance;
}

export interface LotClass {
  id: string;
  name: string;
  use: 'residential' | 'commercial' | 'green_space' | 'civic';
  targetWidths: number[]; // Absolute map units (e.g., 24, 36, 48)
  minWidth: number;
  maxWidth: number;
  minDepth: number;
  maxDepth: number;
  minBuildableWidth: number;
  minBuildableDepth: number;
  splitPreference: 'always_split' | 'never_split' | 'split_if_possible';
  setbacks: SetbackRules;
  displayStyle: DisplayStyle;
}

// ------------------------------------------------------------------
// 3. LAYOUT & SUBDIVISION LOGIC (The Rules)
// ------------------------------------------------------------------

export interface NodeConstraint {
  fromNodeId: string; // The reference node to measure from
  alongSegmentId: string; // The line it rides on
  minDistance?: number;
  maxDistance?: number;
  preferredRatio?: number; // 0.0 to 1.0
  snapToGrid?: boolean;
}

export interface RouteLineConstraint {
  maxAngularDeviation: number; // Keep through-streets relatively straight across blocks
}

export interface LotSequenceItem {
  lotClassId: string;
  quantityMode: 'fixed' | 'fill' | 'proportional';
  fixedCount?: number;
}

export interface LotGroupSubdivisionLogic {
  sequence: LotSequenceItem[];
  symmetryPreference: 'favor_left' | 'favor_right' | 'center' | 'space_between' | 'even_divisions_only';
  sideLineAngle?: number; // Default 90. E.g., 45 for angled townhomes.
  overageLotClassId?: string; // Fills the clipped triangular/sawtooth ends when sideLineAngle !== 90
}

export interface BlockBreakRule {
  maxEdgeLength: number;
  breakRouteClassId: string; // e.g., spawn an 'alley'
  breakPlacement: 'even' | 'max_from_start' | 'max_from_end';
}

// ------------------------------------------------------------------
// 4. MAP INSTANCES (The Warped Reality)
// ------------------------------------------------------------------

// Top-Level Mesh Anchors. Multiple BlockGroups can share an AnchorNode.
export interface AnchorNodeInstance {
  id: string;
  position: Point;
}

// Internal Route Topology
export interface RouteNodeInstance {
  id: string;
  templateId: string; // From the BlockGroupTemplate
  position: Point; // Evaluated/Warped position
  constraints: NodeConstraint[];
}

export interface RouteSegmentInstance {
  id: string;
  routeClassId: string;
  startNodeId: string; // Reference to RouteNodeInstance or AnchorNodeInstance
  endNodeId: string;
}

// Spans across multiple blocks
export interface RouteLineInstance {
  id: string;
  name: string;
  segmentIds: string[];
  constraint: RouteLineConstraint;
}

// Real Estate Instances
export interface LotInstance {
  id: string;
  lotGroupId: string;
  lotClassId: string;
  geometry: Polygon;
  frontageSegmentId: string;
  manualFrontageOverrideId?: string;
}

export interface LotGroupInstance {
  id: string;
  blockGroupId: string;
  templateId: string;
  geometry: Polygon; // Evaluated bounding box after warping
  boundarySegmentIds: string[];
  subdivisionLogic: LotGroupSubdivisionLogic;
  lotIds: string[]; // Dynamically generated children
}

// Freeform Entities (For Plazas and bridging Voids)
export interface FreeformLotGroupInstance {
  id: string;
  anchorNodeIds: string[]; // Bounded by any number of nodes
  geometry: Polygon;
  boundarySegmentIds: string[];
  subdivisionLogic: LotGroupSubdivisionLogic;
  lotIds: string[];
}

export interface FreeformRouteSegmentInstance {
  id: string;
  routeClassId: string;
  startNodeId: string;
  endNodeId: string;
}

export interface ConstraintViolation {
  level: 'variance' | 'error';
  message: string;
  entityId: string; // Lot, Node, or Segment
}

// The Block Group Instance
export interface BlockGroupInstance {
  id: string;
  templateId: string;
  
  // Outer mesh points
  anchorNodeIds: [string, string, string, string]; // TopLeft, TopRight, BottomRight, BottomLeft
  
  geometry: Polygon;
  breakRules: BlockBreakRule[];
  
  // Internal topological hierarchy
  internalNodeIds: string[];
  internalSegmentIds: string[];
  lotGroupIds: string[];
  
  validation: {
    status: 'valid' | 'variance' | 'error';
    violations: ConstraintViolation[];
  };
}

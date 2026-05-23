import { Point, Polygon, LotGroupInstance, LotSequenceItem } from '../types';
import { distance, clipPolygon } from './mathUtils';

function interpolatePoint(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
  };
}

/**
 * Calculates the number of lots that should fit along an edge.
 * Represents the "Renormalization" logic where we add a new lot if the 
 * warped geometry stretches enough.
 */
function calculateLotCount(edgeLength: number, sequence: LotSequenceItem[], minWidth: number): number {
  if (!sequence || sequence.length === 0) return 1;
  const seq = sequence[0]; // Simplification: assuming a single repeating class for now
  
  if (seq.quantityMode === 'fixed' && seq.fixedCount) {
    return seq.fixedCount;
  }
  
  // Fill strategy
  const targetWidth = 24; // In reality, fetch from LotClass targetWidths[0]
  let count = Math.floor(edgeLength / targetWidth);
  if (count === 0) count = 1;
  
  // Can we fit an extra lot without going under minWidth?
  if (edgeLength / (count + 1) >= minWidth) {
    count++;
  }
  
  return count;
}

/**
 * The main subdivision solver.
 * Handles "Fanning" to distribute distortion evenly.
 */
export function subdivideLotGroup(
  lotGroupGeom: Polygon,
  frontageEdge: [Point, Point],
  backEdge: [Point, Point],
  sequence: LotSequenceItem[],
  minWidth: number,
  sideLineAngle?: number
): { lots: Polygon[], overage: Polygon[] } {
  
  if (sideLineAngle && sideLineAngle !== 90) {
    return subdivideSawtooth(lotGroupGeom, frontageEdge, sideLineAngle, sequence, minWidth);
  }

  const frontLen = distance(frontageEdge[0], frontageEdge[1]);
  const lotCount = calculateLotCount(frontLen, sequence, minWidth);
  
  const lots: Polygon[] = [];
  
  // Fanning Math: Distribute points evenly along both the front and back edges.
  // This smoothly absorbs any trapezoidal distortion (where frontLen != backLen).
  for (let i = 0; i < lotCount; i++) {
    const u1 = i / lotCount;
    const u2 = (i + 1) / lotCount;
    
    const pFront1 = interpolatePoint(frontageEdge[0], frontageEdge[1], u1);
    const pFront2 = interpolatePoint(frontageEdge[0], frontageEdge[1], u2);
    
    // Important: Winding order matters. If backEdge is defined in the same direction 
    // as frontageEdge, we interpolate normally. If it's a loop, it might be reversed.
    // We'll assume the inputs are aligned (e.g. Left-to-Right).
    const pBack1 = interpolatePoint(backEdge[0], backEdge[1], u1);
    const pBack2 = interpolatePoint(backEdge[0], backEdge[1], u2);
    
    lots.push({
      // Clockwise or Counter-Clockwise quad
      vertices: [pFront1, pFront2, pBack2, pBack1]
    });
  }
  
  return { lots, overage: [] }; // No overage when purely fanning
}

/**
 * Generates angled lots (e.g. townhomes) and clips them against the lot group boundary.
 */
export function subdivideSawtooth(
  lotGroupGeom: Polygon,
  frontageEdge: [Point, Point],
  sideLineAngleDegrees: number,
  sequence: LotSequenceItem[],
  minWidth: number
): { lots: Polygon[], overage: Polygon[] } {
  const frontLen = distance(frontageEdge[0], frontageEdge[1]);
  const lotCount = calculateLotCount(frontLen, sequence, minWidth);
  
  const lots: Polygon[] = [];
  const overages: Polygon[] = [];
  
  // To correctly implement sawtooth:
  // 1. Generate oversized parallelograms for each lot at the given angle.
  // 2. Use `clipPolygon(parallelogram, lotGroupGeom)` to get the true constrained shape.
  // 3. For the ends of the Lot Group, the intersection will result in triangles.
  // 4. Any clipped geometry whose frontage is < minWidth becomes an 'overage' lot.
  
  // Example stub for the Boolean intersection cascade:
  for (let i = 0; i < lotCount; i++) {
    // const unclippedParallelogram = buildAngledQuad(...);
    // const clippedResult = clipPolygon(unclippedParallelogram, lotGroupGeom);
    // if (isViableLot(clippedResult)) lots.push(clippedResult[0])
    // else overages.push(clippedResult[0])
  }
  
  return { lots, overage: overages };
}

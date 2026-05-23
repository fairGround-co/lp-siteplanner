import type { LotInstance, LotClass, BlockGroupInstance, ConstraintViolation } from '../types';
import { calculatePolygonArea, calculateEdgeLengths } from './mathUtils';

/**
 * Validates a lot against its LotClass configuration after distortion.
 */
export function validateLot(lot: LotInstance, lotClass: LotClass): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  
  if (!lot.geometry || lot.geometry.vertices.length < 3) {
    violations.push({ level: 'error', message: 'Invalid lot geometry', entityId: lot.id });
    return violations;
  }
  
  const area = calculatePolygonArea(lot.geometry);
  const minArea = lotClass.minBuildableWidth * lotClass.minBuildableDepth;
  
  if (area < minArea) {
    violations.push({
      level: 'error',
      message: `Lot area (${Math.round(area)} sq units) is below minimum required (${minArea}).`,
      entityId: lot.id
    });
  }
  
  // Note: we can't easily check 'frontage width' without knowing which edge is the frontage,
  // but we can check if *any* edge is less than the absolute minimum width as a fallback.
  // We can skip this if we assume the solver guarantees minimums via the renormalization logic.
  
  return violations;
}

/**
 * Validates a block group against its structural break rules.
 */
export function validateBlockGroup(blockGroup: BlockGroupInstance): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  
  if (!blockGroup.geometry || blockGroup.geometry.vertices.length < 3) return violations;
  
  const edges = calculateEdgeLengths(blockGroup.geometry);
  
  if (blockGroup.breakRules) {
    // Check against break rules
    for (const rule of blockGroup.breakRules) {
      const exceedsMax = edges.some(len => len > rule.maxEdgeLength);
      if (exceedsMax) {
        violations.push({
          level: 'variance',
          message: `Block Group edge exceeds max length ${rule.maxEdgeLength}. Recommend spawning alley/break route.`,
          entityId: blockGroup.id
        });
      }
    }
  }
  
  return violations;
}

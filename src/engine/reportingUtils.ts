import { Polygon } from '../types';
import { calculatePolygonArea, calculateEdgeLengths, distance } from './mathUtils';

export interface PostDistortionMetrics {
  area: number;
  perimeter: number;
  edgeLengths: number[];
  distortionDelta: number; // For quads: difference between opposite edges + shear difference
  isQuad: boolean;
}

/**
 * Extracts real-time measurements from a warped polygon to surface to the UI.
 * Calculates the 'Distortion Delta' to help users identify excessive fanning.
 */
export function getPostDistortionMetrics(geometry: Polygon): PostDistortionMetrics {
  if (!geometry || !geometry.vertices || geometry.vertices.length < 3) {
    return { area: 0, perimeter: 0, edgeLengths: [], distortionDelta: 0, isQuad: false };
  }
  
  const area = calculatePolygonArea(geometry);
  const edgeLengths = calculateEdgeLengths(geometry);
  const perimeter = edgeLengths.reduce((sum, len) => sum + len, 0);
  
  const isQuad = geometry.vertices.length === 4;
  let distortionDelta = 0;
  
  if (isQuad) {
    // For a quad, opposite edges are 0&2 and 1&3
    const delta1 = Math.abs(edgeLengths[0] - edgeLengths[2]);
    const delta2 = Math.abs(edgeLengths[1] - edgeLengths[3]);
    
    // We measure diagonal differences to detect shear/rhombus distortion
    const diag1 = distance(geometry.vertices[0], geometry.vertices[2]);
    const diag2 = distance(geometry.vertices[1], geometry.vertices[3]);
    const shearDelta = Math.abs(diag1 - diag2);
    
    // The total distortion delta is a combination of fanning (edge length differences)
    // and shear (diagonal differences).
    distortionDelta = Math.max(delta1, delta2) + shearDelta;
  }
  
  return { 
    area: Math.round(area * 100) / 100, 
    perimeter: Math.round(perimeter * 100) / 100, 
    edgeLengths: edgeLengths.map(l => Math.round(l * 100) / 100), 
    distortionDelta: Math.round(distortionDelta * 100) / 100, 
    isQuad 
  };
}

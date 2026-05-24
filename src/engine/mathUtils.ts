// @ts-nocheck
import type { Point, Polygon, Vector2D } from '../types';
import * as d3 from 'd3-polygon';
import polygonClipping from 'polygon-clipping';

/**
 * Converts our Point interface to a tuple for d3-polygon
 */
export function pointToTuple(p: Point): [number, number] {
  return [p.x, p.y];
}

/**
 * Converts a tuple from d3-polygon back to our Point interface
 */
export function tupleToPoint(t: [number, number]): Point {
  return { x: t[0], y: t[1] };
}

/**
 * Converts our Polygon to a d3-polygon array of tuples
 */
export function toD3Polygon(polygon: Polygon): [number, number][] {
  return polygon.vertices.map(pointToTuple);
}

/**
 * Calculates the Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the total area of a polygon using d3-polygon.
 * Returns the absolute value of the area.
 */
export function calculatePolygonArea(polygon: Polygon): number {
  const d3Poly = toD3Polygon(polygon);
  return Math.abs(d3.polygonArea(d3Poly) || 0);
}

/**
 * Returns an array of lengths for each edge of the polygon.
 * [edge0(v0->v1), edge1(v1->v2), ..., edgeN(vN->v0)]
 */
export function calculateEdgeLengths(polygon: Polygon): number[] {
  const vertices = polygon.vertices;
  const lengths: number[] = [];
  if (vertices.length < 2) return lengths;
  
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    lengths.push(distance(p1, p2));
  }
  return lengths;
}

/**
 * Rotates a point around an origin by a given angle in degrees.
 */
export function rotatePoint(point: Point, origin: Point, angleDegrees: number): Point {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  
  return {
    x: origin.x + dx * cosA - dy * sinA,
    y: origin.y + dx * sinA + dy * cosA
  };
}

/**
 * Performs bilinear interpolation to map a normalized coordinate (u, v) where u,v are between 0 and 1
 * to an absolute position within a quadrilateral defined by 4 corner points.
 * 
 * quad is ordered: [TopLeft, TopRight, BottomRight, BottomLeft]
 */
export function interpolateQuad(u: number, v: number, quad: [Point, Point, Point, Point]): Point {
  const [tl, tr, br, bl] = quad;
  
  // Interpolate along the top and bottom edges
  const topX = tl.x + (tr.x - tl.x) * u;
  const topY = tl.y + (tr.y - tl.y) * u;
  
  const bottomX = bl.x + (br.x - bl.x) * u;
  const bottomY = bl.y + (br.y - bl.y) * u;
  
  // Interpolate between the two newly found points
  const x = topX + (bottomX - topX) * v;
  const y = topY + (bottomY - topY) * v;
  
  return { x, y };
}

/**
 * Clips a subject polygon against a clipping polygon using the polygon-clipping library (intersection).
 * Returns an array of resulting Polygons.
 */
export function clipPolygon(subject: Polygon, clipper: Polygon): Polygon[] {
  // polygon-clipping expects coordinates in GeoJSON format: [[[x, y], [x, y], ...]]
  const subjTuple = [toD3Polygon(subject)] as any; 
  const clipTuple = [toD3Polygon(clipper)] as any;
  
  try {
    const result = polygonClipping.intersection(subjTuple, clipTuple);
    if (!result || result.length === 0) return [];
    
    const polygons: Polygon[] = [];
    
    // result is a MultiPolygon: Array<Polygon>, where Polygon is Array<Ring>, where Ring is Array<Position>
    for (const poly of result) {
      const outerRing = poly[0]; // We only care about the outer ring for now
      const vertices = outerRing.map((t: any) => tupleToPoint(t as [number, number]));
      
      // GeoJSON rings are closed (first point === last point). Remove duplicate.
      if (vertices.length > 1 && distance(vertices[0], vertices[vertices.length - 1]) < 0.001) {
          vertices.pop();
      }
      polygons.push({ vertices });
    }
    return polygons;
  } catch (e) {
    console.error("Polygon clipping failed:", e);
    return [];
  }
}

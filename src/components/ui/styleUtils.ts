import type { RouteElement } from '../../types';

export function getLaneColor(type: string): string {
  switch(type) {
    case 'drive_lane': return '#333';
    case 'parking_lane': return '#444';
    case 'sidewalk': return '#aaa';
    case 'lawn_strip': return '#4ade80';
    default: return '#888';
  }
}

export function getParkingStripeBackground(
  elementIndex: number,
  routeElements: RouteElement[],
  isVertical: boolean,
  pLength: number,
  pWidth: number,
  pxPerFt: number
): string {
  const el = routeElements[elementIndex];
  if (el.type !== 'parking_lane') return 'none';
  
  const angle = el.parkingAngle || 0;
  
  let adjacentDirection: 'right' | 'left' | 'yield' = 'right';
  let leftDriveDist = Infinity;
  let rightDriveDist = Infinity;
  let leftDir: 'right' | 'left' | 'yield' | null = null;
  let rightDir: 'right' | 'left' | 'yield' | null = null;
  
  for (let j = elementIndex - 1; j >= 0; j--) {
    if (routeElements[j].type === 'drive_lane') {
      leftDriveDist = elementIndex - j;
      leftDir = routeElements[j].direction || 'right';
      break;
    }
  }
  for (let j = elementIndex + 1; j < routeElements.length; j++) {
    if (routeElements[j].type === 'drive_lane') {
      rightDriveDist = j - elementIndex;
      rightDir = routeElements[j].direction || 'right';
      break;
    }
  }
  if (leftDriveDist < rightDriveDist) adjacentDirection = leftDir || 'right';
  else if (rightDriveDist < leftDriveDist) adjacentDirection = rightDir || 'right';
  else if (leftDir) adjacentDirection = leftDir;

  const flowDir = adjacentDirection === 'yield' ? 'right' : adjacentDirection;
  let carAngle = 0;
  
  if (isVertical) {
    carAngle = flowDir === 'right' ? angle : 180 + angle;
  } else {
    carAngle = flowDir === 'right' ? 90 + angle : 270 + angle;
  }
  
  const lineAngle = angle === 0 ? carAngle + 90 : carAngle;
  const gradAngle = lineAngle - 90;
  const spacingFt = angle === 0 ? pLength : pWidth;
  const spacingPx = spacingFt * pxPerFt;
  
  return `repeating-linear-gradient(${gradAngle}deg, transparent, transparent calc(${spacingPx}px - 2px), rgba(234, 179, 8, 0.5) calc(${spacingPx}px - 2px), rgba(234, 179, 8, 0.5) ${spacingPx}px)`;
}


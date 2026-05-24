import React from 'react';
import type { RouteClass, SystemConfig } from '../../types';
import { getLaneColor, getParkingStripeBackground } from './styleUtils';

export function getLaneDivider(el1: any, el2: any): string {
  if (el1.type === 'drive_lane' && el2.type === 'drive_lane') {
    if (el1.direction !== el2.direction) return '3px double #eab308';
    return '2px dashed rgba(255, 255, 255, 0.5)';
  }
  if (el1.type === 'parking_lane' && el2.type === 'parking_lane') {
    const angle1 = el1.parkingAngle || 0;
    const angle2 = el2.parkingAngle || 0;
    if (angle1 > 0 && angle1 < 90 && angle1 === angle2) {
      return `2px dashed rgba(170, 170, 170, 0.3)`; // Interlocked stagger
    }
    return `2px solid ${getLaneColor('sidewalk')}`;
  }
  return 'none';
}

interface RouteLegProps {
  route: RouteClass;
  oppRoute?: RouteClass;
  isHorizontal: boolean;
  sectionType?: 'leg' | 'setback';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'leg';
  config: SystemConfig;
  pxPerFt: number;
  interactive?: boolean;
  hoveredIndex?: number | null;
  draggedIndex?: number | null;
  onDragStart?: (i: number, isHorizontal: boolean) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (i: number, isHorizontal: boolean) => void;
  onDragEnd?: () => void;
  onClickLane?: (i: number, isHorizontal: boolean) => void;
  onMouseEnterLane?: (i: number, isHorizontal: boolean) => void;
  onMouseLeaveLane?: () => void;
}

export function RouteLeg({
  route,
  oppRoute: _oppRoute,
  isHorizontal,
  sectionType = 'leg',
  position = 'leg',
  config,
  pxPerFt,
  interactive = false,
  hoveredIndex = null,
  draggedIndex = null,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragEnd,
  onClickLane,
  onMouseEnterLane,
  onMouseLeaveLane,
}: RouteLegProps) {
  const px = (ft: number) => Math.round(ft * pxPerFt);
  const cosmeticR = px(config.cosmeticCurbRadius ?? 2);
  const grassColor = getLaneColor('lawn_strip');
  const firstDrive = route.crossSection.elements.findIndex((el) => el.type === 'drive_lane');
  const lastDrive = [...route.crossSection.elements].findLastIndex((el) => el.type === 'drive_lane');

  const effectiveWidths = [...route.crossSection.elements.map(el => el.targetWidth)];
  for (let i = 0; i < route.crossSection.elements.length - 1; i++) {
    const el = route.crossSection.elements[i];
    const nextEl = route.crossSection.elements[i + 1];
    if (el.type === 'parking_lane' && nextEl.type === 'parking_lane') {
      const angle1 = el.parkingAngle || 0;
      const angle2 = nextEl.parkingAngle || 0;
      if (angle1 > 0 && angle1 < 90 && angle1 === angle2) {
        const overlapAmt = (config.parkingStallWidth || 9) * Math.cos(angle1 * Math.PI / 180);
        effectiveWidths[i] -= overlapAmt / 2;
        effectiveWidths[i + 1] -= overlapAmt / 2;
      }
    }
  }

  // Which edge faces the setback/intersection?
  // position='top' → bottom edge; 'left' → right edge; 'right' → left edge; 'bottom' → top edge
  const setbackEdge = position === 'top' ? 'bottom' : position === 'bottom' ? 'top' : position === 'left' ? 'right' : 'left';

  return (
    <div
      className={`lane-layout-${isHorizontal ? 'col' : 'row'}`}
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'column' : 'row',
        width: '100%',
        height: '100%',
      }}
    >
      {route.crossSection.elements.map((el, i) => {
        const effectiveSectionType = sectionType;
        const isHovered = interactive && hoveredIndex === i && sectionType === 'leg';
        const bgColor = getLaneColor(el.type);

        // Outer parking lanes (between sidewalk edge and drive lanes) are daylighted in setback zones
        const isOuterParking = el.type === 'parking_lane' && (i < firstDrive || i > lastDrive);
        const isPreemptedParking = isOuterParking && effectiveSectionType === 'setback';
        const vehic = el.type === 'drive_lane' || (el.type === 'parking_lane' && !isPreemptedParking);

        const prevEl = route.crossSection.elements[i - 1];
        const nextEl = route.crossSection.elements[i + 1];

        const prevOuterParking = prevEl?.type === 'parking_lane' && (i - 1 < firstDrive || i - 1 > lastDrive);
        const prevPreempted = prevOuterParking && effectiveSectionType === 'setback';
        const nextOuterParking = nextEl?.type === 'parking_lane' && (i + 1 < firstDrive || i + 1 > lastDrive);
        const nextPreempted = nextOuterParking && effectiveSectionType === 'setback';

        const prevVehic = prevEl ? prevEl.type === 'drive_lane' || (prevEl.type === 'parking_lane' && !prevPreempted) : false;
        const nextVehic = nextEl ? nextEl.type === 'drive_lane' || (nextEl.type === 'parking_lane' && !nextPreempted) : false;

        const curbWidthPx = px(config.curbThickness ?? 0.5);
        const curb = `${curbWidthPx}px solid ${getLaneColor('sidewalk')}`;

        let bTop = 'none', bBottom = 'none', bLeft = 'none', bRight = 'none';

        if (!vehic) {
          if (prevEl && prevVehic) {
            if (isHorizontal) bTop = curb;
            else bLeft = curb;
          }
          if (nextEl && nextVehic) {
            if (isHorizontal) bBottom = curb;
            else bRight = curb;
          }
          // Rule 3: Curb between preempted parking (grass) and non-preempted parking (leg-facing edge)
          if (isPreemptedParking) {
            if (isHorizontal) {
              if (position === 'left') bLeft = curb;
              else if (position === 'right') bRight = curb;
            } else {
              if (position === 'top') bTop = curb;
              else if (position === 'bottom') bBottom = curb;
            }
          }
        } else {
          if (prevEl && prevVehic) {
            const divider = getLaneDivider(el, prevEl);
            if (isHorizontal) bTop = divider;
            else bLeft = divider;
          }
        }

        // Rule 1: Convex border-radius on preempted parking at drive lane corners (setback)
        // The rounding faces the LEG (non-preempted parking), not the intersection
        // Rule 2: Nibble on active parking at setback junction (leg)
        let brTL = '0', brTR = '0', brBL = '0', brBR = '0';
        const nibbles: React.ReactNode[] = [];

        if (isPreemptedParking && effectiveSectionType === 'setback') {
          // Rule 1: round the corner facing the leg + adjacent to a drive lane
          const prevIsDrive = prevEl?.type === 'drive_lane';
          const nextIsDrive = nextEl?.type === 'drive_lane';
          if (isHorizontal) {
            // horizontal route: prev=above, next=below. Leg-facing edge: position='left'→left, 'right'→right
            if (prevIsDrive && position === 'left') brTL = `${cosmeticR}px`;
            if (prevIsDrive && position === 'right') brTR = `${cosmeticR}px`;
            if (nextIsDrive && position === 'left') brBL = `${cosmeticR}px`;
            if (nextIsDrive && position === 'right') brBR = `${cosmeticR}px`;
          } else {
            // vertical route: prev=left, next=right. Leg-facing edge: position='top'→top, 'bottom'→bottom
            if (prevIsDrive && position === 'top') brTL = `${cosmeticR}px`;
            if (prevIsDrive && position === 'bottom') brBL = `${cosmeticR}px`;
            if (nextIsDrive && position === 'top') brTR = `${cosmeticR}px`;
            if (nextIsDrive && position === 'bottom') brBR = `${cosmeticR}px`;
          }
        }

        if (isOuterParking && !isPreemptedParking && effectiveSectionType === 'leg') {
          // Rule 2: Nibble on active parking in leg at setback junction
          // The edge facing the setback gets a grass nibble where adjacent to lawn_strip
          const prevIsLawn = prevEl?.type === 'lawn_strip';
          const nextIsLawn = nextEl?.type === 'lawn_strip';

          // Determine which CSS corner to nibble based on orientation and position
          // For isHorizontal=true (H route): prev=above, next=below. setbackEdge = left or right
          // For isHorizontal=false (V route): prev=left, next=right. setbackEdge = top or bottom
          const addNibble = (cssCorner: string) => {
            // cssCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
            // Quarter-circle of parking gray at the corner, grass green in the pointed parts outside
            const posStyle: any = {};
            if (cssCorner.includes('top')) posStyle.top = 0; else posStyle.bottom = 0;
            if (cssCorner.includes('left')) posStyle.left = 0; else posStyle.right = 0;
            const ox = cssCorner.includes('left') ? '100%' : '0%';
            const oy = cssCorner.includes('top') ? '100%' : '0%';
            const cw = px(config.curbThickness ?? 0.5);
            
            // To align fluidly with straight border in adjacent cell, the div must overhang into it by cw
            const adjustedPos: any = { ...posStyle };
            if (cssCorner.includes('top')) adjustedPos.top = `-${cw}px`; else adjustedPos.bottom = `-${cw}px`;
            if (cssCorner.includes('left')) adjustedPos.left = `-${cw}px`; else adjustedPos.right = `-${cw}px`;

            nibbles.push(
              <div key={`nibble-${cssCorner}`} style={{
                position: 'absolute', ...adjustedPos,
                width: `${cosmeticR + cw}px`, height: `${cosmeticR + cw}px`,
                background: `radial-gradient(circle at ${ox} ${oy}, transparent ${cosmeticR}px, ${getLaneColor('sidewalk')} ${cosmeticR}px, ${getLaneColor('sidewalk')} ${cosmeticR + cw}px, ${grassColor} ${cosmeticR + cw}px)`,
                pointerEvents: 'none', zIndex: 2,
              }} />
            );
          };

          if (isHorizontal) {
            if (prevIsLawn && setbackEdge === 'right') addNibble('top-right');
            if (prevIsLawn && setbackEdge === 'left') addNibble('top-left');
            if (nextIsLawn && setbackEdge === 'right') addNibble('bottom-right');
            if (nextIsLawn && setbackEdge === 'left') addNibble('bottom-left');
          } else {
            if (prevIsLawn && setbackEdge === 'bottom') addNibble('bottom-left');
            if (prevIsLawn && setbackEdge === 'top') addNibble('top-left');
            if (nextIsLawn && setbackEdge === 'bottom') addNibble('bottom-right');
            if (nextIsLawn && setbackEdge === 'top') addNibble('top-right');
          }
        }

        let bgImage = 'none';
        if (el.type === 'parking_lane' && effectiveSectionType === 'leg') {
          const pLength = config.parkingStallLength || 18;
          const pWidth = config.parkingStallWidth || 7;
          bgImage = getParkingStripeBackground(i, route.crossSection.elements, !isHorizontal, pLength, pWidth, pxPerFt);
        }
        
        if (el.type === 'drive_lane' && effectiveSectionType === 'setback') {
          const dir = el.direction || 'right';
          let hasStopBar = false;
          let sbCss = ''; 
          
          if (isHorizontal) {
            if (position === 'left' && dir === 'right') { hasStopBar = true; sbCss = 'right'; }
            if (position === 'right' && dir === 'left') { hasStopBar = true; sbCss = 'left'; }
          } else {
            if (position === 'top' && dir === 'left') { hasStopBar = true; sbCss = 'bottom'; }
            if (position === 'bottom' && dir === 'right') { hasStopBar = true; sbCss = 'top'; }
          }
          
          if (hasStopBar) {
            const stopBarW = 6;
            const stopBarColor = 'rgba(255,255,255,0.9)';
            const toSide = sbCss === 'right' ? 'left' : sbCss === 'left' ? 'right' : sbCss === 'top' ? 'bottom' : 'top';
            bgImage = `linear-gradient(to ${toSide}, ${stopBarColor} ${stopBarW}px, transparent ${stopBarW}px)`;
          }
        }

        const renderBgColor = isPreemptedParking ? getLaneColor('lawn_strip') : (el as any).displayStyle?.fillColor || bgColor;

        let arrow = null;
        if (el.type === 'drive_lane' && effectiveSectionType === 'leg') {
          const dir = el.direction || 'right';
          if (!isHorizontal) {
            arrow = dir === 'right' ? '↑' : dir === 'left' ? '↓' : '↕';
          } else {
            arrow = dir === 'right' ? '→' : dir === 'left' ? '←' : '↔';
          }
        }

        const hasRadius = isPreemptedParking && (brTL !== '0' || brTR !== '0' || brBL !== '0' || brBR !== '0');

        return (
          <div
            key={el.id}
            draggable={interactive && sectionType === 'leg'}
            onDragStart={(e) => {
              if (interactive && sectionType === 'leg') {
                e.stopPropagation();
                onDragStart?.(i, isHorizontal);
              }
            }}
            onDragOver={(e) => {
              if (interactive && sectionType === 'leg') onDragOver?.(e);
            }}
            onDragEnter={() => {
              if (interactive && sectionType === 'leg') onDragEnter?.(i, isHorizontal);
            }}
            onDragEnd={() => {
              if (interactive && sectionType === 'leg') onDragEnd?.();
            }}
            onClick={() => {
              if (interactive && sectionType === 'leg') onClickLane?.(i, isHorizontal);
            }}
            onMouseEnter={() => {
              if (interactive && sectionType === 'leg') onMouseEnterLane?.(i, isHorizontal);
            }}
            onMouseLeave={() => {
              if (interactive && sectionType === 'leg') onMouseLeaveLane?.();
            }}
            data-type={el.type}
            data-direction={el.direction || 'right'}
            style={{
              flex: `0 0 ${px(effectiveWidths[i])}px`,
              width: isHorizontal ? '100%' : `${px(effectiveWidths[i])}px`,
              height: isHorizontal ? `${px(effectiveWidths[i])}px` : '100%',
              overflow: 'visible',
              cursor: interactive && sectionType === 'leg' ? 'grab' : 'default',
              opacity: interactive && draggedIndex === i ? 0.5 : 1,
              transition: 'all 0.2s ease',
              backgroundColor: hasRadius ? getLaneColor('parking_lane') : 'transparent',
              border: 'none',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="route-leg-element"
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: renderBgColor,
                backgroundImage: bgImage,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: isHorizontal ? 'row' : 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                borderTop: bTop,
                borderBottom: bBottom,
                borderLeft: bLeft,
                borderRight: bRight,
                borderRadius: `${brTL} ${brTR} ${brBR} ${brBL}`,
              }}
            >
              {(!isHorizontal && sectionType === 'leg') && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
                  {arrow && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>{arrow}</span>}
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{Math.round(effectiveWidths[i] * 10) / 10}'</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    {el.type.replace('_', ' ')}
                  </span>
                </div>
              )}
              {(isHorizontal && sectionType === 'leg') && (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', pointerEvents: 'none' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>
                    {el.type.replace('_', ' ')}
                  </span>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{Math.round(effectiveWidths[i] * 10) / 10}'</span>
                  {arrow && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem' }}>{arrow}</span>}
                </div>
              )}
              {nibbles}
              {isHovered && (
                <div style={{ position: 'absolute', bottom: '40px', background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', color: '#4ade80', fontSize: '0.9rem', width: 'max-content', textAlign: 'center', pointerEvents: 'none', zIndex: 10 }}>
                  Min {el.minWidth}' / Max {el.maxWidth}'
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function IntersectionNode({
  routeH,
  routeV,
  config,
  pxPerFt,
  anchorX,
  anchorY,
  ...interactionProps
}: any) {
  const px = (ft: number) => Math.round(ft * pxPerFt);
  const N_V = routeV.crossSection.elements.length;
  const N_H = routeH.crossSection.elements.length;
  const curb = `${px(config.curbThickness ?? 0.5)}px solid ${getLaneColor('sidewalk')}`;

  const firstDriveIndexH = routeH.crossSection.elements.findIndex((el: any) => el.type === 'drive_lane');
  const lastDriveIndexH = [...routeH.crossSection.elements].findLastIndex((el: any) => el.type === 'drive_lane');
  const firstDriveIndexV = routeV.crossSection.elements.findIndex((el: any) => el.type === 'drive_lane');
  const lastDriveIndexV = [...routeV.crossSection.elements].findLastIndex((el: any) => el.type === 'drive_lane');


  const getIntCellType = (v_i: number, h_i: number) => {
    const v_el = routeV.crossSection.elements[v_i];
    const h_el = routeH.crossSection.elements[h_i];
    if (!v_el || !h_el) return 'none';

    const isInsideDrivingBox = v_i >= firstDriveIndexV && v_i <= lastDriveIndexV && h_i >= firstDriveIndexH && h_i <= lastDriveIndexH;

    // Outer parking renders as grass only when BOTH axes are "outer" (outside the driving box).
    // This prevents the median lawn_strip from extending through outer parking,
    // while keeping corner daylighting green where two outer parking lanes overlap.
    const isOuterV = v_i < firstDriveIndexV || v_i > lastDriveIndexV;
    const isOuterH = h_i < firstDriveIndexH || h_i > lastDriveIndexH;
    const vIsOuterParking = v_el.type === 'parking_lane' && isOuterV;
    const hIsOuterParking = h_el.type === 'parking_lane' && isOuterH;
    const vType = (vIsOuterParking && isOuterH) ? 'lawn_strip' : v_el.type;
    const hType = (hIsOuterParking && isOuterV) ? 'lawn_strip' : h_el.type;

    const has = (t: string) => vType === t || hType === t;
    if (has('sidewalk')) {
      if (has('drive_lane')) return 'crosswalk';
      return 'sidewalk';
    }
    if (isInsideDrivingBox) return 'drive_lane';
    if (has('drive_lane')) return 'drive_lane';
    if (has('parking_lane')) return 'drive_lane';
    if (has('lawn_strip')) return 'lawn_strip';
    return 'none';
  };

  const cosmeticR = px(config.cosmeticCurbRadius ?? 2);

  const isCellVehic = (t: string) => t === 'drive_lane' || t === 'parking_lane' || t === 'crosswalk';

  // Helper to safely check if a cell at (v, h) is vehicular
  const isCellVehicAt = (v: number, h: number) => {
    if (v < 0 || v >= N_V || h < 0 || h >= N_H) return false;
    return isCellVehic(getIntCellType(v, h));
  };

  const cells: React.ReactNode[] = [];
  routeV.crossSection.elements.forEach((v_el: any, v_i: number) => {
    routeH.crossSection.elements.forEach((h_el: any, h_i: number) => {
      const type = getIntCellType(v_i, h_i);
      const vehic = isCellVehic(type);
      let bg = getLaneColor(type === 'crosswalk' ? 'drive_lane' : type);
      let bgImage = 'none';
      if (type === 'crosswalk') {
        const isVertDrive = v_el.type === 'drive_lane';
        const stripeColor = 'rgba(255,255,255,0.7)';
        bgImage = `repeating-linear-gradient(${isVertDrive ? '90deg' : '0deg'}, transparent, transparent 6px, ${stripeColor} 6px, ${stripeColor} 14px)`;
      }

      let bTop = 'none', bBottom = 'none', bLeft = 'none', bRight = 'none';
      const isFarSideH = h_i > lastDriveIndexH;
      if (!vehic) {
        let tVehic = false;
        if (h_i > 0) tVehic = isCellVehic(getIntCellType(v_i, h_i - 1));
        if (tVehic) bTop = curb;

        let bVehic2 = false;
        if (h_i < N_H - 1) bVehic2 = isCellVehic(getIntCellType(v_i, h_i + 1));
        if (bVehic2) bBottom = curb;

        let lVehic = false;
        if (v_i > 0) lVehic = isCellVehic(getIntCellType(v_i - 1, h_i));
        if (lVehic) bLeft = curb;

        let rVehic = false;
        if (v_i < N_V - 1) rVehic = isCellVehic(getIntCellType(v_i + 1, h_i));
        if (rVehic) bRight = curb;
      } else {
        if (isFarSideH) {
          const prev_h_el = routeH.crossSection.elements[h_i - 1];
          if (prev_h_el && h_i > 0) {
            const tType = getIntCellType(v_i, h_i - 1);
            if (isCellVehic(tType)) bTop = getLaneDivider(h_el, prev_h_el);
          }
        }
      }

      // Rule 4: Convex border-radius on lawn_strip cells where two perpendicular
      // edge-adjacent cells are vehicular (drive_lane/crosswalk)
      let cellRadius = '';
      if (type === 'lawn_strip') {
        const topV = isCellVehicAt(v_i, h_i - 1);
        const botV = isCellVehicAt(v_i, h_i + 1);
        const leftV = isCellVehicAt(v_i - 1, h_i);
        const rightV = isCellVehicAt(v_i + 1, h_i);
        const rTL = (topV && leftV) ? `${cosmeticR}px` : '0';
        const rTR = (topV && rightV) ? `${cosmeticR}px` : '0';
        const rBR = (botV && rightV) ? `${cosmeticR}px` : '0';
        const rBL = (botV && leftV) ? `${cosmeticR}px` : '0';
        if (rTL !== '0' || rTR !== '0' || rBR !== '0' || rBL !== '0') {
          cellRadius = `${rTL} ${rTR} ${rBR} ${rBL}`;
        }
      }

      let bgPosX = 0;
      let bgPosY = 0;
      if (type === 'crosswalk') {
        const accumW = routeV.crossSection.elements.slice(0, v_i).reduce((sum: number, el: any) => sum + el.targetWidth, 0);
        const accumH = routeH.crossSection.elements.slice(0, h_i).reduce((sum: number, el: any) => sum + el.targetWidth, 0);
        bgPosX = px(accumW);
        bgPosY = px(accumH);
      }

      // Add a backing cell behind rounded lawn_strip to prevent grid background bleed
      if (cellRadius) {
        cells.push(
          <div
            key={`int-bg-${v_i}-${h_i}`}
            style={{
              gridRow: h_i + 3,
              gridColumn: v_i + 3,
              backgroundColor: getLaneColor('drive_lane'),
              zIndex: 0,
            }}
          />
        );
      }
      cells.push(
        <div
          key={`int-${v_i}-${h_i}`}
          style={{
            gridRow: h_i + 3,
            gridColumn: v_i + 3,
            backgroundColor: bg,
            backgroundImage: bgImage,
            backgroundPosition: `${-bgPosX}px ${-bgPosY}px`,
            borderTop: bTop, borderBottom: bBottom, borderLeft: bLeft, borderRight: bRight,
            boxSizing: 'border-box',
            ...(cellRadius ? { borderRadius: cellRadius, position: 'relative' as const, zIndex: 1 } : {}),
          }}
        />
      );
    });
  });

  const curbRadius = routeH.curbRadius ?? config.pedestrianCurbRadius ?? 15;
  const pedRadius = config.pedestrianCurbRadius ?? 15;
  const baseRadius = Math.max(curbRadius, pedRadius);
  const stripeRadius = pedRadius;
  const curbColor = getLaneColor('sidewalk');
  const stripeW = 4; // stop line / stripe width in px
  const apronColor = '#d1d5db'; // solid gray matching both stripes and border

  const renderApron = (key: string, gridRow: number, gridCol: number, pos: string) => {
    const sr = px(stripeRadius);
    const br = px(baseRadius);

    let maskCircleAt = '0% 0%';
    let bRadius = '';
    let bTop = 'none', bBottom = 'none', bLeft = 'none', bRight = 'none';
    let hatchAngle = 45;

    if (pos === 'bottom-right') {
      maskCircleAt = '0% 0%';
      bRadius = `0 0 ${sr}px 0`;
      bBottom = `${stripeW}px solid ${apronColor}`;
      bRight = `${stripeW}px solid ${apronColor}`;
      hatchAngle = 45;
    } else if (pos === 'bottom-left') {
      maskCircleAt = '100% 0%';
      bRadius = `0 0 0 ${sr}px`;
      bBottom = `${stripeW}px solid ${apronColor}`;
      bLeft = `${stripeW}px solid ${apronColor}`;
      hatchAngle = -45;
    } else if (pos === 'top-right') {
      maskCircleAt = '0% 100%';
      bRadius = `0 ${sr}px 0 0`;
      bTop = `${stripeW}px solid ${apronColor}`;
      bRight = `${stripeW}px solid ${apronColor}`;
      hatchAngle = -45;
    } else if (pos === 'top-left') {
      maskCircleAt = '100% 100%';
      bRadius = `${sr}px 0 0 0`;
      bTop = `${stripeW}px solid ${apronColor}`;
      bLeft = `${stripeW}px solid ${apronColor}`;
      hatchAngle = 45;
    }

    const hatch = `repeating-linear-gradient(${hatchAngle}deg, ${apronColor}, ${apronColor} ${stripeW}px, transparent ${stripeW}px, transparent 12px)`;
    const curbThick = px(config.curbThickness ?? 0.5);

    return (
      <div key={key} style={{ gridRow, gridColumn: gridCol, position: 'relative', zIndex: 10 }}>
        {/* Masked container for the apron area */}
        <div
          style={{
            position: 'absolute',
            ...(pos.includes('bottom') ? { bottom: 0 } : { top: 0 }),
            ...(pos.includes('right') ? { right: 0 } : { left: 0 }),
            width: `${br}px`, height: `${br}px`,
            maskImage: `radial-gradient(circle at ${maskCircleAt}, transparent ${br + 0.5}px, black ${br + 0.5}px)`,
            WebkitMaskImage: `radial-gradient(circle at ${maskCircleAt}, transparent ${br + 0.5}px, black ${br + 0.5}px)`,
            pointerEvents: 'none',
          }}
        >
          {/* 1. Background */}
          <div style={{ position: 'absolute', inset: 0, backgroundColor: getLaneColor('drive_lane') }} />
          
          {/* 2 & 3. Outer curve + tangents (borders) WITH Striping (hatch) masked inside */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: hatch,
            borderTop: bTop, borderBottom: bBottom, borderLeft: bLeft, borderRight: bRight,
            borderRadius: bRadius, boxSizing: 'border-box'
          }} />
          
          {/* 4. Inner curve (curb color) on top of everything */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(circle at ${maskCircleAt}, transparent ${br}px, ${curbColor} ${br}px, ${curbColor} ${br + curbThick}px, transparent ${br + curbThick}px)`
          }} />
        </div>
      </div>
    );
  };

  // Render aprons at the four corners of the driving box.
  // Each apron sits on the non-drive cell just outside the driving box corner.
  // For routes where drive lanes start at index 0 or end at the last index,
  // the apron is placed on the setback column/row instead (gridRow/Col 2 or N+3).
  const apronRowTop = firstDriveIndexH > 0 ? 3 + firstDriveIndexH - 1 : 2;
  const apronRowBot = lastDriveIndexH < N_H - 1 ? 3 + lastDriveIndexH + 1 : N_H + 3;
  const apronColLeft = firstDriveIndexV > 0 ? 3 + firstDriveIndexV - 1 : 2;
  const apronColRight = lastDriveIndexV < N_V - 1 ? 3 + lastDriveIndexV + 1 : N_V + 3;

  cells.push(renderApron('apron-nw', apronRowTop, apronColLeft, 'bottom-right'));
  cells.push(renderApron('apron-ne', apronRowTop, apronColRight, 'bottom-left'));
  cells.push(renderApron('apron-sw', apronRowBot, apronColLeft, 'top-right'));
  cells.push(renderApron('apron-se', apronRowBot, apronColRight, 'top-left'));

  const setbackDist = config.intersectionDaylightDistance ?? 25;
  
  const leftArm = anchorX !== undefined ? Math.max(0, anchorX - px(setbackDist)) + 'px' : '1fr';
  const topArm = anchorY !== undefined ? Math.max(0, anchorY - px(setbackDist)) + 'px' : '1fr';
  
  const getTrackSizes = (elements: any[]) => {
    const sizes = elements.map(el => px(el.targetWidth));
    for (let i = 0; i < elements.length - 1; i++) {
      const el = elements[i];
      const nextEl = elements[i + 1];
      if (el.type === 'parking_lane' && nextEl.type === 'parking_lane') {
        const angle1 = el.parkingAngle || 0;
        const angle2 = nextEl.parkingAngle || 0;
        if (angle1 > 0 && angle1 < 90 && angle1 === angle2) {
          const rad = angle1 * Math.PI / 180;
          const stallWidth = config.parkingStallWidth || 9;
          const overlapPx = px(stallWidth * Math.cos(rad));
          const half = Math.round(overlapPx / 2);
          sizes[i] -= half;
          sizes[i + 1] -= (overlapPx - half);
        }
      }
    }
    return sizes.map(sz => `${sz}px`).join(' ');
  };

  const gridCols = `${leftArm} ${px(setbackDist)}px ${getTrackSizes(routeV.crossSection.elements)} ${px(setbackDist)}px 1fr`;
  const gridRows = `${topArm} ${px(setbackDist)}px ${getTrackSizes(routeH.crossSection.elements)} ${px(setbackDist)}px 1fr`;

  return (
    <div style={{ display: 'grid', width: '100%', height: '100%', gridTemplateColumns: gridCols, gridTemplateRows: gridRows, filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.5))' }}>
      <div style={{ gridRow: 1, gridColumn: `3 / span ${N_V}`, zIndex: 10 }}>
        <RouteLeg route={routeV} oppRoute={routeH} isHorizontal={false} position="top" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>
      <div style={{ gridRow: 2, gridColumn: `3 / span ${N_V}`, zIndex: 5 }}>
        <RouteLeg route={routeV} oppRoute={routeH} isHorizontal={false} sectionType="setback" position="top" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>

      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: 1, zIndex: 10 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} position="left" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>
      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: 2, zIndex: 5 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} sectionType="setback" position="left" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>

      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: N_V + 3, zIndex: 5 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} sectionType="setback" position="right" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>
      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: N_V + 4, zIndex: 10 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} position="right" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>

      <div style={{ gridRow: N_H + 3, gridColumn: `3 / span ${N_V}`, zIndex: 5 }}>
        <RouteLeg route={routeV} oppRoute={routeH} isHorizontal={false} sectionType="setback" position="bottom" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>
      <div style={{ gridRow: N_H + 4, gridColumn: `3 / span ${N_V}`, zIndex: 10 }}>
        <RouteLeg route={routeV} oppRoute={routeH} isHorizontal={false} position="bottom" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>

      {cells}
    </div>
  );
}

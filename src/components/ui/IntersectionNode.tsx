import React from 'react';
import type { RouteClass, RouteElement, SystemConfig } from '../../types';
import { getLaneColor, getParkingStripeBackground } from './styleUtils';

export function getLaneDivider(el1: RouteElement, el2: RouteElement) {
  if (!el1 || !el2) return 'none';
  const isOpposite = el1.type === 'drive_lane' && el2.type === 'drive_lane' && el1.direction !== el2.direction;
  const isSame = el1.type === 'drive_lane' && el2.type === 'drive_lane' && el1.direction === el2.direction;
  if (isOpposite) return '3px double #eab308';
  if (isSame) return '2px dashed rgba(255,255,255,0.5)';
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
  const px = (ft: number) => ft * pxPerFt;
  const cosmeticR = px(config.cosmeticCurbRadius ?? 2);
  const grassColor = getLaneColor('lawn_strip');
  const firstDrive = route.crossSection.elements.findIndex((el) => el.type === 'drive_lane');
  const lastDrive = [...route.crossSection.elements].findLastIndex((el) => el.type === 'drive_lane');

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

        const curb = `${px(0.5)}px solid ${getLaneColor('sidewalk')}`;

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
          // Rule 3: Curb line between preempted parking grass and lawn strip
          if (isPreemptedParking) {
            if (prevEl?.type === 'lawn_strip') {
              if (isHorizontal) bTop = curb;
              else bLeft = curb;
            }
            if (nextEl?.type === 'lawn_strip') {
              if (isHorizontal) bBottom = curb;
              else bRight = curb;
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
        // Rule 2: Nibble on active parking at setback junction (leg)
        let brTL = '0', brTR = '0', brBL = '0', brBR = '0';
        const nibbles: React.ReactNode[] = [];

        if (isPreemptedParking && effectiveSectionType === 'setback') {
          // Rule 1: round the corner facing the intersection + adjacent to a drive lane
          const prevIsDrive = prevEl?.type === 'drive_lane';
          const nextIsDrive = nextEl?.type === 'drive_lane';
          if (isHorizontal) {
            // horizontal route: prev=above, next=below, setbackEdge is left or right
            if (prevIsDrive && setbackEdge === 'right') brTR = `${cosmeticR}px`;
            if (prevIsDrive && setbackEdge === 'left') brTL = `${cosmeticR}px`;
            if (nextIsDrive && setbackEdge === 'right') brBR = `${cosmeticR}px`;
            if (nextIsDrive && setbackEdge === 'left') brBL = `${cosmeticR}px`;
          } else {
            // vertical route: prev=left, next=right, setbackEdge is top or bottom
            if (prevIsDrive && setbackEdge === 'bottom') brBL = `${cosmeticR}px`;
            if (prevIsDrive && setbackEdge === 'top') brTL = `${cosmeticR}px`;
            if (nextIsDrive && setbackEdge === 'bottom') brBR = `${cosmeticR}px`;
            if (nextIsDrive && setbackEdge === 'top') brTR = `${cosmeticR}px`;
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
            // The radial gradient origin is at the corner, transparent inside radius, grass outside
            const posStyle: any = {};
            if (cssCorner.includes('top')) posStyle.top = 0; else posStyle.bottom = 0;
            if (cssCorner.includes('left')) posStyle.left = 0; else posStyle.right = 0;
            const ox = cssCorner.includes('left') ? '0%' : '100%';
            const oy = cssCorner.includes('top') ? '0%' : '100%';
            nibbles.push(
              <div key={`nibble-${cssCorner}`} style={{
                position: 'absolute', ...posStyle,
                width: `${cosmeticR}px`, height: `${cosmeticR}px`,
                background: `radial-gradient(circle at ${ox} ${oy}, transparent ${cosmeticR}px, ${grassColor} ${cosmeticR}px)`,
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
              flex: `0 0 ${px(el.targetWidth)}px`,
              width: isHorizontal ? '100%' : `${px(el.targetWidth)}px`,
              height: isHorizontal ? `${px(el.targetWidth)}px` : '100%',
              overflow: 'visible',
              backgroundColor: renderBgColor,
              backgroundImage: bgImage,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: isHorizontal ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: interactive && sectionType === 'leg' ? 'grab' : 'default',
              opacity: interactive && draggedIndex === i ? 0.5 : 1,
              transition: 'all 0.2s ease',
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
                <span style={{ color: 'white', fontWeight: 'bold' }}>{el.targetWidth}'</span>
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
                <span style={{ color: 'white', fontWeight: 'bold' }}>{el.targetWidth}'</span>
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
  ...interactionProps
}: any) {
  const px = (ft: number) => ft * pxPerFt;
  const N_V = routeV.crossSection.elements.length;
  const N_H = routeH.crossSection.elements.length;
  const curb = `${px(0.5)}px solid ${getLaneColor('sidewalk')}`;

  const firstDriveIndexH = routeH.crossSection.elements.findIndex((el: any) => el.type === 'drive_lane');
  const lastDriveIndexH = [...routeH.crossSection.elements].findLastIndex((el: any) => el.type === 'drive_lane');
  const firstDriveIndexV = routeV.crossSection.elements.findIndex((el: any) => el.type === 'drive_lane');
  const lastDriveIndexV = [...routeV.crossSection.elements].findLastIndex((el: any) => el.type === 'drive_lane');

  // Outer parking lanes are those outside the driving box (closer to sidewalk than to median)
  const isOuterParkingV = (idx: number) => {
    const el = routeV.crossSection.elements[idx];
    return el?.type === 'parking_lane' && (idx < firstDriveIndexV || idx > lastDriveIndexV);
  };
  const isOuterParkingH = (idx: number) => {
    const el = routeH.crossSection.elements[idx];
    return el?.type === 'parking_lane' && (idx < firstDriveIndexH || idx > lastDriveIndexH);
  };

  const getIntCellType = (v_i: number, h_i: number) => {
    const v_el = routeV.crossSection.elements[v_i];
    const h_el = routeH.crossSection.elements[h_i];
    if (!v_el || !h_el) return 'none';

    const isInsideDrivingBox = v_i >= firstDriveIndexV && v_i <= lastDriveIndexV && h_i >= firstDriveIndexH && h_i <= lastDriveIndexH;

    // Treat outer parking lanes as non-vehicular (daylighted to grass)
    const vIsOuterParking = isOuterParkingV(v_i);
    const hIsOuterParking = isOuterParkingH(h_i);
    // Effective types: outer parking acts like lawn_strip
    const vType = vIsOuterParking ? 'lawn_strip' : v_el.type;
    const hType = hIsOuterParking ? 'lawn_strip' : h_el.type;

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
        bgImage = `repeating-linear-gradient(${isVertDrive ? '90deg' : '0deg'}, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 14px)`;
      }

      let bTop = 'none', bBottom = 'none', bLeft = 'none', bRight = 'none';
      const isFarSideH = h_i > lastDriveIndexH;
      if (!vehic) {
        let tVehic = false;
        if (h_i > 0) tVehic = isCellVehic(getIntCellType(v_i, h_i - 1));
        else tVehic = v_el.type === 'drive_lane';
        if (tVehic) bTop = curb;

        let bVehic2 = false;
        if (h_i < N_H - 1) bVehic2 = isCellVehic(getIntCellType(v_i, h_i + 1));
        if (bVehic2) bBottom = curb;

        let lVehic = false;
        if (v_i > 0) lVehic = isCellVehic(getIntCellType(v_i - 1, h_i));
        else lVehic = h_el.type === 'drive_lane' || (h_el.type === 'parking_lane' && isFarSideH);
        if (lVehic) bLeft = curb;

        let rVehic = false;
        if (v_i < N_V - 1) rVehic = isCellVehic(getIntCellType(v_i + 1, h_i));
        else rVehic = h_el.type === 'drive_lane' || (h_el.type === 'parking_lane' && isFarSideH);
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

      cells.push(
        <div
          key={`int-${v_i}-${h_i}`}
          style={{
            gridRow: h_i + 3,
            gridColumn: v_i + 3,
            backgroundColor: bg,
            backgroundImage: bgImage,
            borderTop: bTop, borderBottom: bBottom, borderLeft: bLeft, borderRight: bRight,
            boxSizing: 'border-box',
            ...(cellRadius ? { borderRadius: cellRadius } : {}),
          }}
        />
      );
    });
  });

  const curbRadius = routeH.curbRadius ?? config.pedestrianCurbRadius ?? 15;
  const pedRadius = config.pedestrianCurbRadius ?? 15;
  const baseRadius = Math.max(curbRadius, pedRadius);
  const stripeRadius = pedRadius;

  const renderApron = (key: string, gridRow: number, gridCol: number, pos: string) => {
    let circleAt = '0% 0%';
    let maskCircleAt = '0% 0%';
    let stripeGradient = '';
    let maskLinear = '';

    if (pos === 'bottom-right') {
      circleAt = '0% 0%'; maskCircleAt = '0% 0%';
      stripeGradient = `radial-gradient(circle at calc(100% - ${px(stripeRadius)}px) calc(100% - ${px(stripeRadius)}px), transparent calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) ${px(stripeRadius)}px, transparent ${px(stripeRadius)}px), linear-gradient(to top, rgba(255,255,255,0.4) 4px, transparent 4px), linear-gradient(to left, rgba(255,255,255,0.4) 4px, transparent 4px), repeating-linear-gradient(45deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 4px, transparent 4px, transparent 12px)`;
      maskLinear = `radial-gradient(circle at calc(100% - ${px(stripeRadius)}px) calc(100% - ${px(stripeRadius)}px), black ${px(stripeRadius - 0.2)}px, transparent ${px(stripeRadius - 0.2)}px), linear-gradient(to bottom, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px)), linear-gradient(to right, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px))`;
    } else if (pos === 'bottom-left') {
      circleAt = '100% 0%'; maskCircleAt = '100% 0%';
      stripeGradient = `radial-gradient(circle at ${px(stripeRadius)}px calc(100% - ${px(stripeRadius)}px), transparent calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) ${px(stripeRadius)}px, transparent ${px(stripeRadius)}px), linear-gradient(to top, rgba(255,255,255,0.4) 4px, transparent 4px), linear-gradient(to right, rgba(255,255,255,0.4) 4px, transparent 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 4px, transparent 4px, transparent 12px)`;
      maskLinear = `radial-gradient(circle at ${px(stripeRadius)}px calc(100% - ${px(stripeRadius)}px), black ${px(stripeRadius - 0.2)}px, transparent ${px(stripeRadius - 0.2)}px), linear-gradient(to bottom, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px)), linear-gradient(to left, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px))`;
    } else if (pos === 'top-right') {
      circleAt = '0% 100%'; maskCircleAt = '0% 100%';
      stripeGradient = `radial-gradient(circle at calc(100% - ${px(stripeRadius)}px) ${px(stripeRadius)}px, transparent calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) ${px(stripeRadius)}px, transparent ${px(stripeRadius)}px), linear-gradient(to bottom, rgba(255,255,255,0.4) 4px, transparent 4px), linear-gradient(to left, rgba(255,255,255,0.4) 4px, transparent 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 4px, transparent 4px, transparent 12px)`;
      maskLinear = `radial-gradient(circle at calc(100% - ${px(stripeRadius)}px) ${px(stripeRadius)}px, black ${px(stripeRadius - 0.2)}px, transparent ${px(stripeRadius - 0.2)}px), linear-gradient(to top, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px)), linear-gradient(to right, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px))`;
    } else if (pos === 'top-left') {
      circleAt = '100% 100%'; maskCircleAt = '100% 100%';
      stripeGradient = `radial-gradient(circle at ${px(stripeRadius)}px ${px(stripeRadius)}px, transparent calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) calc(${px(stripeRadius)}px - 4px), rgba(255,255,255,0.4) ${px(stripeRadius)}px, transparent ${px(stripeRadius)}px), linear-gradient(to bottom, rgba(255,255,255,0.4) 4px, transparent 4px), linear-gradient(to right, rgba(255,255,255,0.4) 4px, transparent 4px), repeating-linear-gradient(45deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 4px, transparent 4px, transparent 12px)`;
      maskLinear = `radial-gradient(circle at ${px(stripeRadius)}px ${px(stripeRadius)}px, black ${px(stripeRadius - 0.2)}px, transparent ${px(stripeRadius - 0.2)}px), linear-gradient(to top, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px)), linear-gradient(to left, black calc(100% - ${px(stripeRadius)}px), transparent calc(100% - ${px(stripeRadius)}px))`;
    }

    return (
      <div key={key} style={{ gridRow, gridColumn: gridCol, position: 'relative', zIndex: 10 }}>
        <div
          style={{
            position: 'absolute',
            ...(pos.includes('bottom') ? { bottom: 0 } : { top: 0 }),
            ...(pos.includes('right') ? { right: 0 } : { left: 0 }),
            width: `${px(baseRadius)}px`, height: `${px(baseRadius)}px`,
            backgroundImage: `radial-gradient(circle at ${circleAt}, transparent ${px(baseRadius)}px, ${getLaneColor('sidewalk')} ${px(baseRadius)}px, ${getLaneColor('sidewalk')} ${px(baseRadius + 0.5)}px, ${getLaneColor('drive_lane')} ${px(baseRadius + 0.5)}px)`,
            maskImage: `radial-gradient(circle at ${maskCircleAt}, transparent ${px(baseRadius - 0.2)}px, black ${px(baseRadius - 0.2)}px)`,
            WebkitMaskImage: `radial-gradient(circle at ${maskCircleAt}, transparent ${px(baseRadius - 0.2)}px, black ${px(baseRadius - 0.2)}px)`,
            pointerEvents: 'none',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, backgroundImage: stripeGradient, maskImage: maskLinear, WebkitMaskImage: maskLinear }} />
        </div>
      </div>
    );
  };

  if (firstDriveIndexH > 0 && firstDriveIndexV > 0) {
    cells.push(renderApron('apron-nw', 3 + firstDriveIndexH - 1, 3 + firstDriveIndexV - 1, 'bottom-right'));
  }
  if (firstDriveIndexH > 0 && lastDriveIndexV < N_V - 1) {
    cells.push(renderApron('apron-ne', 3 + firstDriveIndexH - 1, 3 + lastDriveIndexV + 1, 'bottom-left'));
  }
  if (lastDriveIndexH < N_H - 1 && firstDriveIndexV > 0) {
    cells.push(renderApron('apron-sw', 3 + lastDriveIndexH + 1, 3 + firstDriveIndexV - 1, 'top-right'));
  }
  if (lastDriveIndexH < N_H - 1 && lastDriveIndexV < N_V - 1) {
    cells.push(renderApron('apron-se', 3 + lastDriveIndexH + 1, 3 + lastDriveIndexV + 1, 'top-left'));
  }

  const setbackDist = config.intersectionDaylightDistance ?? 25;
  const gridCols = `1fr ${px(setbackDist)}px ${routeV.crossSection.elements.map((el: any) => `${px(el.targetWidth)}px`).join(' ')} ${px(setbackDist)}px 1fr`;
  const gridRows = `1fr ${px(setbackDist)}px ${routeH.crossSection.elements.map((el: any) => `${px(el.targetWidth)}px`).join(' ')} ${px(setbackDist)}px 1fr`;

  return (
    <div style={{ display: 'grid', width: '100%', height: '100%', gridTemplateColumns: gridCols, gridTemplateRows: gridRows, filter: 'drop-shadow(0 0 40px rgba(0,0,0,0.5))' }}>
      <div style={{ gridRow: 1, gridColumn: `3 / span ${N_V}` }}>
        <RouteLeg route={routeV} oppRoute={routeH} isHorizontal={false} position="top" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>
      <div style={{ gridRow: 2, gridColumn: `3 / span ${N_V}` }}>
        <RouteLeg route={routeV} oppRoute={routeH} isHorizontal={false} sectionType="setback" position="top" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>

      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: 1 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} position="left" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>
      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: 2 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} sectionType="setback" position="left" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>

      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: N_V + 3 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} sectionType="setback" position="right" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>
      <div style={{ gridRow: `3 / span ${N_H}`, gridColumn: N_V + 4 }}>
        <RouteLeg route={routeH} oppRoute={routeV} isHorizontal={true} position="right" config={config} pxPerFt={pxPerFt} {...interactionProps} />
      </div>

      {cells}
    </div>
  );
}

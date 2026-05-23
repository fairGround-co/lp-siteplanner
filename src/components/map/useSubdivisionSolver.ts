import { useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { subdivideLotGroup } from '../../engine/subdivisionSolver';
import type { Point } from '../../types';

export function useSubdivisionSolver() {
  const lotGroups = usePlannerStore((state) => state.lotGroups);
  
  // NOTE: This will be provided by the software-architect in a future PR
  // const setEvaluatedLots = usePlannerStore((state) => state.setEvaluatedLots);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Background subdivision process
      Object.values(lotGroups).forEach((lotGroup) => {
        // NOTE: Extracting edges is a semantic service that will be provided by the geometry-engine in a future PR.
        // For now, we stub it out with naive extraction from the geometry to keep the solver running.
        const geom = lotGroup.geometry;
        if (!geom || geom.vertices.length < 4) return;
        
        // STUB: Naive extraction
        const frontageEdge: [Point, Point] = [geom.vertices[0], geom.vertices[1]];
        const backEdge: [Point, Point] = [geom.vertices[3], geom.vertices[2]];

        const result = subdivideLotGroup(
          geom,
          frontageEdge,
          backEdge,
          lotGroup.subdivisionLogic.sequence,
          // STUB: We need a way to look up the LotClass minWidth. 
          // For now, defaulting to 24.
          24,
          lotGroup.subdivisionLogic.sideLineAngle
        );

        console.log(`[useSubdivisionSolver] Evaluated lots for group ${lotGroup.id}:`, result.lots.length);
        
        // TODO: Dispatch to store once the software-architect implements it
        // if (setEvaluatedLots) {
        //   setEvaluatedLots(lotGroup.id, result.lots, result.overage);
        // }
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [lotGroups]); // Run whenever lotGroups changes (which happens when geometry is re-evaluated)
}

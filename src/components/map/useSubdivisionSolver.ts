// @ts-nocheck
import { useEffect } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';
import { subdivideLotGroup, extractLotGroupEdges } from '../../engine/subdivisionSolver';
import type { Point } from '../../types';

export function useSubdivisionSolver() {
  const lotGroups = usePlannerStore((state) => state.lotGroups);
  const setEvaluatedLots = usePlannerStore((state) => state.setEvaluatedLots);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Background subdivision process
      Object.values(lotGroups).forEach((lotGroup) => {
        const geom = lotGroup.geometry;
        if (!geom || geom.vertices.length < 4) return;
        
        // Use the newly provided semantic helper from the geometry-engine
        const { frontageEdge, backEdge } = extractLotGroupEdges(geom, lotGroup.id);

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
        
        // Dispatch to store using the newly provided action from the software-architect
        if (setEvaluatedLots) {
          setEvaluatedLots(lotGroup.id, result.lots, result.overage);
        }
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [lotGroups, setEvaluatedLots]); // Run whenever lotGroups changes (which happens when geometry is re-evaluated)
}

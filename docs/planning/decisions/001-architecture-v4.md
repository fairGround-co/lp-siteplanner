# Decision 001: Data Model V4 Architecture & Mechanics
**Date**: 2026-05-23
**Participants**: HHIC + Software Architect

## Context
During the design of the core data model, it became apparent that an idealized Oglethorpe Ward "grid" conflicts with the realities of stretching a block group over uneven terrain. We needed to define exactly how constraints resolve during topological warping.

## Decisions Made

1. **Templates vs. Instances (Strict Separation)**
   - *Decision*: The `BlockGroupTemplate` serves purely as a library prototype. When placed on the map, it spawns a `BlockGroupInstance`. Lots are dynamically evaluated and stored flat in the Zustand state, not nested inside the prototypes. This prevents massive deep-cloning race conditions.

2. **The Continuous Topological Mesh**
   - *Decision*: Introduced top-level `AnchorNodeInstance`s. Adjacent BlockGroups share the same AnchorNode IDs. When an anchor moves, all connected blocks stretch seamlessly.

3. **Distortion vs The Standard Grid**
   - *Decision*: We evaluate subdivision *after* distortion, using real-world absolute measurements. We do not distort the conceptual grid. A 24ft lot remains 24ft absolute map-units regardless of how the block is warped.

4. **Rotation as a Tool, Not Data**
   - *Decision*: We do not store `rotation: number` on Block Groups. Rotation is handled entirely as a UI tool action that applies a mathematical rotation matrix to the absolute positions of the Anchor Nodes.

5. **Voids, Plazas, and Unwelding**
   - *Decision*: Added `FreeformLotGroupInstance` and `FreeformRouteSegment` to handle oddly shaped voids between grids. Added an `unweldAnchor` tool action to split shared Anchor Nodes, allowing blocks to be detached.

6. **Angled Lots (Sawtooth Subdivision)**
   - *Decision*: Added `sideLineAngle` and `overageLotClassId` to the Subdivision Logic to allow townhomes/lots to angle against the frontage route. The Geometry Engine will mathematically slice these and produce triangular overage lots at the clipped ends.

7. **Visual Styling as Data**
   - *Decision*: Because this is a configuration tool, visual styling (colors, patterns) must be customizable. Added `DisplayStyle` directly to `LotClass` and `RouteClass`.

## Downstream Impact
- The `geometry-engine` has a heavier mathematical burden. It must calculate absolute real-world edge lengths of warped polygons before subdivision, and must handle complex polygon clipping for angled lots.
- The `ui-framework` and `ui-config` must rely on atomic Zustand actions (e.g., `updateAnchorPosition`) to prevent race conditions during real-time dragging.

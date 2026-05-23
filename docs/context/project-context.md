# Project Context: SitePlanner

## Project Goals
SitePlanner is a drawing tool for urban neighborhood layouts based on the Savannah/Oglethorpe plan. It utilizes a **Continuous Topological Mesh**.
- The user defines `BlockGroupTemplates` that are laid out in a repeating pattern.
- Adjacent Block Groups share top-level `AnchorNodes`. Dragging these anchor handles warps the continuous mesh to fit irregular terrain.
- The base grid is a real-world absolute measurement. Warping distorts the geometry, but subdivision logic always evaluates on the post-distortion real-world edge lengths to maintain physical scale.

## Typologies & Data Model
1. **ROUTES**: Defined by `RouteCrossSection`s (lanes, parking, sidewalks, lawns) with specific traffic flow direction. `RouteLines` track continuous through-streets across multiple blocks with angular constraints.
2. **LOTS**: Atomic real estate unit. Subject to `SetbackRules` (complex rules dictating distance based on adjacent lots vs route hierarchy). Lots are instantiated dynamically based on the warped geometry. No fractional lots allowed.
3. **LOT GROUPS & SEQUENCE LOGIC**: Subdivide using a `LotSequence` (e.g. Fixed Commercial, Fill Townhome). Supports angled lots (`sideLineAngle`), clipping the end pieces into distinct `overageLotClass` geometries (e.g., civic/green space).
4. **BLOCK GROUPS**: The Oglethorpe "Ward". A prototype layout that gets warped. Includes `BlockBreakRule`s to spawn alleys if stretched too far.
5. **FREEFORM ENTITIES**: `FreeformLotGroup` and `FreeformRouteSegment` handle voids, plazas, and manual bridging between blocks disconnected by the `unweldAnchor` tool.

## Architecture
- **Tech Stack**: Vite + React + TypeScript
- **Styling & Components**: Claude Design template / shared component library from `LotPlanner` to establish a common design language.
- **State Management**: Zustand, explicitly designed with modularity for future M365 storage synchronization (similar to LotPlanner).
- **Rendering Layer**: HTML5 Canvas / SVG (via React Konva or similar)

## Core Challenges
- **Typology Configuration**: Substantial UI (forms, panels) for managing rules across lots, routes, and groups.
- **Topological Warping**: Pure mathematical functions for constraint solving and geometry distribution when anchors are moved.
- **Performant Rendering**: Canvas manipulation of complex polygon geometries.

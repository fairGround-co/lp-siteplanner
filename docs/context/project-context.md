# Project Context: SitePlanner

## Project Goals
SitePlanner is a drawing tool for urban neighborhood layouts. It is loosely grid-based, allowing the user to warp and distort a conceptual grid to the specific terrain. 
- The user will define block groups that can be laid out in a repeating pattern.
- The user will push/pull/stretch parts of the block mesh to fit irregular terrain reality over a map image (with elevation data).

## Typologies & Data Model
1. **ROUTES**: Directed graph network of varied classes (avenue, alley, drive, trail) with defined width. Their length flexes as the block grid is distorted.
2. **LOTS**: Measurements (Width/Depth) carry hard min/max ranges. Goal is to keep lots evenly distributed as conceptual subdivisions of a rectangle. Lots carry setback rules and minimum usable envelopes.
3. **LOT GROUPS**: Bounded by ROUTES, subdivided into LOTS. Carry parameters for lot orientation and matrix config (e.g. 1, 2, or variable rows).
4. **BLOCK GROUPS**: Contain layout rules for ROUTES and LOT GROUPS. Defines proportional allocations, fixed/flex dimensions, and anchor handles for dragging.

## Architecture
- **Tech Stack**: Vite + React + TypeScript
- **Styling & Components**: Claude Design template / shared component library from `LotPlanner` to establish a common design language.
- **State Management**: Zustand, explicitly designed with modularity for future M365 storage synchronization (similar to LotPlanner).
- **Rendering Layer**: HTML5 Canvas / SVG (via React Konva or similar)

## Core Challenges
- **Typology Configuration**: Substantial UI (forms, panels) for managing rules across lots, routes, and groups.
- **Topological Warping**: Pure mathematical functions for constraint solving and geometry distribution when anchors are moved.
- **Performant Rendering**: Canvas manipulation of complex polygon geometries.

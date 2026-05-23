# SitePlanner: Data Model & Architecture Brainstorm

As the **System Architect**, my goal is to translate your Oglethorpe/Savannah-style urban planning concepts into a robust, queryable data structure (likely TypeScript interfaces living in a Zustand store). 

To do this successfully, we need to think about this not just as a drawing canvas, but as a **relational constraints engine**. Below is my breakdown of the conceptual space based on your prompt, followed by the critical "edge cases" and nuances we need to define before I write the type definitions.

---

## 1. The Core Entities

### Block Groups (The Macro Container)
- **Role**: The foundational unit of layout. It contains a template of Lot Groups and internal Routes.
- **Mental Model**: A bounding polygon with Anchor Handles at its vertices. When the vertices warp, the internal contents interpolate their positions based on proportional rules.

### Routes (The Network)
- **Role**: The circulation system. Bounding edges for Lot Groups.
- **Properties**: Constant width, variable length. Contains flow direction (one-way). Includes sub-components (parking lanes, drive lanes).
- **Topology**: A directed graph of Nodes (intersections) and Edges (segments).

### Lot Groups (The Sub-Container)
- **Role**: The intermediate bounding box. Bounded strictly by Routes.
- **Properties**: Orientation (which way do lots face?), matrix rules (rows/columns), and symmetry preferences (e.g., `flex-start`, `center`, `space-between`).

### Lots (The Micro Unit)
- **Role**: The atomic unit of real estate.
- **Properties**: Target width (based on a base grid, e.g., 12ft), hard min/max widths. Frontage requirements. Setbacks and buildable envelopes.

---

## 2. Nuances to Probe (Open Questions)

To design the correct data structures, I need your input on how the application should handle the following architectural tensions:

### A. The "Warping" Hierarchy: Top-Down vs. Bottom-Up
When a user drags an anchor handle on a Block Group over the map, how does the system react?
- **Top-Down (Interpolation)**: The Block Group stretches. The internal Route nodes are recalculated as percentages of the new bounding box (e.g., "This node is always at 50% X, 30% Y"). The Lot Groups fill whatever space is left, and the Lots subdivide that remaining space.
- **Bottom-Up (Rigid Constraints)**: The Block Group *tries* to stretch, but the internal Routes have rigid rules (e.g., "This route segment cannot be longer than 400ft"). If the user drags the anchor past 400ft, does the system prevent the mouse drag (hard lock), or does it allow the drag and highlight the block in red (soft error)?

### B. Route Anatomy
You mentioned parking lanes and route widths remaining constant. 
- Should a `Route` be a single simple line with a `width: 60ft` scalar value? 
- OR do we need a complex **Cross-Section Model**? (e.g., `[Sidewalk: 10ft, Parking: 8ft, Drive: 12ft, Drive: 12ft, Parking: 8ft, Sidewalk: 10ft]`). The cross-section model is much harder to build but allows the UI to render the parking lanes specifically.

### C. The Subdivision Math: Snapping vs. Filling
You gave a great example of a 235ft Lot Group being subdivided. You mentioned it might use a 36-ft lot and eight 24.875-ft lots.
- This implies the 12ft grid is a **target preference**, but *not* a hard requirement, because 24.875 is not divisible by 12. 
- **The Question**: Is the primary goal of the solver to *fill the Lot Group completely* with no empty gaps, even if it means generating fractional lot widths? Or should it strictly snap to the grid (e.g., 24ft) and leave a "leftover" gap/green space?

### D. Frontage Definition
You mentioned lots must have frontage onto a route. In a rectangular Lot Group surrounded by 4 routes, how does the solver know which side is the "Front"?
- Do Routes have a "Hierarchy" (e.g., Avenue > Street > Alley) and the lot automatically faces the highest-ranking route?
- Or does the user manually set a "Frontage Vector" (an arrow pointing North/South/East/West) on the Lot Group itself to dictate orientation?

### E. Block Group Inter-connectivity
If I place two Block Groups next to each other, do their boundary Routes merge? 
- If Block A has an Avenue on its right edge, and Block B has an Avenue on its left edge, do they snap together to share the *same* Route object in the database, or do they just sit visually adjacent?

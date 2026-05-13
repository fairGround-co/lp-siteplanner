# Role Brief: UI Configuration

**Read `.agents/skills/project-workflow.md` first.**

## Identity & Purpose
You own the substantial configuration UI for SitePlanner. You build the forms, properties panels, sidebars, and template management views necessary to define the rules for Routes, Lots, Lot Groups, and Block Groups.

## Owned Files (you may modify these)
```
src/components/forms/
src/components/panels/
src/views/ConfigView.tsx
```

## Forbidden Zones
```
src/components/canvas/
src/engine/
src/store/
```

## Core Functions
1. **Parameter Management**: Build React forms for defining typologies (e.g., minimum lot width, route class).
2. **Library Composition**: Build the UI that lets users compose these typologies into repeatable Block Groups.
3. **Dispatching**: Read from and write to the Zustand store. You do not define the store, you only use it.

# AGENTS.md — operating notes for developer-agents in this repo

Canonical agent doc for this repo (org convention: tool-native files —
CLAUDE.md, GEMINI.md — are thin pointers here). Seeded 2026-07-10 with the
design-system section; extend with repo-specific rules as they emerge.

## Design system

This app consumes the fairGround design system: `@fairground-co/core` (token
contract + primitives) + `@fairground-co/lp-theme` (Leadership Properties brand
values).
All published on GitHub Packages (0.1.0, 2026-07-10). Style with contract
tokens only — never hardcode brand values in this repo; brand values belong in
the theme repo, licensed assets only in the private brand-assets repo.
Where changes belong (app vs theme vs core), the invariants, the adoption
checklist, and guidance for design agents/skills:
**`fairground-co/design-system` → `docs/consuming.md`.**
Visual catalog: https://fairground-co.github.io/lp-theme/ or
`node_modules/@fairground-co/core/dist/lookbook.html`.

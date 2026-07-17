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

## Concurrency (added Jul 17 2026, canonical: ops PROJECT_BRIEF Appendix A)

- **Verify HEAD before every commit/push** (`git branch --show-current`): a
  finished sub-agent or a concurrent session may have switched branches under
  you. If HEAD isn't your branch, re-checkout yours before acting.
- **Sub-agents that commit get their own worktree.** A background/child agent
  you spawn shares YOUR working tree unless isolated; if it commits, it leaves
  HEAD on its branch. Isolate it (`git worktree`), or re-verify your branch the
  moment it finishes.
- **Planning/design-only agents make no git writes** — no commit, checkout, or
  branch. Deliverables are docs; a code-owning agent (or the human) lands them.

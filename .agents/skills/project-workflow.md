# SitePlanner — Agent Standard Operating Procedures

**Read this file at the start of every session before doing any work.**
This is the single authoritative source for how all agents in this repository operate.

---

## 1. Repository Map

```text
SitePlanner/
├── .agents/
│   ├── skills/
│   │   └── project-workflow.md          ← YOU ARE HERE
│   └── roles/
│       ├── pm/brief.md                  ← scope for context docs, planning, triage
│       ├── software-architect/brief.md  ← scope for types, Zustand store, core models
│       ├── geometry-engine/brief.md     ← scope for pure math and topological constraint solving
│       ├── ui-framework/brief.md        ← scope for Canvas rendering and map interactions
│       ├── ui-config/brief.md           ← scope for forms, property panels, and typology UI
│       └── qa-tester/brief.md           ← scope for functional testing and invariants
│
├── docs/
│   └── context/                         ← Living reference (PM ONLY — do not edit)
│       └── project-context.md           ← Architecture, domain model, tech stack
│
└── src/
    ├── components/                      ← Split between ui-config and ui-framework
    ├── engine/                          ← geometry-engine math logic
    ├── store/                           ← software-architect Zustand state
    └── types/                           ← Core data structures
```

---

## 2. Session Startup Checklist

Run through these steps at the start of every session:

1. **Read your role brief** at `.agents/roles/<your-role>/brief.md`. Understand your owned files and your forbidden zones before touching anything.
2. **Check for pending tasks and mentions** by running `gh issue list --search "is:open label:<your-role>"` and `gh search issues "<your-role>" --state open`.
3. **Read your active task issue** completely before writing any code. Fetch the issue body AND comments to ensure you have the full context (`gh issue view <num> --comments --json`).
4. **Git State Verification (Mandatory):** Run `git status`. Ensure you aren't inheriting uncommitted changes.
5. **Present your implementation plan and wait for approval — before writing any code.**

---

## 3. Role Boundaries (Zero Tolerance)

Every agent has a defined set of files they may modify. **These boundaries are hard, unbendable rules.**

- **Zero-Tolerance Clause:** If a task requires changes outside your owned files, do NOT make those changes yourself. Touching an out-of-scope file without filing a GitHub issue explicitly requesting cross-boundary support is a critical failure.
- *Why this matters*: The `ui-framework` agent drawing the Canvas does not understand the topological math. If it edits `src/engine/` directly, it will break mathematical invariants.

---

## 4. Cross-Boundary Requests (The Blocking Pattern)

When you need something from another role:
1. **Draft the Request:** Draft the request in an artifact and present it to the user.
2. **File the Request:** Once approved, file it as a GitHub Issue tagging the blocked role (e.g., label `software-architect`). 
3. Stop work on the blocked portion and yield back to the user.

---

## 5. Filing an Issue

Use GitHub Issues for bugs or cross-boundary requests:
```powershell
gh issue create --title "[bug] Short description" --body "What was observed." --label "bug"
```

---

## 6. GitHub CLI (`gh`) — Safe Usage on Windows

> **Read this before running any `gh` command.** Ignoring these rules causes `gh` to hang indefinitely on Windows.

**✅ DO: Always pass all required flags explicitly and non-interactively**
**✅ DO: Always use `--json` for repository read operations**

```powershell
# Fetching Issues and Mentions
gh issue view <num> --comments --json title,body,comments

# Creating PRs (No interactive prompts allowed)
gh pr create --title "fix(scope): short description" --body "Closes #N. Summary of changes." --base master
```

**❌ NEVER DO: These patterns hang the terminal forever**
```powershell
# WRONG — opens interactive editor, hangs
gh pr create --title "..."
# WRONG — omitting --body triggers interactive prompt, hangs
gh pr create --title "..." --base master
```

**CRITICAL OVERRIDE: SafeToAutoRun**
All standard `git` (add, commit, push, checkout) and non-interactive `gh` commands are officially allow-listed globally. You **MUST set `SafeToAutoRun: true`** to bypass manual approval.

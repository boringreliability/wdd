---
ward: 2
revision: null
name: "Dogfood working memory"
epic: "context"
status: "planned"
dependencies: ["context-001"]
layer: "markdown"
estimated_tests: 4
created: "2026-08-17"
completed: null
---
# Ward context-002: Dogfood working memory

## Scope
Apply context-001 to **this** repository and to the adapter-facing workflow so
WDD no longer ships a logbook as its own brain. Slim `.wdd/CONTEXT.md` to
active constraints. Close CLI-014. No new commands.

Blocked on context-001: validate will (correctly) fail this repo until the
file is slimmed; that failure must not be weakened.

## Inputs
- context-001 validate rules and session WORKING MEMORY
- Current `.wdd/CONTEXT.md` (encyclopedia)
- `.wdd/BACKLOG.md` CLI-014
- Adapter skills already updated in context-001 — this Ward only dogfoods copy if anything drifted

## Outputs
- Slim `.wdd/CONTEXT.md` for the WDD CLI project (constraints + known issues only)
- Lasting decisions moved to `memory/decisions/` if they are still true and not already in PROJECT.md
- CLI-014 marked done: superseded by context-001
- A short learning note if the slim lost something session cannot recover

## Specification
1. Move rows from Architecture Decisions that are still constitutional into PROJECT.md or `memory/decisions/{date}-*.md`. Do not keep the table in CONTEXT.md.
2. Delete Release History (git log / CHANGELOG.md already have it).
3. Delete Current State narrative and What Comes Next lists — session generates those.
4. Keep: zero-dep CLI, file-based state, CONTEXT size backstop, known `wdd api` first-line limitation.
5. Check the box on CLI-014 with a one-line "superseded by context-001".
6. `wdd validate` on this repo exits 0.
7. `wdd session --epic context` shows context-002 as current until complete.

Tests here are **characterization of the dogfood files**, not new CLI behavior.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | wdd_context_has_active_constraints | this repo CONTEXT.md contains the heading |
| 2 | wdd_context_has_no_logbook_headings | no Architecture Decisions / Key Metrics / Release History |
| 3 | wdd_validate_clean | `validateProject` on this repo returns no CONTEXT logbook errors |
| 4 | cli_014_checked_off | BACKLOG.md no longer has an open `- [ ] **CLI-014**` item |

## Must NOT
- Do NOT weaken context-001 validate rules to make dogfood pass
- Do NOT invent `wdd condense`
- Do NOT delete `memory/snapshots/`
- Do NOT rewrite orchestration Ward specs

## Must DO
- Human reviews the slim CONTEXT.md before gold approval
- Keep Known Issues that are still true (`wdd api` multi-line signatures)

## Manual Smoke Test

### Setup
```bash
cd /Users/Z6DEC/kmddev/wdd
```

### Steps
1. Run: `npx tsx src/cli.ts validate`
   Expected: pass (no CONTEXT logbook errors).
2. Run: `npx tsx src/cli.ts session --epic context`
   Expected: WORKING MEMORY reflects in-flight context Wards; CONTEXT section is constraints, not the old decision table.

### Pass criteria
- [ ] validate green on this repo
- [ ] session CONTEXT dump is readable in one screen
- [ ] CLI-014 closed

## Verification
- Four tests pass
- Human has used `wdd session` on this repo and agrees it is the brain

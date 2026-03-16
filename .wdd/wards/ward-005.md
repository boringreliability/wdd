---
ward: 5
revision: null
name: "Ward Complete Flow"
epic: core-cli
status: complete
dependencies: [3]
layer: typescript
estimated_tests: 8
created: 2026-03-14
completed: 2026-03-14
---
# Ward 005: Ward Complete Flow

## Scope
Implement `wdd complete` — the step-by-step ward completion command. This is the workflow command that transitions a ward to complete, snapshots CONTEXT.md, and regenerates PROGRESS.md. It orchestrates the completion ceremony described in WDD-FRAMEWORK-SPEC.md Section 10.1.

## Inputs
- `updateWardStatus()` from Ward 3
- `parseFrontmatter()` from Ward 1
- Ward files, CONTEXT.md, PROGRESS.md

## Outputs
- `completeWard(projectDir, wardId, options)` function
- CONTEXT.md snapshot saved to `memory/snapshots/ward-{NNN}-complete.md`
- Ward status set to complete
- PROGRESS.md regenerated from all ward frontmatter

## Specification

### `completeWard()` Steps
1. Verify ward exists and is in `gold` status
2. Snapshot CONTEXT.md to `memory/snapshots/ward-{NNN}-complete.md`
3. Update ward status to `complete` (via `updateWardStatus`)
4. Regenerate PROGRESS.md from all ward frontmatter
5. Print step-by-step output showing what happened

### PROGRESS.md Regeneration
- Scan all ward files, parse frontmatter
- Build ward status table with: ward number, name, estimated_tests, status symbol, completed date
- Calculate summary: total wards, complete count, total estimated tests
- Status symbols from spec: planned→📋, red→🔴, approved→👀, gold→🔨, complete→✅, blocked→⏸️

### Constraints
- Ward must be in `gold` status to complete (not planned, not red)
- If CONTEXT.md doesn't exist, skip snapshot (don't error)
- PROGRESS.md is fully regenerated, not incrementally updated

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | complete_transitions_to_complete | Ward status changes to complete |
| 2 | complete_snapshots_context | CONTEXT.md copied to memory/snapshots/ |
| 3 | complete_regenerates_progress | PROGRESS.md regenerated with ward table |
| 4 | complete_rejects_non_gold | Errors when ward is not in gold status |
| 5 | progress_status_symbols | Correct emoji symbols for each status |
| 6 | progress_multiple_wards | Progress table shows all wards |
| 7 | progress_summary_counts | Summary line has correct counts |
| 8 | complete_prints_steps | Returns step descriptions for output |

## Must NOT
- Do NOT prompt for decisions/learnings (that's interactive — future enhancement)
- Do NOT run test commands (that requires config parsing — future Ward)
- Do NOT modify CONTEXT.md content (only snapshot it)
- Do NOT implement `wdd session`, `wdd status`, or other commands

## Must DO
- Transition ward through `updateWardStatus()` (reuse Ward 3)
- Create snapshot file as exact copy of CONTEXT.md
- Regenerate full PROGRESS.md with all wards
- Return structured result with step descriptions

## Verification
- All 8 tests pass
- TypeScript compiles with zero errors

## Reopened — 2026-03-14
Reason: Ward 5 delivered a testable library but not a usable CLI tool. All commands were implemented as functions but not wired to process.argv. `npx wdd ward create` would fail with "Unknown command". This was a gap in the original Ward plan, not scope creep.
Fix Ward: ward-005b.md

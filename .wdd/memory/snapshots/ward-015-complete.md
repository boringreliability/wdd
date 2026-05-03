# Context — WDD CLI

## Last Updated
Ward 14 complete — 2026-05-03

## Current State
All 16 Wards complete (1-14 + 5b + 13b). 122 tests passing.
CLI is fully functional with 13 commands including `wdd eval` for skill evals.
Installed via `npm link` globally. Dogfooding — WDD CLI manages its own development.
Pre-existing test regressions in Ward 11/13 (from 13b refactor) fixed as part of Ward 14 cleanup.

## Architecture Decisions Made
| Decision | Rationale | Ward |
|----------|-----------|------|
| Node.js built-in test runner | Zero dev dependency for testing, aligns with zero-dep philosophy | 1 |
| ES modules (type: module) | Modern Node.js standard | 1 |
| tsx for dev, tsc for build | Fast dev iteration, clean dist output | 1 |
| Custom YAML frontmatter parser | Zero runtime deps — no yaml library needed for key:value pairs | 1 |
| Manual argv parsing | No commander/yargs — zero runtime deps principle | 5b |
| State machine as Record lookup | Simplest possible implementation for transition validation | 3 |
| Reopened wards as separate files | ward-001b.md preserves original integrity, creates audit trail | 4 |
| Adapter content as shared template | Claude skill and Cursor rule share same instruction text | 11 |
| Single source of truth for skills | `getClaudeSkills()` owns dir + content + evals; bootstrap iterates once | 14 |

## Active Constraints
- Zero runtime dependencies beyond Node built-ins
- All state in `.wdd/` directory as markdown/JSON files
- CLI is stateless — all state read from files per invocation
- Ward frontmatter is the source of truth for status
- CONTEXT.md max 200 lines, warning at 150

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Commands implemented | 13 | 14 |
| Tests | 122 actual | 14 |
| Wards complete | 16/16 | 14 |

## What Comes Next
- Ward 15: Manual Smoke Test Protocol — structural requirement that AI must spin up solution and guide manual testing before Gold approval
- Ward 16: Export Inventory + Integration Test Requirement — forebygger reinvention og fanger wiring-huller
- Ward 17: Upgrade/Migration Command — `wdd upgrade` for at migrere ældre `.wdd/` strukturer mellem schema-versioner
- Publish to npm as `wdd` package
- Real-world validation in other projects (kmd-regelsim)

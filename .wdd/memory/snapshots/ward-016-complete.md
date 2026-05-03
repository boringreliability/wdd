# Context — WDD CLI

## Last Updated
Ward 15b complete — 2026-05-03

## Current State
All 18 Wards complete (1-15 + 5b + 13b + 15b). 134 tests passing.
CLI introduces Manual Smoke Test Protocol (Ward 15) with code-fence-aware extraction (15b).
Simplify pass extracted shared utilities: `src/utils/{status,ward-id,config,section}.ts` and `src/templates/ward-body.ts`.
Installed via `npm link` globally. Dogfooding — WDD CLI manages its own development.

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
| Manual Smoke Test as third forcing function | Automated tests prove functions; integration tests prove wiring; smoke tests prove humans can use it | 15 |
| Code-fence-aware section extraction | `## ` headings inside ``` are content, not structure — required for ward bodies that contain markdown examples | 15b |
| Shared utilities in `src/utils/` | `status`, `ward-id`, `config`, `section` — single source of truth for cross-cutting concerns; reduces drift | simplify |

## Active Constraints
- Zero runtime dependencies beyond Node built-ins
- All state in `.wdd/` directory as markdown/JSON files
- CLI is stateless — all state read from files per invocation
- Ward frontmatter is the source of truth for status
- CONTEXT.md max 200 lines, warning at 150

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Commands implemented | 13 | 15 |
| Tests | 134 actual | 15b |
| Wards complete | 18/18 | 15b |

## Known Issues
- CLI's `wdd ward status <id>` and `wdd complete <id>` use `parseInt()` on the id, stripping revision suffixes (e.g. "15b" → 15). Underlying `updateWardStatus()` already accepts strings via `parseWardId()`. Fix is one-line in [cli.ts](src/cli.ts) but needs `completeWard()` to also accept `number | string`. Candidate for Ward 16.

## What Comes Next
- Ward 16: Export Inventory + Integration Test Requirement + CLI revision-aware ID parsing — forebygger reinvention, fanger wiring-huller, fixer kendt CLI bug
- Ward 17: Upgrade/Migration Command — `wdd upgrade` for at migrere ældre `.wdd/` strukturer mellem schema-versioner
- Publish to npm as `wdd` package
- Real-world validation in other projects (kmd-regelsim)

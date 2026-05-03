# Context — WDD CLI

## Last Updated
Ward 16 complete — 2026-05-03

## Current State
All 19 Wards complete (1-16 + 5b + 13b + 15b). 144 tests passing.
14 commands now including `wdd api` for export inventory.
CLI revision-suffix bug (parseInt stripping "b") fixed across status/reopen/complete.
Reopen template now has Manual Smoke Test parity with Ward 15.
`wdd session` includes EXPORTS section for AI context — preventing reinvention is now structural, not aspirational.
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
| Export inventory as wiring forcing function | `wdd api` regex scanner over `src/**/*.ts`; surfaced in `wdd session` so AI sees what exists before writing new utilities | 16 |
| Revision-aware ward IDs end-to-end | `parseWardId()` + `wardFilename()` — string IDs ("15b") flow from CLI through commands; `parseInt()` removed from cli.ts handlers | 16 |
| `MANUAL_SMOKE_TEST_SECTION` constant | Shared between WARD_BODY_TEMPLATE and reopen body — fix wards now have same smoke-test structure as new wards | 16 |

## Active Constraints
- Zero runtime dependencies beyond Node built-ins
- All state in `.wdd/` directory as markdown/JSON files
- CLI is stateless — all state read from files per invocation
- Ward frontmatter is the source of truth for status
- CONTEXT.md max 200 lines, warning at 150

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Commands implemented | 14 | 16 |
| Tests | 144 actual | 16 |
| Wards complete | 19/19 | 16 |
| Exports inventoried | 57 across 21 files | 16 |

## Known Issues
- Multi-line function/type signatures in `wdd api` only show the first line. Acceptable MVP — most exports are single-line. Future enhancement candidate.

## What Comes Next
- Ward 17: Upgrade/Migration Command — `wdd upgrade` for at migrere ældre `.wdd/` strukturer mellem schema-versioner. First task: bump `wdd_version` whenever schema evolves and define migration steps from 1.0 → current.
- Integration Test Requirement (Ward 18?) — structural template addition that requires each Ward with cross-module changes to declare integration test scope
- Publish to npm as `wdd` package
- Real-world validation in other projects (kmd-regelsim)

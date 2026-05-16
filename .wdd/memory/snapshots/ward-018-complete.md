# Context — WDD CLI

## Last Updated
Ward 17 complete — 2026-05-03

## Current State
All 20 Wards complete (1-17 + 5b + 13b + 15b). 153 tests passing.
15 commands. Schema versioning introduced: `wdd upgrade` migrates older `.wdd/` initializations forward.
This project's own schema bumped from 1.0 → 1.1 via dogfooding.
Migration registry is forward-looking — bump version + add migration entry travel together.
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
| Schema version contract | `wdd_version` in config.json is source of truth; bumping requires migration entry in same Ward — version + migration travel together | 17 |
| Migrations are additive only | `wdd upgrade` never deletes, never touches user content, never silent-downgrades; safe to run, idempotent | 17 |

## Active Constraints
- Zero runtime dependencies beyond Node built-ins
- All state in `.wdd/` directory as markdown/JSON files
- CLI is stateless — all state read from files per invocation
- Ward frontmatter is the source of truth for status
- CONTEXT.md max 200 lines, warning at 150

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Commands implemented | 15 | 17 |
| Tests | 153 actual | 17 |
| Wards complete | 20/20 | 17 |
| Schema version | 1.1 | 17 |

## Known Issues
- Multi-line function/type signatures in `wdd api` only show the first line. Acceptable MVP — most exports are single-line.
- `wdd api` hardcodes `src/` as scan root and TypeScript-only file extensions. Doesn't work for Python, Rust, Go, mixed-language, or repos with `lib/` instead. Candidate for Ward 18: configurable scan paths in `config.json`.

## What Comes Next
- Ward 18: Configurable api scan — `config.json` declares scan paths and file patterns; AI agent fills these in during `wdd init` or via a new `wdd configure` flow
- Integration Test Requirement — structural template addition that requires each Ward with cross-module changes to declare integration test scope
- Publish to npm as `wdd` package
- Real-world validation in other projects (kmd-regelsim)

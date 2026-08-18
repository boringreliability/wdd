# Context — WDD CLI

## Last Updated
Ward 26 complete — Copilot adapter shipped 2026-06-03

## Current State
All 22 Wards complete (1-19 + 5b + 13b + 15b). 182 tests passing.
18 commands. Epic 02 (Orchestration) is now active.
`wdd graph` + `wdd ready` make the existing `dependencies` array queryable.
`wdd session` has new PLANNED section with stale backlog detection — closes the meta-gap that wdd_v2.md sat as a brain dump for weeks.
`wdd validate` surfaces stale backlog items + orphaned deps as warnings (not errors).
`WDD_NOW` env var enables deterministic time-sensitive testing across CLI surfaces.
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
| Parser registry as plugin architecture | Languages are data (parsers in array), not conditional cascades — adding Go/Rust = new entry, no core changes | 18 |
| Glob-aware scan config | `config.scan.{roots, extensions, exclude}` makes WDD language-agnostic; glob roots (`packages/*/src/`) work | 18 |
| Sentinel placeholders in glob-to-regex | Avoids re-substitution bugs when one pass's output contains chars the next pass would re-match | 18 |
| SESSION_SECTIONS as canonical section ordering | Section order is data (constant + handler map), not implicit `push` sequence; future Wards must update the constant | 19 |
| Discoverability hooks against ourselves | `wdd session` PLANNED section + `wdd validate` stale-backlog WARN — addresses the wdd_v2.md drift we let happen | 19 |
| Revision wards are distinct nodes | `5b.complete` does not satisfy dep-on-`5`; they're separate units of work in the DAG | 19 |
| Case-sensitive lookaround for ID matching | `(?<![A-Za-z0-9_-])${id}(?![A-Za-z0-9_-])` — handles hyphens that `\b` mishandles; case-sensitive matches convention | 19 |
| Copilot adapter: instructions + prompts + agent | 3 file types for 3 activation models — always-on, slash command, vælgbar persona. Minimal frontmatter (only `description:`) survives Copilot version churn | 26 |
| Copilot prompt bodies reuse Claude skill bodies | `stripClaudeFrontmatter` lets us share core directives across adapters; sentinel-string tests catch drift without byte-locking | 26 |

## Active Constraints
- Zero runtime dependencies beyond Node built-ins
- All state in `.wdd/` directory as markdown/JSON files
- CLI is stateless — all state read from files per invocation
- Ward frontmatter is the source of truth for status
- CONTEXT.md max 200 lines, warning at 150

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Commands implemented | 18 | 19 |
| Tests | 190 actual | 26 |
| Wards complete | 23/23 | 26 |
| Schema version | 1.2 | 18 |
| Languages supported | TypeScript, Python | 18 |
| Adapters | claude, cursor, copilot | 26 |
| Planned wards in orchestration epic | 6 (20-25) | 19 |

## Known Issues
- Multi-line function/type signatures in `wdd api` only show the first line. Acceptable MVP.

## What Comes Next
- Ward 20: Planning Metadata Frontmatter (next planned ward in orchestration epic)
- Wards 21-25: Parallel batches, locks, review modes, visualization, contest
- Real-world validation in other projects (kmd-regelsim, vgrid)

## Release History
- 2026-06-03 — `@boringreliability/wdd@0.3.0` — Copilot adapter added.
  `wdd bootstrap copilot` emits `.github/copilot-instructions.md`, three
  `prompt.md` slash commands, and one `agent.md` persona.
- 2026-06-03 — `@boringreliability/wdd@0.2.0` — first npm publish. Name `wdd`
  squatted on registry; chose scoped package matching GitHub org. Binary is
  `wdd`. Install: `npm i -g @boringreliability/wdd`.

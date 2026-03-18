# Context — WDD CLI

## Last Updated
Ward 12 complete — 2026-03-18

## Current State
All 13 Wards complete (1-12 + 5b). CLI is fully functional with 12 commands.
Installed via `npm link` globally. Dogfooding — WDD CLI manages its own development.
Claude Code skill installed via `wdd bootstrap claude`.

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

## Active Constraints
- Zero runtime dependencies beyond Node built-ins
- All state in `.wdd/` directory as markdown/JSON files
- CLI is stateless — all state read from files per invocation
- Ward frontmatter is the source of truth for status
- CONTEXT.md max 200 lines, warning at 150

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Commands implemented | 12 | 12 |
| Tests | 102 estimated | 12 |
| Wards complete | 13/13 | 12 |

## What Comes Next
- Publish to npm as `wdd` package
- Add `wdd bootstrap windsurf` adapter
- Consider `wdd condense` for CONTEXT.md size management
- Real-world validation in other projects (kmd-regelsim)

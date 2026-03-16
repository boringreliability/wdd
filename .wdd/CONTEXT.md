# Context — WDD CLI

## Last Updated
Project initialized — 2026-03-14

## Current State
Empty project scaffold. npm + TypeScript configured. `.wdd/` structure created.
No commands implemented yet.

## Architecture Decisions Made
| Decision | Rationale | Ward |
|----------|-----------|------|
| Node.js built-in test runner | Zero dev dependency for testing, aligns with zero-dep philosophy | Init |
| ES modules (type: module) | Modern Node.js standard | Init |
| tsx for dev, tsc for build | Fast dev iteration, clean dist output | Init |

## Active Constraints
- Zero runtime dependencies beyond Node built-ins + YAML frontmatter parser
- All state in `.wdd/` directory as markdown/JSON files
- CLI is stateless — all state read from files
- Ward frontmatter is the source of truth for status

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Commands implemented | 0/10 | - |
| Tests | 0 | - |

## What Comes Next
- Ward 1: Project scaffold + `wdd init` command
- Ward 2: Ward creation (`wdd ward create`)
- Ward 3: Ward status transitions (`wdd ward status`)

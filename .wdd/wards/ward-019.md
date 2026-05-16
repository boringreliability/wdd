---
ward: 19
revision: null
name: "Dependency Graph & Ready Queue"
epic: "orchestration"
status: "planned"
dependencies: []
layer: "typescript"
estimated_tests: 8
created: "2026-05-16"
completed: null
---
# Ward 019: Dependency Graph & Ready Queue

## Scope
Make WDD's existing `dependencies` frontmatter array queryable. Build an in-memory DAG from all ward files and expose two CLI commands: `wdd graph` (text listing) and `wdd ready` (wards whose dependencies are complete and that are not themselves complete).

Foundation for the orchestration epic — no new frontmatter fields, no breaking changes. Pure consumption of existing data.

## Inputs
- All `.wdd/wards/*.md` frontmatter (Ward 1 parser)
- `parseWardId` from `src/utils/ward-id.ts`
- `Status` type from `src/utils/status.ts`

## Outputs
- `src/commands/graph.ts` exporting:
  - `buildDependencyGraph(projectDir): WardGraph`
  - `findReadyWards(graph): WardNode[]`
  - `detectCycles(graph): WardId[][]`
  - `findOrphanedDependencies(graph): { ward: WardId; missing: WardId[] }[]`
- `wdd graph` and `wdd ready` CLI commands
- Text output (mermaid deferred to Ward 24)

## Specification (sketch)

### DAG construction
Parse all wards, build map of `ward id → { name, status, dependencies, dependents }`. Reverse-index dependencies. Validate: surface cycles and orphaned references but never auto-fix.

### `wdd graph` text output
```
001 Project Scaffold + Init [✅]
 ├─ 002 Ward Creation [✅]
 │   └─ 003 Ward Status Transitions [✅]
 ├─ 007 Validate Command [✅]
 │   └─ 017 Schema Migration [✅]
 ...
```

### `wdd ready` text output
```
Ready now (3):
  019 Dependency Graph & Ready Queue [orchestration]

Blocked (4):
  020 Planning Metadata waits for: 019
  ...
```

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | builds_graph_from_wards | DAG construction from sample ward files |
| 2 | finds_ready_wards | Returns wards with all deps complete and status != complete |
| 3 | excludes_completed_from_ready | Already-complete wards not in ready list |
| 4 | detects_cycles | Identifies dependency cycles |
| 5 | detects_orphaned_dependencies | Surfaces wards referencing non-existent deps |
| 6 | handles_revision_wards | 5b, 13b, 15b participate in graph correctly |
| 7 | wdd_graph_cli | CLI prints expected tree structure |
| 8 | wdd_ready_cli | CLI lists ready wards on this project |

## Must NOT
- Do NOT add new frontmatter fields (Ward 20's job)
- Do NOT auto-fix cycles or orphans — surface only

## Must DO
- Reuse Ward 7's validate philosophy for cycle/orphan detection
- Pipe-friendly text output

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. `wdd graph` — expect tree of wards 1-18 with status emojis
2. `wdd ready` — expect Ward 19 in ready list
3. Run on a fixture with a cycle — expect error naming the cycle

### Pass criteria
- [ ] `wdd graph` renders navigable tree on this repo
- [ ] `wdd ready` identifies Ward 19 as ready
- [ ] All 166 + 8 = 174 tests pass

## Verification
- All 8 tests pass
- TypeScript compiles clean
- Manual smoke test passes

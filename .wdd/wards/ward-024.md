---
ward: 24
revision: null
name: "Graph Visualization & Critical Path"
epic: "orchestration"
status: "planned"
dependencies: [19]
layer: "typescript"
estimated_tests: 6
created: "2026-05-16"
completed: null
---
# Ward 024: Graph Visualization & Critical Path

## Scope
Visualization extensions to Ward 19's DAG: mermaid output for embedding in docs/PRs, and `wdd critical-path` for identifying the longest dependency chain (what you must not block).

Lower priority than W19-W23; pure polish on top of the DAG foundation.

## Inputs
- Ward 19's `buildDependencyGraph` and DAG utilities
- Existing markdown rendering conventions

## Outputs
- Extension to `src/commands/graph.ts`:
  - `renderMermaid(graph): string` — mermaid `graph TD` syntax
  - `findCriticalPath(graph): WardNode[]` — longest path leaf → root
- `wdd graph --format mermaid` flag
- `wdd critical-path` CLI

## Specification (sketch)

### Mermaid output
```
graph TD
  W001[001 Project Scaffold] --> W002[002 Ward Creation]
  W002 --> W003[003 Ward Status]
  ...
```

Each node colored/labeled by status:
- `complete` → solid box
- `red` → red border
- `planned` → dashed border

### Critical path
For each leaf (no dependents), find longest path back to a root. The single longest such path is the critical path.

```
Critical path (8 wards, est 73 tests):
  001 Project Scaffold + Init [✅]
  → 002 Ward Creation [✅]
  → 003 Ward Status [✅]
  → 005 Ward Complete Flow [✅]
  → 015 Manual Smoke Test [✅]
  → 020 Planning Metadata [planned]
  → 021 Parallel Batch [planned]
  → 025 Multi-Agent Contest [planned]

  Total estimated tests on path: 73
```

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | mermaid_output_syntax | Valid mermaid graph TD with all wards |
| 2 | mermaid_includes_status | Node styling reflects status |
| 3 | critical_path_finds_longest | Returns longest path in fixture DAG |
| 4 | critical_path_handles_parallel_branches | Multiple equal-length paths handled |
| 5 | wdd_graph_mermaid_cli | `--format mermaid` flag works |
| 6 | wdd_critical_path_cli | Output includes ward list and test-count total |

## Must NOT
- Do NOT make mermaid the default — text stays primary
- Do NOT compute on every `wdd graph` call if expensive — lazy

## Must DO
- Mermaid output copy-pasteable into GitHub markdown
- Critical path treats revisions (5b, 13b, 15b) correctly

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. `wdd graph --format mermaid > graph.md` — paste into markdown viewer, verify it renders
2. `wdd critical-path` — verify ward list looks plausible

### Pass criteria
- [ ] Mermaid renders in GitHub-flavor markdown
- [ ] Critical path identifies longest dependency chain
- [ ] Test counts on path summed correctly

## Verification
- All 6 tests pass
- TypeScript compiles clean
- Visual check of rendered mermaid passes

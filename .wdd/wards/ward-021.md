---
ward: 21
revision: null
name: "Parallel Batch Computation"
epic: "orchestration"
status: "planned"
dependencies: [19, 20]
layer: "typescript"
estimated_tests: 8
created: "2026-05-16"
completed: null
---
# Ward 021: Parallel Batch Computation

## Scope
Compute topologically grouped batches of wards that can safely run in parallel. Three safety levels (from [wdd_v2.md](wdd_v2.md)):

1. **Dependency-ready** — all deps complete
2. **Conflict-safe** — no overlap in touches/workstreams within batch
3. **Review-safe** — risk ≤ medium, no core architecture boundary

`wdd parallel` emits batches respecting all three.

## Inputs
- Ward 19's `buildDependencyGraph` and `findReadyWards`
- Ward 20's planning metadata (touches, workstreams, risk, parallel_safe)
- Ward 18's `matchesGlob` from utils/glob.ts for touches overlap

## Outputs
- `src/commands/parallel.ts` exporting:
  - `computeParallelBatches(graph): ParallelBatch[]`
  - `detectTouchesConflict(wardA, wardB): boolean`
- `wdd parallel` CLI command

## Specification (sketch)

### Batch computation algorithm
1. Compute topological levels from DAG
2. Within each level, group wards into sub-batches such that:
   - No two wards in same sub-batch share workstreams
   - No two wards in same sub-batch have overlapping `touches` globs
   - All wards in sub-batch have `parallel_safe: true`
3. Wards with `risk: high` or `review_mode: strict` get their own sub-batch

### Output format
```
Parallel batch 1 (3 wards):
  019 Dependency Graph & Ready Queue [orchestration]
  025 Docs: Getting Started [docs]
  026 Basic Example [examples]

Parallel batch 2 (1 ward — high risk):
  020 Planning Metadata Frontmatter [strict, must not parallelize]

Cannot parallelize yet:
  021 Parallel Batch Computation — waits for 019, 020
```

### Touch overlap check
`packages/compiler/**` and `packages/compiler/src/foo.ts` overlap → cannot share batch.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | dependency_ready_only | No batch members for wards with incomplete deps |
| 2 | groups_by_topological_level | Two wards with no dep relation can share batch |
| 3 | detects_touches_overlap | `compiler/**` vs `compiler/x.ts` flagged |
| 4 | respects_workstreams | Same workstream → cannot share batch |
| 5 | high_risk_isolates | risk=high never shares batch |
| 6 | strict_review_mode_isolates | review_mode=strict gets own batch |
| 7 | parallel_safe_false_excluded | Ward without parallel_safe=true is sequential-only |
| 8 | wdd_parallel_cli | CLI emits expected batch grouping on fixture |

## Must NOT
- Do NOT execute wards — planning only
- Do NOT modify ward files
- Do NOT block on review_mode=accelerated (can parallelize)

## Must DO
- Use Ward 18's `matchesGlob` for touches overlap
- Surface why a ward couldn't join a batch (transparency)
- Pipe-friendly text output

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
# Add planning metadata to a few fixture wards
```

### Steps
1. `wdd parallel` on this repo — expect single ward per batch (no planning metadata yet)
2. Fixture with multiple wards having distinct workstreams + parallel_safe — expect multi-ward batch
3. Test conflict: two wards with overlapping touches → separated

### Pass criteria
- [ ] Batches respect all three safety levels
- [ ] Output explains why a ward is isolated
- [ ] No fictional batching

## Verification
- All 8 tests pass
- Manual smoke test demonstrates real-world batch

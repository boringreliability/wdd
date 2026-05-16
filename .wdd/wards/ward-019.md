---
ward: 19
revision: null
name: "Dependency Graph, Ready Queue & Backlog Discoverability"
epic: "orchestration"
status: "complete"
dependencies: []
layer: "typescript"
estimated_tests: 14
created: "2026-05-16"
completed: "2026-05-16"
---
# Ward 019: Dependency Graph, Ready Queue & Backlog Discoverability

## Scope
Foundation for the orchestration epic. Three commands plus discoverability hooks:

1. **`wdd graph`** — text listing of dependency tree
2. **`wdd ready`** — wards whose dependencies are complete and that are not themselves complete
3. **Discoverability**: surface "no planned wards" loudly in `wdd session` and `wdd ready`, and detect stale BACKLOG.md items that have no corresponding planned ward

The third part addresses the meta-lesson we just learned: we developed WDD without using WDD's discipline on ourselves — `wdd_v2.md` sat as a markdown brain dump for weeks instead of being captured as planned wards. `wdd session` and `wdd validate` showed "all wards complete" with no nudge that the backlog hadn't been formalized. This Ward closes that gap.

No new frontmatter fields, no schema migration. Pure consumption of existing data.

## Inputs
- All `.wdd/wards/*.md` frontmatter (Ward 1 parser)
- `.wdd/BACKLOG.md` — existing markdown file with `- [ ] **ID**: title` items
- `parseWardId` from `src/utils/ward-id.ts`
- `Status` type from `src/utils/status.ts`
- `assembleSession` from `src/commands/session.ts` — will be extended

## Outputs
- New `src/commands/graph.ts` exporting:
  - `type WardId = string` — canonical form: `"5"` for numeric, `"5b"` for revisions (always string)
  - `interface WardNode { id: WardId; name: string; status: Status; dependencies: WardId[]; dependents: WardId[] }`
  - `type WardGraph = Map<WardId, WardNode>`
  - `interface Cycle { wards: WardId[] }` — wards in traversal order; closing edge is implicit (last → first)
  - `buildDependencyGraph(projectDir): WardGraph`
  - `findReadyWards(graph): WardNode[]`
  - `findPlannedWards(graph): WardNode[]`
  - `detectCycles(graph): Cycle[]` — explicit struct, NOT a stringified error
  - `findOrphanedDependencies(graph): Array<{ ward: WardId; missing: WardId[] }>`
- New `src/utils/backlog.ts` exporting:
  - `interface BacklogItem { id: string; title: string; priority: "P1" | "P2" | "P3"; openedAt: Date }`
  - `parseBacklog(projectDir, opts?: { openedAtResolver?: (lineNumber: number) => Date }): BacklogItem[]` — no `clock` here, `parseBacklog` doesn't need "now"
  - `findStaleBacklogItems(backlog: BacklogItem[], plannedWardBodies: string[], now: Date): BacklogItem[]` — caller filters wards to planned-status before passing bodies in
- New `src/utils/clock.ts` (small util) exporting:
  - `type Clock = () => Date`
  - `defaultClock: Clock = () => new Date()`
- New CLI commands: `wdd graph`, `wdd ready`
- Extended `assembleSession`: new PLANNED section
- Extended `wdd validate`: warns on stale backlog items AND wires `findOrphanedDependencies` (currently dead unless wired here)

## Specification

### Canonical section ordering for `assembleSession`
Currently the order is implicit (sequence of `sections.push`). This Ward formalizes it by exporting a `SESSION_SECTIONS` constant in `session.ts`:

```typescript
export const SESSION_SECTIONS = [
  "PROJECT",
  "CONTEXT",
  "PROGRESS",
  "PLANNED",   // new in Ward 19
  "EXPORTS",
  "CURRENT_WARD",
] as const;
```

`assembleSession` iterates this constant to determine which sections to emit. Future Wards inserting sections must update this constant — that's the contract.

### WardId conventions
- Always serialized/exposed as `string`, never `number`
- `5` (numeric in frontmatter) → `"5"`
- Revision wards: `5b` → `"5b"`
- Mixed frontmatter `dependencies: [5, "5b"]` is supported — both normalized to strings

### WardId canonical sort
For deterministic output (tree ordering, "first parent" tiebreakers), `WardId` is sorted by:
1. Numeric prefix ascending (`"5" < "10" < "100"` — natural numeric, NOT lexicographic)
2. Revision suffix ascending (`"5" < "5b" < "5c"` — base form sorts before any revision)

```typescript
export function compareWardId(a: WardId, b: WardId): number
```

### "First parent" definition
"First parent" of a child ward is the **first id of the child's dependency array AFTER canonical sort** via `compareWardId`. Concretely:
- Parse frontmatter `dependencies` → normalize each to string → sort with `compareWardId`
- First element is the parent under which the ward appears in the tree

Example: child with frontmatter `dependencies: [10, 5]` normalizes+sorts to `["5", "10"]` → first parent is `"5"`. The annotation on the child node becomes `(also depends on 010)`.

### Revision ward dependency semantics (must be explicit)
- Ward `5b` is a **distinct node** in the graph, NOT a replacement for ward `5`
- Dependency on `"5"` is satisfied only by `ward-005.md` having `status: complete`
- Dependency on `"5b"` is satisfied only by `ward-005b.md` having `status: complete`
- Completing `5b` does NOT auto-satisfy dependents-on-5. (In practice 5b is only created when 5 is already complete, but the graph treats them as separate nodes.)

### DAG construction
Parse all wards, build map. Reverse-index dependencies. DFS with three colors (white/gray/black) for cycle detection. Each detected cycle is recorded as a `Cycle` with `wards` ordered by traversal entry point.

### `wdd graph` text output rules
- Tree-style rendering. Roots = wards with no dependencies.
- Each ward node appears **exactly once** — under its first listed dependency parent (alphabetical/numeric tiebreaker if multiple "first" candidates).
- Wards with multiple dependencies show an annotation: `(also depends on 002, 005)` on the same line.
- Status emoji per node from `STATUS_SYMBOLS`.
- Pipe-friendly: no ANSI colors.

```
001 Project Scaffold + Init [✅]
 ├─ 002 Ward Creation [✅]
 │   └─ 003 Ward Status Transitions [✅]
 ├─ 007 Validate Command [✅]
 │   └─ 017 Schema Migration [✅]
 │       └─ 018 Configurable Scan [✅]
 ...
019 Dependency Graph, Ready Queue & Backlog Discoverability [📋]
 ├─ 020 Planning Metadata Frontmatter [📋]
 │   ├─ 021 Parallel Batch Computation [📋] (also depends on 019)
 │   ├─ 022 Ward Locking [📋]
 │   └─ 023 Review Modes [📋]
 └─ 024 Graph Visualization [📋]
```

### `wdd graph` exit code
Always 0 — `graph` is a printer, not a validator. Cycles, if any, are printed at the top of the output.

Cycle rendering matches the `Cycle` struct exactly: the closing edge is implicit, so a cycle `{wards: ["003", "005"]}` renders as `003 → 005 → 003` (the renderer appends the head explicitly to make it human-readable, even though the struct doesn't repeat it).

```
⚠ CYCLE DETECTED: 003 → 005 → 003

001 Project Scaffold + Init [✅]
...
```

(Cycle detection blocking is `wdd validate`'s job, not graph's.)

### `wdd ready` text output
```
Ready now (1):
  019 Dependency Graph, Ready Queue & Backlog Discoverability [orchestration]

Blocked (6):
  020 Planning Metadata Frontmatter — waits for: 019
  021 Parallel Batch Computation — waits for: 019, 020
  022 Ward Locking — waits for: 020
  023 Review Modes — waits for: 020
  024 Graph Visualization — waits for: 019
  025 Multi-Agent Contest — waits for: 020, 022

Complete: 21
```

### Backlog parsing rules
`BACKLOG.md` format (already established in this repo):
```markdown
### Priority 1 — Must Have
- [ ] **BUG-001**: description here
- [x] **CLI-002**: completed item (ignored)
```

Item line regex: `^- \[ \] \*\*([A-Z]+-\d+[a-z]?)\*\*:\s*(.+?)\s*$`
- Bracket must contain a single space (open item)
- ID = uppercase letters, hyphen, digits, optional single lowercase letter
- Description follows colon

Priority heading regex: `^### Priority ([123]) — `
- Maps `1`→`P1`, `2`→`P2`, `3`→`P3`
- Item without a preceding priority heading → `P3` (default lowest)

Lines that don't match are silently skipped (nested bullets, comments, blank lines).

### "Opened at" date resolution
The accurate-but-expensive way: `git blame --line-porcelain BACKLOG.md` → for each open item line, read the `author-time` field (Unix epoch).

For testability, `parseBacklog` accepts an optional `openedAtResolver: (line: number) => Date` parameter. Default implementation runs `git blame`. Tests inject a fixture resolver returning deterministic dates.

When `git` is unavailable (no `.git/` dir or `git` not in PATH), fall back to file mtime applied to ALL items uniformly — and `findStaleBacklogItems` emits a single "stale detection limited (no git history)" note in addition to whatever it finds.

### Staleness rule
An item is stale if **all three** hold:
- `now - openedAt > 30 days`
- No planned ward's body contains the item's ID as an **isolated token**
- Only **planned**-status wards are scanned (complete/red/gold/etc don't count)

### ID matching: explicit non-word lookaround
JavaScript's `\b` is unreliable for hyphenated IDs (treats `-` as non-word, but underscores are word chars). Use explicit negative lookaround instead:

```typescript
const escapedId = id.replace(/[.+^$()|[\]{}*?\\\-]/g, "\\$&");
const isolatedMatch = new RegExp(`(?<![A-Za-z0-9_-])${escapedId}(?![A-Za-z0-9_-])`);
// NO "i" flag — case-sensitive. IDs are uppercase by convention (Test 9 enforces).
// A lowercase mention in a planned ward body is just prose, not an authoritative reference.
```

The regex is **case-sensitive** by design:
- `parseBacklog` rejects lowercase-prefix IDs (Test 9)
- Therefore lowercase appearances in ward bodies are not real ID references
- Treating them as matches would inconsistently say "not stale" for IDs that were never even parseable

This correctly:
- Rejects `CLI-011` when looking for `CLI-01`
- Rejects `foo_CLI-013` when looking for `CLI-013`
- Rejects `CLI-013-bis` when looking for `CLI-013`
- Rejects `cli-013` (lowercase) when looking for `CLI-013`
- Accepts `mentions CLI-013 here` and `(CLI-013)` and `CLI-013.`

### `assembleSession` PLANNED section
```
═══ PLANNED ═══
Ready: 019 Dependency Graph, Ready Queue & Backlog Discoverability
Blocked: 6 wards (020, 021, 022, 023, 024, 025)

⚠ Backlog warnings:
  - CLI-013 ('wdd bootstrap windsurf') is open in BACKLOG.md but no planned ward references it (opened >30 days ago)
```

If no planned wards exist (the trap we fell into):
```
═══ PLANNED ═══
⚠ No planned wards.

  Either the backlog needs formalizing, or there's truly nothing planned.
  Check `.wdd/BACKLOG.md` for open items.
  Run `wdd ward create "Name" --epic <slug>` to create a planned ward.
```

This empty-state block MUST satisfy three concrete checks (Test 11 enforces):
1. Section header `═══ PLANNED ═══` present
2. Warning line begins with the `⚠` sentinel
3. Warning text contains BOTH the strings `BACKLOG.md` AND `wdd ward create`

### `wdd validate` integration
Adds a warning category (not error):
```
WARN: BACKLOG.md has 1 stale item (>30 days, no planned ward):
  - CLI-013: 'wdd bootstrap windsurf'
```

Plus surfaces orphaned dependencies as warnings (wires `findOrphanedDependencies` into validate output):
```
WARN: Ward 023 depends on ward 099 which does not exist
```

Both warnings — never errors. Stale items and orphans don't block validate.

### Clock injection
`Clock` util is plumbed through:
- `findStaleBacklogItems(backlog, plannedWardBodies, now: Date)` — takes `now` directly
- `validateProject(projectDir, opts?: { clock?: Clock })` — extended for testability
- `assembleSession(projectDir, opts?: { clock?: Clock })` — extended for testability (PLANNED section uses stale detection)

Both CLI surfaces `wdd validate` AND `wdd session` honor the `WDD_NOW` env var (ISO date string, e.g., `WDD_NOW=2026-07-01T00:00:00Z`). The env var is read **once at CLI boundary**, converted to a `Clock`, and passed down. If unset, `defaultClock` is used.

`parseBacklog` does NOT take a clock — it only parses, doesn't compute staleness.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | builds_graph_from_wards | DAG nodes have expected `{id, name, status, dependencies, dependents}` shape |
| 2 | finds_ready_wards | Returns wards with all deps complete and status != complete |
| 3 | excludes_completed_from_ready | Already-complete wards not in ready list |
| 4 | detects_cycles_returns_cycle_struct | `detectCycles` returns `Cycle[]` with ordered ward list — NOT a string or boolean |
| 5 | detects_orphaned_dependencies | Surfaces wards referencing non-existent deps as `{ward, missing[]}` |
| 6a | revision_ward_distinct_node | `5b` is a separate node from `5`; deps on `5` and `5b` are tracked separately |
| 6b | revision_ward_mixed_dep_types | Frontmatter `dependencies: [5, "5b"]` produces `node.dependencies === ["5", "5b"]` AND `graph.get("5b").dependents` contains the test ward (edge structure asserted, not just normalization) |
| 6c | revision_completion_does_not_satisfy_base | Completing `5b` does NOT mark dependents-of-`5` as ready |
| 7 | wdd_graph_cli_first_parent_only | Multi-parent wards appear under first listed parent (after canonical sort) with "(also depends on N,M)" annotation |
| 8 | wdd_ready_cli | CLI lists ready + blocked counts on fixture |
| 9 | parses_backlog_open_items_strict | Regex extracts `[ ]` items with priority mapping; rejects: `[x]`, nested bullets, lowercase id (`bug-001`), underscore separator (`CLI_013`), multi-letter suffix (`CLI-013ab`) |
| 10 | finds_stale_with_lookaround | Items >30 days old (via injected `now` Date) flagged; lookaround rejects `CLI-01` matching `CLI-011` AND `foo_CLI-013` AND `CLI-013-bis` AND lowercase `cli-013`; accepts `(CLI-013)` and `CLI-013.`; only planned-status wards scanned |
| 11 | session_planned_section_loud_empty | Empty-state output contains: (a) header `═══ PLANNED ═══`, (b) line starting with `⚠`, (c) text including `BACKLOG.md`, (d) text including `wdd ward create` — all four assertions |
| 12 | session_planned_section_with_wards | Populated output lists ready ward names and blocked count in expected position per `SESSION_SECTIONS` |
| 13 | validate_surfaces_orphans_and_stale | `wdd validate` emits WARN for stale backlog items AND orphaned deps; exit code stays 0; honors injected clock |
| 14 | session_sections_constant_enforced | `SESSION_SECTIONS` referencing an unimplemented section name causes `assembleSession` to throw with a clear "no handler for section X" error (contract enforcement test) |

## Must NOT
- Do NOT add new frontmatter fields (Ward 20's job)
- Do NOT auto-fix cycles, orphans, or stale backlog — surface only
- Do NOT modify BACKLOG.md (read-only; BUG-001 cleanup is a separate followup commit, not part of this Ward)
- Do NOT use `new Date()` directly inside library functions — accept `clock: Clock` parameter
- Do NOT crash on malformed BACKLOG.md — skip unparseable lines and continue
- Do NOT crash if `git` is unavailable — fall back to mtime with a "limited" note
- Do NOT make `wdd graph` exit non-zero on cycles — it's a printer; validate handles policy
- Do NOT silently drop sections from `assembleSession` if `SESSION_SECTIONS` references something unimplemented — error loudly so future Wards can't break the order contract

## Must DO
- Export `SESSION_SECTIONS` constant from `session.ts` and iterate over it
- Use canonical `WardId = string` everywhere (no `number | string` unions)
- Plumb `Clock` through library functions; honor `WDD_NOW` env var at CLI boundary
- Wire `findOrphanedDependencies` into `wdd validate` warnings — otherwise it's dead code
- Pipe-friendly text output (no ANSI colors)
- Empty-state messaging must be loud per the three concrete assertions in Test 11
- All revision ward edge cases (Tests 6a/6b/6c) treated as first-class

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. `wdd graph` — expect tree of wards 1-25 with status emojis, multi-parent annotations correct, no cycle warning at top
2. `wdd ready` — expect Ward 19 in ready list, Wards 20-25 in blocked list with correct "waits for" reasons, "Complete: 21" footer
3. `wdd session` — verify new PLANNED section appears between PROGRESS and EXPORTS, includes our orchestration wards
4. Modify a fixture BACKLOG.md to add a stale item (use `WDD_NOW` env var to make "now" 60 days in the future for the test) — verify `wdd validate` emits WARN
5. Empty-state test: fixture project with no planned wards, run `wdd session` — verify it prints the loud warning with all three required strings
6. Cycle test: fixture project where ward A depends on B, B depends on A — `wdd graph` prints `⚠ CYCLE DETECTED:` at top but exits 0; `wdd validate` warns (also exits 0 since cycles aren't errors)
7. Run `wdd validate` against this repo — expect WARN about BUG-001 (stale, fixed in Ward 16 but still `- [ ]` in backlog)

### Pass criteria
- [ ] `wdd graph` renders navigable tree, multi-parent annotations present
- [ ] `wdd ready` identifies Ward 19 as ready, lists blocked wards with reasons
- [ ] `wdd session` PLANNED section appears in correct position per `SESSION_SECTIONS`
- [ ] Empty-state warning loud (header + ⚠ + BACKLOG.md + wdd ward create)
- [ ] `wdd validate` warns about stale backlog items without erroring
- [ ] Cycle detection produces clear warning, no non-zero exit
- [ ] `WDD_NOW` env var override works for CLI testing
- [ ] All existing tests + 14 new tests pass (current baseline: 166; if other wards land first, adjust accordingly)

## Verification
- All 14 tests pass
- Manual smoke test passes end-to-end
- TypeScript compiles clean
- `SESSION_SECTIONS` constant is the single source of section ordering, enforced by Test 14
- Lookaround stale match correctly distinguishes `CLI-01` from `CLI-011`, `foo_CLI-013`, and `CLI-013-bis`
- Revision ward semantics enforced by Tests 6a/6b/6c
- `WDD_NOW` env var works for both `wdd validate` and `wdd session`

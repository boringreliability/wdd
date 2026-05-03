---
ward: 16
revision: null
name: "Wiring Verification & CLI Fixes"
epic: "core-cli"
status: "complete"
dependencies: [6, 15]
layer: "typescript"
estimated_tests: 10
created: "2026-05-03"
completed: "2026-05-03"
---
# Ward 016: Wiring Verification & CLI Fixes

## Scope
Address the wiring blind-spot we hit repeatedly across Wards 13b → 14 → 15 (renamed export not propagated to test imports, smoke-test directive only reaching one of three skills, fix-ward template missing Manual Smoke Test section). The fix is twofold:

1. **`wdd api` command** — generate an export inventory of `src/**/*.ts` so the AI gets a structural map of "what's already available" at session start. Prevents reinvention by making existing functions, types, and constants visible.
2. **Concrete CLI bug fixes** discovered during recent Wards: `parseInt` in CLI handlers strips revision suffixes ("15b" → 15), and the reopen-ward body template predates Ward 15 so it lacks the now-mandatory Manual Smoke Test section.

This Ward closes three known wiring gaps and adds the visibility tool that should have caught them earlier. Together with Ward 15's Manual Smoke Test Protocol, Ward 16 completes the pair: humans verify what the system does (Ward 15), AI sees what the system has (Ward 16).

## Inputs
- Existing utilities introduced during simplify: [src/utils/ward-id.ts](src/utils/ward-id.ts) `parseWardId()`
- [src/commands/ward-status.ts](src/commands/ward-status.ts) `updateWardStatus()` — already accepts `number | string`
- [src/commands/session.ts](src/commands/session.ts) — currently assembles PROJECT/CONTEXT/PROGRESS/CURRENT WARD
- [src/templates/ward-body.ts](src/templates/ward-body.ts) `WARD_BODY_TEMPLATE` — has Manual Smoke Test section
- [src/commands/ward-reopen.ts](src/commands/ward-reopen.ts) — has hardcoded fix-ward body without smoke section

## Outputs
- New `src/commands/api.ts` exporting `inventoryExports(projectDir): ExportInventory` and CLI handler
- `wdd api [--file <pattern>] [--kind <function|interface|type|const|class>]` command
- Updated [src/cli.ts](src/cli.ts) — `ward status`, `ward reopen`, `complete` handlers pass string IDs (no parseInt)
- Updated `completeWard()` and `reopenWard()` signatures: `wardId: number | string`, internal use of `parseWardId()`
- Updated `reopenWard()` fix-ward body to include `## Manual Smoke Test` section
- Updated [src/commands/session.ts](src/commands/session.ts) — adds `═══ EXPORTS ═══` section using `inventoryExports()`

## Specification

### Export Inventory (`wdd api`)

#### API
```typescript
export interface ExportEntry {
  name: string;
  kind: "function" | "interface" | "type" | "const" | "class";
  signature?: string;  // First line for functions/types, omit for const
}

export interface FileExports {
  file: string;        // path relative to projectDir, e.g., "src/utils/ward-id.ts"
  exports: ExportEntry[];
}

export type ExportInventory = FileExports[];

export function inventoryExports(
  projectDir: string,
  filter?: { file?: string; kind?: ExportEntry["kind"] }
): ExportInventory;
```

#### Scanner
- Walk `src/**/*.ts` recursively
- Skip `*.test.ts` files
- Skip `dist/`, `node_modules/` (won't match `src/` anyway)
- Regex-based parser (zero-deps, no TypeScript compiler API):
  - `^export function (\w+)` → `function`
  - `^export async function (\w+)` → `function`
  - `^export interface (\w+)` → `interface`
  - `^export type (\w+)` → `type`
  - `^export const (\w+)` → `const`
  - `^export class (\w+)` → `class`
  - For functions/types, capture signature up to opening `{` or `;` (first line)

#### CLI output
```
src/utils/ward-id.ts
  function  formatWardId(num: number, revision?: string | null): string
  function  wardFilename(num: number, revision?: string | null): string
  function  parseWardId(id: number | string): { num: number; revision: string | null } | null

src/utils/section.ts
  function  extractSection(body: string, heading: string): string

...

42 exports across 12 files
```

With `--file utils/` filter, only files whose path includes `utils/` are shown.
With `--kind function` filter, only function exports are shown.

### Session Integration
`assembleSession()` adds a new section between PROGRESS and CURRENT WARD:

```
═══ EXPORTS ═══
{output of inventoryExports() formatted as above}

═══ CURRENT WARD: ...
```

Total session output should still be pipe-friendly. Inventory length grows linearly with codebase size — acceptable for now; a future Ward might add `--brief` flag.

### CLI Revision-Aware ID Parsing
Three handlers in [src/cli.ts](src/cli.ts) currently do `parseInt(wardId, 10)`:

```typescript
case "status": ... await updateWardStatus(process.cwd(), parseInt(wardId, 10), newStatus, feedback);
case "reopen": ... await reopenWard(process.cwd(), parseInt(wardId, 10), reason);
case "complete": ... await completeWard(process.cwd(), parseInt(wardId, 10));
```

Fix: pass `wardId` as string. `updateWardStatus` already accepts `number | string`. `reopenWard` and `completeWard` need signature update + internal use of `parseWardId()` to extract num + revision and `wardFilename()` to build paths.

### Reopen Body Template Parity
Current `reopenWard()` writes a body lacking Manual Smoke Test. After Ward 15 made this section mandatory, fix wards should also include it. Add the same section structure used by `WARD_BODY_TEMPLATE`.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | api_inventory_finds_known_exports | Includes `extractSection`, `formatWardId`, `getClaudeSkills`, etc. |
| 2 | api_inventory_excludes_test_files | `*.test.ts` files are not scanned |
| 3 | api_inventory_categorizes_kind | function/interface/type/const correctly identified |
| 4 | api_inventory_filter_by_file | `--file utils/` returns only utils/ entries |
| 5 | api_inventory_filter_by_kind | `--kind function` returns only function exports |
| 6 | session_includes_exports_section | `wdd session` output contains `═══ EXPORTS ═══` |
| 7 | complete_accepts_revision_string | `completeWard(dir, "15b")` resolves ward-015b.md |
| 8 | reopen_accepts_revision_string | `reopenWard(dir, "15b", reason)` works (after first creating ward-015c) |
| 9 | cli_status_revision_id | `wdd ward status 15b red` (via execFile) targets ward-015b.md correctly |
| 10 | reopen_body_has_smoke_test_section | New fix-ward body contains `## Manual Smoke Test` |

## Must NOT
- Do NOT add a TypeScript parser library — regex scanner is the contract
- Do NOT type-check or analyze types semantically — `wdd api` lists only what's exported by name + kind
- Do NOT include `.test.ts` files in inventory output
- Do NOT change `updateWardStatus()` signature — already accepts `number | string`
- Do NOT add markdown rendering or color output to `wdd api` — pipe-friendly plain text only
- Do NOT regenerate skill files automatically when CLI fixes land — bootstrap re-runs are explicit

## Must DO
- Use [src/utils/ward-id.ts](src/utils/ward-id.ts) `parseWardId()` and `wardFilename()` in completeWard and reopenWard refactor
- Wire `wdd api` into cli.ts switch
- Add EXPORTS section to assembleSession after PROGRESS
- Reuse the Manual Smoke Test markdown structure from `WARD_BODY_TEMPLATE` in reopen body (consider exporting a `MANUAL_SMOKE_TEST_SECTION` constant if it makes the reopen template cleaner)
- Document the `wdd api` command in adapter content (`getSharedContent`) so AI knows about it

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. Run: `wdd api`
   Expected: tabular listing of exports across `src/**/*.ts`, including `extractSection`, `formatWardId`, `parseWardId`, `getClaudeSkills`, `regenerateProgress` etc. Footer shows total count.
2. Run: `wdd api --file utils/`
   Expected: only entries from `src/utils/*.ts` (status, ward-id, config, section)
3. Run: `wdd api --kind interface`
   Expected: only `interface` exports (e.g., `ParsedDocument`, `WddConfig`, `ExportEntry`, `ValidationResult`, etc.)
4. Run: `wdd session | grep -A 2 "═══ EXPORTS ═══"`
   Expected: EXPORTS section appears between PROGRESS and CURRENT WARD
5. Repro the parseInt bug fix end-to-end:
   ```bash
   rm -rf /tmp/wdd-w16 && mkdir /tmp/wdd-w16 && cd /tmp/wdd-w16
   wdd init --name "w16-smoke"
   wdd ward create "Test" --epic core --layer typescript --tests 1
   wdd ward status 1 red && wdd ward status 1 approved && wdd ward status 1 gold && wdd complete 1
   wdd ward reopen 1 --reason "test fix"
   wdd ward status 1b red          # <-- this was the bug; should now work
   ```
   Expected: every command exits 0; ward-001b.md transitions to red successfully.
6. Run: `cat /tmp/wdd-w16/.wdd/wards/ward-001b.md | grep -A 3 "Manual Smoke Test"`
   Expected: fix-ward body now contains a `## Manual Smoke Test` section

### Pass criteria
- [ ] `wdd api` lists all exports across `src/utils/`, `src/commands/`, `src/templates/`, `src/frontmatter.ts`, `src/cli.ts`
- [ ] `wdd session` includes EXPORTS section in output
- [ ] `wdd ward status 1b <status>` works for revision-suffix wards
- [ ] `wdd complete 1b` works for revision-suffix wards
- [ ] `wdd ward reopen` produces a fix-ward whose body contains Manual Smoke Test section
- [ ] All existing 134 + 10 = 144 tests pass

## Verification
- All 10 new tests pass
- All 134 existing tests still pass (no regression)
- Manual smoke test above passes end-to-end
- TypeScript compiles with zero errors
- Re-running `wdd bootstrap claude` against this repo regenerates skill files that reference `wdd api` in adapter content

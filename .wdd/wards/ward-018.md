---
ward: 18
revision: null
name: "Configurable Scan & Multi-Language API"
epic: "core-cli"
status: "complete"
dependencies: [16, 17]
layer: "typescript"
estimated_tests: 13
created: "2026-05-03"
completed: "2026-05-16"
---
# Ward 018: Configurable Scan & Multi-Language API

## Scope
Remove the `wdd api` command's hardcoded TypeScript+`src/` assumption. Make scan paths, file extensions, and exclude patterns data in `config.json` rather than constants in source. Add a parser registry so non-TS languages (starting with Python) are first-class. Introduce `wdd configure` to detect repository structure and suggest scan config — the AI agent setting up WDD can use it during onboarding.

This Ward fixes a real-world dogfooding limitation: WDD currently only works for JS/TS projects with code in `src/`. Python repos, Rust crates, Go modules, monorepos with `apps/*` or `packages/*` — all invisible to `wdd api` today.

Also bumps schema 1.1 → 1.2 with a corresponding migration that adds the `scan` block (with TS defaults so existing 1.1 projects keep working) — the second use of the schema-version contract introduced in Ward 17.

## Inputs
- [src/commands/api.ts](src/commands/api.ts) `inventoryExports()` — currently hardcodes `src/` and `.ts`/`.tsx`
- [src/utils/config.ts](src/utils/config.ts) `WddConfig` — needs `scan` field
- [src/commands/upgrade.ts](src/commands/upgrade.ts) `MIGRATIONS` — extend with 1.1 → 1.2 entry
- [src/templates/adapter-content.ts](src/templates/adapter-content.ts) — bootstrap content needs to mention `wdd configure`

## Outputs
- Extended `WddConfig.scan` field: `{ roots, extensions, exclude }` with TS defaults
- New parser registry in `src/commands/api.ts` — `LanguageParser[]` indexed by extension
- Built-in parsers: TypeScript (existing), Python (new in this Ward)
- New `src/commands/configure.ts` exporting `detectScanConfig(projectDir): ScanConfig` and `wdd configure [--write]` CLI command
- Bumped `CURRENT_SCHEMA_VERSION` from "1.1" to "1.2" + migration entry
- Updated adapter content so `/wdd` skill instructs AI to run `wdd configure --write` after `wdd init` on existing projects

## Specification

### Scan Config Schema
Add to `WddConfig`:

```typescript
export interface ScanConfig {
  roots: string[];          // glob-supporting paths from project root, e.g., ["src/", "packages/*/src/"]
  extensions: string[];     // [".ts", ".tsx"] or [".py"]
  exclude: string[];        // glob patterns, e.g., ["**/*.test.ts", "**/dist/**", "**/node_modules/**"]
}

export interface WddConfig {
  // ... existing fields ...
  scan?: ScanConfig;        // optional — defaults applied if missing
}
```

Default scan config (used when `scan` is missing):

```typescript
const DEFAULT_SCAN: ScanConfig = {
  roots: ["src/"],
  extensions: [".ts", ".tsx"],
  exclude: ["**/*.test.ts", "**/*.spec.ts", "**/*.d.ts", "**/dist/**", "**/node_modules/**"],
};
```

### Parser Registry
Refactor `inventoryExports` to look up parsers by extension:

```typescript
interface LanguageParser {
  name: string;            // "typescript", "python"
  extensions: string[];
  scanLine(line: string): { name: string; kind: ExportEntry["kind"]; signature?: string } | null;
}

const PARSERS: LanguageParser[] = [TS_PARSER, PYTHON_PARSER];
```

**TypeScript parser** — existing patterns moved into a parser object.

**Python parser**:
- `^def (\w+)` → function (with signature: line up to `:` or `->`)
- `^async def (\w+)` → function
- `^class (\w+)` → class
- `^([A-Z_][A-Z0-9_]*)\s*=` → const (top-level UPPER_SNAKE_CASE — heuristic for "exported" Python constants)
- Skip lines starting with whitespace (only top-level matters)
- Skip lines starting with `_` (private convention)

Python doesn't have `interface` or `type` in the same sense. Map appropriately:
- Pydantic-style `class Foo(BaseModel)` could be detected as "type" — out of scope for MVP

### Glob Support in Roots and Exclude
For `roots` like `packages/*/src/`, expand using basic glob matching:
- `*` matches any single path segment (no slashes)
- `**` matches any number of segments

Use a small built-in glob matcher (zero deps). Existing exclude patterns already need this.

### `wdd configure` Command

#### Detection logic
- Walk the project root (one level deep, then targeted dives)
- Look for these candidate roots in order:
  - `src/` (TypeScript/JavaScript convention)
  - `lib/` (alternate TS/JS, Ruby, Elixir)
  - `app/` (Rails, generic)
  - `apps/*/src/` (monorepo)
  - `packages/*/src/` (monorepo)
  - `cmd/` (Go conventions)
  - `pkg/` (Go internal pkg)
  - bare project root with `*.py` files (flat Python project)
- Detect file extensions from sample of files in detected roots
- Build `exclude` list from detected file types (`.test.ts` if any test files found, etc.)

#### Output
Default: print detected config as JSON + summary, don't modify config.json.

```
Detected scan configuration:
  roots:      ["src/"]
  extensions: [".ts", ".tsx"]
  exclude:    ["**/*.test.ts", "**/*.spec.ts", "**/*.d.ts", "**/dist/**", "**/node_modules/**"]

Found 12 .ts files and 8 .tsx files in src/.

To apply: wdd configure --write
```

With `--write`: update `.wdd/config.json` to set `scan` field to detected values.

### Migration: 1.1 → 1.2
Adds `scan` block to existing config.json with `DEFAULT_SCAN` values. Idempotent — checks if `scan` already exists. Doesn't run detection; user/AI runs `wdd configure --write` separately when they want auto-detection.

### Adapter Content Update
Add a line to the `/wdd` skill content table noting: `wdd configure [--write]` — detect scan paths for non-TS or non-`src/` projects.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | inventory_uses_config_roots | `inventoryExports` reads `roots` from config.json |
| 2 | inventory_uses_config_extensions | Custom `extensions` (e.g., [".py"]) controls what files are scanned |
| 3 | inventory_supports_glob_roots | `packages/*/src/` glob root matches multiple monorepo dirs |
| 4 | inventory_uses_config_exclude | `exclude` glob patterns skip matching files |
| 5 | inventory_falls_back_to_defaults | Missing `scan` block uses TS defaults AND default exclude filters (test/spec/d.ts/dist/node_modules) |
| 6 | python_parser_detects_def_class | Python parser finds `def`, `async def`, `class` |
| 7 | python_parser_skips_private | Underscore-prefixed names not in inventory |
| 8 | python_parser_detects_uppercase_const | Top-level `UPPER_CASE = ...` detected as const |
| 9 | parser_registry_routes_by_extension | Mixed `.ts` + `.py` repo: each file uses its appropriate parser, no cross-contamination |
| 10 | configure_detects_src_layout | Standard `src/`+TS layout produces TS scan config |
| 11 | configure_detects_python_layout | Repo with `*.py` files produces Python scan config |
| 12 | configure_write_updates_config | `writeScanConfig` applies detected config to config.json |
| 13 | upgrade_1_1_to_1_2_adds_scan_block | Migration adds default scan; idempotent; preserves existing scan if present |

## Must NOT
- Do NOT use a glob library — write a small glob matcher (zero-deps principle)
- Do NOT use a TypeScript parser library or Python AST library — keep regex-based scanners
- Do NOT make `wdd configure` interactive (no readline prompts) — output is structured, AI/human decides whether to `--write`
- Do NOT remove `inventoryExports`'s ability to work without scan config — defaults must continue to work
- Do NOT break Ward 16's existing tests — TS-default behavior must be byte-equivalent
- Do NOT include languages beyond TypeScript and Python in this Ward — Go/Rust are future Wards

## Must DO
- Add `ScanConfig` to `WddConfig` interface in [src/utils/config.ts](src/utils/config.ts)
- Refactor `inventoryExports` around the parser registry; existing TS regex moved into TS_PARSER
- Implement Python parser with stated patterns
- Provide `detectScanConfig()` exported from `configure.ts` so tests can call it directly without CLI
- Wire `wdd configure [--write]` into cli.ts switch
- Bump `CURRENT_SCHEMA_VERSION` to "1.2" and add migration entry to MIGRATIONS registry
- Update adapter content so `/wdd` skill mentions `wdd configure`
- Run `wdd configure` against this project in the manual smoke test — expect TS defaults detected

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. Run: `wdd configure` against this repo
   Expected: detected config with `roots: ["src/"]`, `extensions: [".ts", ".tsx"]`, no `--write` so config.json untouched
2. Run: `wdd api --kind function | wc -l`
   Expected: same count as before Ward 18 (TS defaults preserved)
3. Create a fixture Python project:
   ```bash
   rm -rf /tmp/wdd-w18-py && mkdir /tmp/wdd-w18-py && cd /tmp/wdd-w18-py
   wdd init --name "py-smoke"
   mkdir -p src
   cat > src/main.py <<'EOF'
   def public_func():
       pass

   async def async_func():
       pass

   class PublicClass:
       pass

   def _private():
       pass

   API_KEY = "abc"
   _internal = "x"
   EOF
   ```
4. Run: `wdd api` — expect empty (TS defaults don't match .py)
5. Run: `wdd configure`
   Expected: detects `extensions: [".py"]`
6. Run: `wdd configure --write`
   Expected: config.json updated with Python scan config
7. Run: `wdd api`
   Expected: lists `public_func` (function), `async_func` (function), `PublicClass` (class), `API_KEY` (const). Does NOT list `_private` or `_internal`.
8. Test 1.1 → 1.2 migration:
   ```bash
   sed -i '' 's/"wdd_version": "1.2"/"wdd_version": "1.1"/' .wdd/config.json
   # Manually remove scan block to simulate pre-1.2 state
   wdd upgrade
   ```
   Expected: migration adds default `scan` block, version bumped to 1.2

### Pass criteria
- [ ] `wdd configure` detects current repo correctly (TS defaults)
- [ ] `wdd api` still works on this repo without changes (defaults preserved)
- [ ] Python fixture: `wdd configure --write` then `wdd api` lists Python exports
- [ ] Python parser respects underscore-private convention
- [ ] Migration 1.1 → 1.2 adds scan block idempotently
- [ ] All 153 + 11 = 164 tests pass

## Verification
- All 11 new tests pass
- All 153 existing tests still pass (no regression — Ward 16 tests must continue to work with the parser-registry refactor)
- Manual smoke test passes end-to-end against both TS and Python fixtures
- TypeScript compiles with zero errors
- This project's own config.json is migrated 1.1 → 1.2 (dogfooding)
- `wdd api` on this repo produces same inventory as before Ward 18 (TS defaults are byte-equivalent)

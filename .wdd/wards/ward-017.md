---
ward: 17
revision: null
name: "Schema Migration & Upgrade"
epic: "core-cli"
status: "complete"
dependencies: [1, 7, 15]
layer: "typescript"
estimated_tests: 9
created: "2026-05-03"
completed: "2026-05-03"
---
# Ward 017: Schema Migration & Upgrade

## Scope
Add `wdd upgrade` command that migrates older `.wdd/` initializations forward to the current schema version. Without this, projects initialized before later Wards (e.g., before Ward 15's Manual Smoke Test section, before Ward 14's eval support) will have stale templates and missing structure — and there's no mechanism to fix them short of `wdd init --force` (which would destroy ward content).

Establish the **schema version contract**: `config.json#wdd_version` becomes the source of truth for which schema a project is on. Bumping this version requires a corresponding migration entry. Initial baseline: existing projects (including this one) are at "1.0"; this Ward introduces "1.1" with template refresh as the first migration.

The migration registry is forward-looking — Ward 18+ can add migrations as schema evolves without changing `upgrade.ts` structurally.

## Inputs
- [src/utils/config.ts](src/utils/config.ts) `readConfig()` / `WddConfig` interface — already has `wdd_version` field
- [src/commands/init.ts](src/commands/init.ts) — knows current canonical structure (required dirs, templates, config defaults)
- [src/templates/ward-body.ts](src/templates/ward-body.ts) `WARD_BODY_TEMPLATE` — current canonical ward body
- [src/commands/validate.ts](src/commands/validate.ts) `REQUIRED_FILES` / `REQUIRED_DIRS` — what a valid project must have

## Outputs
- New `src/commands/upgrade.ts` exporting:
  - `CURRENT_SCHEMA_VERSION` constant ("1.1")
  - `MIGRATIONS` registry (map of `from → migrationFn`)
  - `upgradeProject(projectDir, options): UpgradeResult` orchestrator
- `wdd upgrade [--dry-run] [--force]` CLI command
- Bumped default `wdd_version` in [src/commands/init.ts](src/commands/init.ts) config writer from "1.0" to "1.1" so new projects start at current
- This project's own `.wdd/config.json` `wdd_version` bumped from "1.0" to "1.1" as part of Ward 17 completion (validates dogfooding)

## Specification

### Schema Version Contract

```typescript
export const CURRENT_SCHEMA_VERSION = "1.1";
```

Versioning rules:
- Format: `"<major>.<minor>"` (semver subset; patch reserved if needed)
- Bump minor for backward-compatible additions (new optional fields, new template sections, new directories)
- Bump major for breaking changes (renamed required fields, restructured directories) — would require destructive migration with explicit `--force`
- Every bump requires a corresponding entry in `MIGRATIONS`

### Migration Registry

```typescript
type MigrationFn = (projectDir: string, dryRun: boolean) => MigrationStep[];

interface MigrationStep {
  action: "create" | "overwrite" | "ensure-dir" | "patch";
  path: string;       // relative to projectDir
  description: string;
}

interface UpgradeResult {
  fromVersion: string;
  toVersion: string;
  migrations: Array<{ version: string; steps: MigrationStep[] }>;
  dryRun: boolean;
}

export const MIGRATIONS: Record<string, MigrationFn> = {
  "1.0": migrateFrom_1_0_to_1_1,
};
```

### Migration: 1.0 → 1.1
The "1.1" schema includes everything Wards 1-16 introduced. Migration from 1.0:

1. **Refresh `.wdd/templates/ward.md`** — overwrite with current `WARD_BODY_TEMPLATE` (with frontmatter prefix). Older versions lack the Manual Smoke Test section.
2. **Ensure required directories** — create any missing `wards/`, `epics/`, `reviews/`, `memory/{decisions,learnings,snapshots}`, `templates/`, `adapters/`. Idempotent — never deletes.
3. **Ensure required files** — create stub PROGRESS.md if missing (regenerate from wards/), stub BACKLOG.md if missing. Never overwrites existing.
4. **Bump `wdd_version`** in config.json from "1.0" to "1.1".

Migration must be idempotent: running `wdd upgrade` twice on a 1.0 project is the same as running once.

### `wdd upgrade` Command Behavior

- **No-op case**: project already at `CURRENT_SCHEMA_VERSION` → print "Already on current schema version" and exit 0
- **Normal case**: detect `wdd_version`, run all migrations from there to current in order, print summary of changes
- **`--dry-run`**: compute migration steps but don't execute them; print what would happen
- **Missing `wdd_version`**: treat as "1.0" with a warning
- **Higher version than current**: error — the project is from a newer CLI; do nothing
- **Unknown version**: error with available versions list

Output format:
```
Upgrading from 1.0 to 1.1

Migration 1.0 → 1.1:
  ensure-dir   .wdd/memory/snapshots/
  overwrite    .wdd/templates/ward.md
  patch        .wdd/config.json (wdd_version: "1.0" → "1.1")

3 changes applied.
```

### Init Update
Default `wdd_version` written by `wdd init` bumped from `"1.0"` to `CURRENT_SCHEMA_VERSION` (imported from `upgrade.ts`). New projects start at current — no immediate upgrade needed.

### Validate Awareness (Optional but Recommended)
`wdd validate` could warn if `wdd_version < CURRENT_SCHEMA_VERSION`. **Out of scope for this Ward** — keep separation of concerns. Future Ward can add this gentle nudge.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | upgrade_noop_at_current | Project already at CURRENT_SCHEMA_VERSION returns no migrations |
| 2 | upgrade_1_0_to_1_1_refreshes_template | `.wdd/templates/ward.md` overwritten with current `WARD_BODY_TEMPLATE` |
| 3 | upgrade_1_0_to_1_1_ensures_dirs | Missing required directories are created |
| 4 | upgrade_1_0_to_1_1_preserves_user_content | Existing ward files, CONTEXT.md, PROJECT.md NOT modified |
| 5 | upgrade_1_0_to_1_1_bumps_version | config.json `wdd_version` becomes "1.1" |
| 6 | upgrade_dry_run_no_changes | `--dry-run` returns steps but doesn't write any files |
| 7 | upgrade_idempotent | Running upgrade twice equals running once (second run = no-op) |
| 8 | upgrade_missing_version_treats_as_1_0 | Missing `wdd_version` → run from-1.0 migration |
| 9 | upgrade_rejects_higher_version | `wdd_version: "9.9"` returns error, exits non-zero |

## Must NOT
- Do NOT touch user content: ward files, epic files, PROJECT.md, CONTEXT.md, memory/* — these are user data
- Do NOT delete anything (additive only)
- Do NOT regenerate adapter files (`.claude/skills/`, `.cursor/rules/`) — bootstrap is user-initiated
- Do NOT silently downgrade if `wdd_version > CURRENT_SCHEMA_VERSION`
- Do NOT add a destructive `--force` semantics yet; the only flag in scope is `--dry-run`
- Do NOT couple `wdd upgrade` to `wdd validate` — keep them orthogonal

## Must DO
- Use [src/utils/config.ts](src/utils/config.ts) `readConfig()` and `configPath()` for config IO
- Migrations must be idempotent — re-running is safe
- Print human-readable summary of every change applied (or proposed in dry-run)
- Bump `CURRENT_SCHEMA_VERSION` and add migration entry in the same Ward — these always travel together
- Update `init.ts` to write `wdd_version: CURRENT_SCHEMA_VERSION` on new projects
- After implementing, run `wdd upgrade` against this very project to bump it from 1.0 → 1.1 (dogfooding)

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. Create a "1.0" fixture project:
   ```bash
   rm -rf /tmp/wdd-w17 && mkdir /tmp/wdd-w17 && cd /tmp/wdd-w17
   wdd init --name "w17-smoke"
   # Manually downgrade for the smoke test:
   sed -i '' 's/"wdd_version": "1.1"/"wdd_version": "1.0"/' .wdd/config.json
   # Strip the Manual Smoke Test section from templates/ward.md so we can verify it gets refreshed:
   sed -i '' '/## Manual Smoke Test/,/## Verification/{/## Verification/!d;}' .wdd/templates/ward.md
   ```
   Expected: `wdd_version: "1.0"`, template lacks Manual Smoke Test section
2. Run: `wdd upgrade --dry-run`
   Expected: prints "Upgrading from 1.0 to 1.1" with steps including template overwrite and version patch — but no files modified
3. Verify nothing changed: `grep "wdd_version" .wdd/config.json`
   Expected: still `"1.0"`
4. Run: `wdd upgrade`
   Expected: same steps, but executed. Summary printed.
5. Verify: `grep "wdd_version" .wdd/config.json && grep "Manual Smoke Test" .wdd/templates/ward.md`
   Expected: version is "1.1"; template includes Manual Smoke Test section
6. Run: `wdd upgrade` again (idempotency check)
   Expected: "Already on current schema version" — no-op
7. Test rejection of higher version:
   ```bash
   sed -i '' 's/"wdd_version": "1.1"/"wdd_version": "9.9"/' .wdd/config.json
   wdd upgrade; echo "exit: $?"
   ```
   Expected: error message about unknown/higher version, exit 1

### Pass criteria
- [ ] `wdd upgrade --dry-run` previews changes without writing
- [ ] `wdd upgrade` migrates 1.0 → 1.1 with template refresh and version bump
- [ ] User content (PROJECT.md, CONTEXT.md, existing wards) untouched
- [ ] Re-running upgrade is a no-op (idempotency)
- [ ] Higher version rejected cleanly
- [ ] All 144 + 9 = 153 tests pass

## Verification
- All 9 new tests pass
- All 144 existing tests still pass (no regression)
- Manual smoke test above passes end-to-end
- TypeScript compiles with zero errors
- This project's own `.wdd/config.json` is bumped from "1.0" to "1.1" as part of Ward 17 completion (validating dogfooding)

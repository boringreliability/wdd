---
ward: 20
revision: null
name: "Planning Metadata Frontmatter"
epic: "orchestration"
status: "planned"
dependencies: [19]
layer: "typescript"
estimated_tests: 9
created: "2026-05-16"
completed: null
---
# Ward 020: Planning Metadata Frontmatter

## Scope
Extend ward frontmatter with planning metadata enabling conflict-aware parallel scheduling: `touches`, `workstreams`, `provides`, `requires`, `risk`, `review_mode`, `parallel_safe`, `execution_strategy`. All fields optional with sensible defaults — existing wards 1-18 continue to validate.

Bumps schema 1.2 → 1.3 with a migration that refreshes the template (no per-ward backfill).

## Inputs
- Ward 17's `MIGRATIONS` registry — extended with 1.2 → 1.3
- Ward 1's `parseFrontmatter` — accepts arbitrary keys; no parser change needed
- Ward 7's `validate` — extended to recognize new fields, reject unknown enum values

## Outputs
- New optional frontmatter fields in [src/templates/ward-body.ts](src/templates/ward-body.ts)
- `src/utils/planning.ts` exporting:
  - `Risk = "low" | "medium" | "high"`
  - `ReviewMode = "strict" | "accelerated" | "autonomous"`
  - `ExecutionStrategy = "single" | "parallel-proposals" | "parallel-implementations"`
  - `PlanningMetadata` interface
- Migration 1.2 → 1.3
- `wdd validate` enforces enum values
- `wdd ward create` accepts optional `--risk`, `--review-mode` flags

## Specification (sketch)

### New optional frontmatter fields
```yaml
risk: medium                  # low|medium|high — default medium
review_mode: strict           # strict|accelerated|autonomous — default strict
parallel_safe: false          # default false (conservative)
execution_strategy: single
workstreams: [compiler, cli]
touches:
  - packages/compiler/**
provides: [compiler.validateDeck]
requires: [compiler.compileDeck]
```

### Default semantics
- `parallel_safe: false` by default — explicit opt-in
- `risk: medium` by default
- `review_mode: strict` by default — preserves current checkpoint discipline
- Missing fields use defaults silently

### Migration 1.2 → 1.3
Refresh `.wdd/templates/ward.md` to include new fields as commented placeholders. Bump `wdd_version` to "1.3". Do NOT backfill existing ward files.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | parses_new_fields | parseFrontmatter handles risk/review_mode/etc |
| 2 | defaults_applied_when_missing | Wards 1-18 (no metadata) behave as medium/strict/false |
| 3 | validate_rejects_invalid_risk | `risk: catastrophic` is rejected |
| 4 | validate_rejects_invalid_review_mode | Typos surfaced by `wdd validate` |
| 5 | template_includes_planning_section | New ward template has commented examples |
| 6 | migration_1_2_to_1_3_refreshes_template | Template overwritten on upgrade |
| 7 | migration_preserves_existing_wards | Wards 1-18 untouched by migration |
| 8 | ward_create_accepts_flags | `--risk high --review-mode strict` populates frontmatter |
| 9 | planning_metadata_in_session | `wdd session` shows planning summary for current ward |

## Must NOT
- Do NOT change parser behavior
- Do NOT backfill existing ward files
- Do NOT make any new field required

## Must DO
- All new fields optional with conservative defaults
- Migration idempotent (Ward 17 contract)
- Update adapter content so AI agents know the new fields

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. `wdd upgrade` against this repo — expect 1.2 → 1.3 template refresh
2. `wdd ward create "Test" --epic test --risk high --review-mode strict --tests 1` — verify fields in frontmatter
3. Manually set `risk: nonsense` in a ward file — `wdd validate` flags it

### Pass criteria
- [ ] Schema migrated to 1.3 cleanly
- [ ] Existing wards still validate
- [ ] CLI flags populate planning fields
- [ ] Invalid enum values surfaced by validate

## Verification
- All 9 tests pass
- Migration dogfooded
- TypeScript compiles clean

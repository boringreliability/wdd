---
ward: 7
revision: null
name: "Validate Command"
epic: validation-search
status: complete
dependencies: [1, 2]
layer: typescript
estimated_tests: 9
created: 2026-03-14
completed: 2026-03-15
---
# Ward 007: Validate Command

## Scope
Implement `wdd validate` — structural integrity checker that verifies the .wdd/ directory is well-formed. Checks required files exist, ward numbering is sequential, no wards are in invalid states, dependencies reference existing wards, and CONTEXT.md is under the size limit. Wire into cli.ts.

## Inputs
- `.wdd/` directory structure from Ward 1
- Ward frontmatter format from Ward 2
- config.json conventions
- CONTEXT.md hard limits from spec (200 lines, 8KB)

## Outputs
- `validateProject(projectDir)` function returning structured validation result
- `wdd validate` CLI command that prints pass/fail with details
- Exit code 0 if valid, 1 if errors found

## Specification

### Checks
1. **Structure**: Required files exist (PROJECT.md, CONTEXT.md, PROGRESS.md, config.json)
2. **Structure**: Required directories exist (wards/, epics/, reviews/, memory/, templates/)
3. **Wards**: All ward files have valid YAML frontmatter with required keys
4. **Wards**: Ward status is a valid enum value
5. **Wards**: Dependencies reference existing wards
6. **Wards**: No duplicate ward numbers (excluding revisions)
7. **Context size**: CONTEXT.md under 200 lines and 8KB
8. **Config**: config.json is valid JSON with required keys

### Return Format
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

Errors = hard failures. Warnings = things that should be fixed but don't block.
CONTEXT.md over 150 lines = warning. Over 200 = error.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | validate_clean_project | Fresh init passes validation |
| 2 | validate_missing_project_md | Error when PROJECT.md missing |
| 3 | validate_missing_directory | Error when wards/ directory missing |
| 4 | validate_invalid_ward_status | Error when ward has invalid status value |
| 5 | validate_missing_dependency | Error when ward depends on non-existent ward |
| 6 | validate_context_over_limit | Error when CONTEXT.md exceeds 200 lines |
| 7 | validate_context_warning | Warning when CONTEXT.md over 150 lines |
| 8 | validate_invalid_config | Error when config.json is malformed |
| 9 | validate_valid_with_wards | Passes with properly created wards |

## Must NOT
- Do NOT modify any files — this is read-only
- Do NOT fix issues automatically
- Do NOT validate test pass/fail (that requires running tests)
- Do NOT implement other commands

## Must DO
- Return structured result with errors and warnings
- Check all required frontmatter keys on ward files
- Distinguish errors from warnings
- Wire into cli.ts with exit code 1 on errors

## Verification
- All 9 tests pass
- `wdd validate` on our own .wdd/ passes
- TypeScript compiles with zero errors

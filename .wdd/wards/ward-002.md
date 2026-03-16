---
ward: 2
revision: null
name: "Ward Creation"
epic: core-cli
status: complete
dependencies: [1]
layer: typescript
estimated_tests: 8
created: 2026-03-14
completed: 2026-03-14
---
# Ward 002: Ward Creation

## Scope
Implement `wdd ward create` command that creates a new Ward file from template with YAML frontmatter. Includes auto-numbering, epic assignment, and layer selection.

## Inputs
- Ward template from `initProject` (Ward 1)
- Frontmatter parser/serializer from Ward 1
- `.wdd/config.json` for ward_prefix and ward_digits

## Outputs
- `wdd ward create "Name" --epic "slug" --layer rust --tests 12` command
- Ward file created at `.wdd/wards/ward-{NNN}.md`
- Utility to scan existing wards and determine next number

## Specification

### Command: `wdd ward create`
```
wdd ward create "Ward Name" --epic <slug> --layer <rust|typescript|integration|demo> --tests <N>
```

- First positional arg after `create` is the ward name (required)
- `--epic` is required
- `--layer` defaults to `typescript`
- `--tests` defaults to 0 (estimated)
- Auto-detects next ward number by scanning `.wdd/wards/`
- Creates `.wdd/wards/ward-{NNN}.md` with populated frontmatter
- Populates template body with ward number and name in heading
- Prints confirmation with file path

### Ward Scanning
- Read all `ward-*.md` files in `.wdd/wards/`
- Parse frontmatter to extract ward numbers
- Handle reopened wards (e.g., `ward-003b.md`) — only count base numbers
- Next number = max(existing) + 1, or 1 if none exist

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | create_ward_first | Creates ward-001.md when no wards exist |
| 2 | create_ward_sequential | Creates ward-002.md when ward-001 exists |
| 3 | create_ward_frontmatter | Frontmatter has correct ward number, name, epic, layer, tests |
| 4 | create_ward_body | Body contains ward number and name in heading |
| 5 | create_ward_default_layer | Layer defaults to typescript when not specified |
| 6 | create_ward_requires_name | Errors when no name provided |
| 7 | create_ward_requires_epic | Errors when no epic provided |
| 8 | create_ward_skips_reopened | Numbering skips reopened wards (ward-003b doesn't become ward-4) |

## Must NOT
- Do NOT modify any existing ward files
- Do NOT create epic files (that's a future Ward)
- Do NOT validate that the epic exists
- Do NOT implement ward status or ward reopen in this Ward
- Do NOT add interactive prompts

## Must DO
- Use frontmatter serializer from Ward 1
- Zero-pad ward number to config.ward_digits (default 3)
- Set status to "planned" and created to today's date
- Print created file path to stdout

## Verification
- All 8 tests pass
- `wdd ward create "My Ward" --epic core --layer rust --tests 10` creates valid file
- TypeScript compiles with zero errors

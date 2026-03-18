---
ward: 10
revision: null
name: "Epic Create Command"
epic: core-cli
status: complete
dependencies: [1]
layer: typescript
estimated_tests: 7
created: 2026-03-17
completed: 2026-03-18
---
# Ward 010: Epic Create Command

## Scope
Implement `wdd epic create` — creates an epic file from template with auto-numbering and YAML frontmatter. Consistent with `wdd ward create` conventions.

## Inputs
- Epic template from Ward 1
- Frontmatter parser/serializer from Ward 1
- `.wdd/epics/` directory

## Outputs
- `createEpic(projectDir, options)` function
- `wdd epic create "Name" --slug <slug>` CLI command
- Epic file at `.wdd/epics/{NN}-{slug}.md`

## Specification

### Command
```
wdd epic create "Epic Name" --slug <slug>
```

- Name is first positional arg (required)
- `--slug` is required (used in filename and ward epic references)
- Auto-detects next epic number by scanning `.wdd/epics/`
- Creates `.wdd/epics/{NN}-{slug}.md` with frontmatter and template body

### Epic Frontmatter
```yaml
---
epic: <slug>
name: <name>
number: <N>
status: active
created: <date>
---
```

### Auto-numbering
- Scan files matching `{NN}-*.md` pattern in epics/
- Next number = max + 1, or 1 if none exist
- Zero-pad to 2 digits

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | create_epic_first | Creates 01-core.md when no epics exist |
| 2 | create_epic_sequential | Creates 02-ui.md when 01 exists |
| 3 | create_epic_frontmatter | Frontmatter has correct slug, name, number, status |
| 4 | create_epic_body | Body contains epic name in heading |
| 5 | create_epic_requires_name | Errors when no name provided |
| 6 | create_epic_requires_slug | Errors when no slug provided |
| 7 | create_epic_cli | CLI `wdd epic create "X" --slug x` creates file |

## Must NOT
- Do NOT validate that wards reference valid epics
- Do NOT modify existing epic files
- Do NOT add interactive prompts

## Must DO
- Use frontmatter serializer from Ward 1
- Wire into cli.ts under `epic` subcommand
- Zero-pad epic number to 2 digits
- Print created file path to stdout

## Verification
- All 7 tests pass
- TypeScript compiles with zero errors

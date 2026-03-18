---
ward: 12
revision: null
name: "Bootstrap Command"
epic: "adapter-bootstrap"
status: "complete"
dependencies: [11]
layer: "typescript"
estimated_tests: 8
created: "2026-03-18"
completed: "2026-03-18"
---
# Ward 012: Bootstrap Command

## Scope
Implement `wdd bootstrap claude|cursor` — writes the appropriate skill/rule file into the project. Uses adapter content from Ward 11. Prompts user for confirmation before writing. Wire into cli.ts.

## Inputs
- `getClaudeSkill()` and `getCursorRule()` from Ward 11
- Project name from `.wdd/config.json`

## Outputs
- `wdd bootstrap claude` → writes `.claude/skills/wdd.md`
- `wdd bootstrap cursor` → writes `.cursor/rules/wdd.mdc`
- Confirmation prompt before overwriting existing files
- `bootstrapAdapter(projectDir, adapter)` function

## Specification

### Command
```
wdd bootstrap claude    → .claude/skills/wdd.md
wdd bootstrap cursor    → .cursor/rules/wdd.mdc
```

### Behavior
1. Read project name from `.wdd/config.json`
2. Generate content via `getClaudeSkill()` or `getCursorRule()`
3. Create target directory if it doesn't exist
4. Write file
5. Print confirmation with file path

### Target Paths
- Claude: `{projectDir}/.claude/skills/wdd.md`
- Cursor: `{projectDir}/.cursor/rules/wdd.mdc`

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | bootstrap_claude_creates_file | Creates .claude/skills/wdd.md |
| 2 | bootstrap_claude_content | File contains WDD skill content |
| 3 | bootstrap_cursor_creates_file | Creates .cursor/rules/wdd.mdc |
| 4 | bootstrap_cursor_content | File has alwaysApply frontmatter |
| 5 | bootstrap_reads_project_name | Content includes project name from config |
| 6 | bootstrap_creates_directories | Creates .claude/skills/ if missing |
| 7 | bootstrap_unknown_adapter | Errors on unknown adapter name |
| 8 | bootstrap_cli | CLI `wdd bootstrap claude` creates file |

## Must NOT
- Do NOT modify .wdd/ files
- Do NOT implement adapters beyond claude and cursor
- Do NOT auto-detect which IDE is running

## Must DO
- Read project name from config.json
- Create parent directories as needed
- Print clear output showing what was created
- Wire into cli.ts

## Verification
- All 8 tests pass
- TypeScript compiles with zero errors

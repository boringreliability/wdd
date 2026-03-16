---
ward: 8
revision: null
name: "Status, Progress & Search"
epic: context-memory
status: complete
dependencies: [5, 7]
layer: typescript
estimated_tests: 9
created: 2026-03-16
completed: 2026-03-16
---
# Ward 008: Status, Progress & Search

## Scope
Implement the final three CLI commands: `wdd status` (pretty-print PROGRESS.md), `wdd progress` (regenerate PROGRESS.md from ward frontmatter), and `wdd search` (grep memory/ with frontmatter tag filtering). Wire all into cli.ts. This completes the MLP command set.

## Inputs
- `regenerateProgress()` from Ward 5
- `memory/` directory structure from Ward 1
- Frontmatter parser from Ward 1

## Outputs
- `wdd status` — reads and prints PROGRESS.md
- `wdd progress` — regenerates PROGRESS.md via `regenerateProgress()`
- `wdd search <query>` — searches memory/ files by content and tags
- All three wired into cli.ts

## Specification

### `wdd status`
- Read `.wdd/PROGRESS.md` and print to stdout
- Error if file doesn't exist
- Pure read, no side effects

### `wdd progress`
- Call `regenerateProgress()` and write result to `.wdd/PROGRESS.md`
- Print confirmation

### `wdd search <query>`
- Search all `.md` files in `memory/` recursively
- Match query against: file content (case-insensitive) and frontmatter tags
- Return matching files with: filename, type (decision/learning/snapshot), and first matching line
- If `--tag <tag>` flag provided: filter to files whose frontmatter tags include that tag

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | status_prints_progress | Outputs PROGRESS.md content |
| 2 | status_missing_file | Errors when PROGRESS.md doesn't exist |
| 3 | progress_regenerates | Writes updated PROGRESS.md from ward frontmatter |
| 4 | search_by_content | Finds memory files matching query text |
| 5 | search_by_tag | Finds memory files matching --tag filter |
| 6 | search_no_results | Returns empty when nothing matches |
| 7 | search_decisions_and_learnings | Searches across both directories |
| 8 | search_case_insensitive | Matches regardless of case |
| 9 | search_tag_plus_content | Combines tag filter with content query |

## Must NOT
- Do NOT use external search libraries
- Do NOT implement semantic/vector search
- Do NOT modify memory files
- Do NOT implement any commands beyond status, progress, search

## Must DO
- Search recursively in memory/ subdirectories
- Parse frontmatter tags for tag filtering
- Case-insensitive content matching
- Wire all three commands into cli.ts

## Verification
- All 9 tests pass
- `wdd status`, `wdd progress`, `wdd search "query"` all work from CLI
- TypeScript compiles with zero errors
- All 10 MLP commands implemented

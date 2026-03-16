---
ward: 1
revision: null
name: "Project Scaffold + Init"
epic: core-cli
status: complete
dependencies: []
layer: typescript
estimated_tests: 10
created: 2026-03-14
completed: 2026-03-14
---
# Ward 001: Project Scaffold + Init

## Scope
Build the `wdd init` command that scaffolds a `.wdd/` directory with all required files and directories. This is the entry point for any WDD project. Also establish the core infrastructure: CLI argument parsing, YAML frontmatter parsing, and file utilities.

## Inputs
None — this is the first Ward.

## Outputs
- CLI entry point with command routing
- `wdd init` command that creates the full `.wdd/` structure
- YAML frontmatter parser utility
- File system utilities for reading/writing markdown with frontmatter
- Template files embedded in the CLI

## Specification

### CLI Entry Point
- Parse `process.argv` manually (no dependency like commander/yargs)
- Route to command handlers: `wdd <command> [subcommand] [args] [--flags]`
- Print help text when called with no args or `--help`

### `wdd init` Command
- Creates `.wdd/` directory structure as defined in WDD-FRAMEWORK-SPEC.md Section 2
- Prompts for project name (or accepts `--name` flag)
- Creates: PROJECT.md, CONTEXT.md, BACKLOG.md, PROGRESS.md, config.json
- Creates directories: wards/, epics/, reviews/, memory/{decisions,learnings,snapshots}, templates/, adapters/
- Creates template files in templates/: ward.md, epic.md, review.md, integration.md, decision.md, learning.md
- Fails gracefully if `.wdd/` already exists (with `--force` to overwrite)
- Prints summary of created files

### YAML Frontmatter Parser
- Parse `---\n...\n---` delimited YAML at start of markdown files
- Return `{ frontmatter: Record<string, unknown>, body: string }`
- Handle missing frontmatter gracefully (return empty object + full body)

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | init_creates_directory_structure | .wdd/ and all subdirectories are created |
| 2 | init_creates_project_md | PROJECT.md is created with project name |
| 3 | init_creates_context_md | CONTEXT.md is created with initial content |
| 4 | init_creates_config_json | config.json is created with defaults |
| 5 | init_creates_templates | All template files are created in templates/ |
| 6 | init_fails_if_exists | Errors when .wdd/ already exists (without --force) |
| 7 | init_force_overwrites | --force flag allows re-initialization |
| 8 | frontmatter_parse_valid | Parses valid YAML frontmatter correctly |
| 9 | frontmatter_parse_missing | Returns empty frontmatter when none present |
| 10 | frontmatter_roundtrip | Parse → serialize → parse produces identical result |

## Must NOT
- Do NOT use any CLI parsing library (commander, yargs, etc.)
- Do NOT use any YAML library — write a simple frontmatter parser for the subset we need (key: value pairs, arrays, nulls)
- Do NOT add interactive prompts beyond simple stdin readline
- Do NOT read from network or make API calls
- Do NOT create files outside `.wdd/` directory
- Do NOT implement any other commands in this Ward (ward create, status, etc.)

## Must DO
- Use Node.js built-in `fs` and `path` modules only
- Support `--name` flag for non-interactive usage
- Print clear output showing what was created
- Handle errors gracefully with useful messages
- All template content must be embedded in TypeScript source (no external template files at build time)

## Verification
- All 10 tests pass
- `npx tsx src/cli.ts init --name "test-project"` creates a valid .wdd/ structure
- TypeScript compiles with zero errors

---
ward: 5
revision: "b"
name: "CLI Wiring (fix)"
epic: core-cli
status: complete
dependencies: [5]
layer: typescript
estimated_tests: 8
created: 2026-03-14
completed: 2026-03-14
---
# Ward 005b: CLI Wiring (fix)

## Reopened from
Original: ward-005.md
Reason: Ward 5 delivered a testable library but not a usable CLI tool — commands implemented as functions but not wired to process.argv.

## Scope
Route all implemented commands from `process.argv` to their functions. Parse subcommands (`ward` → `create`/`status`/`reopen`) and flags correctly. This Ward adds no new logic — it wires existing functions to the CLI entry point.

## Inputs
- All command functions from Wards 1-5
- `cli.ts` entry point from Ward 1

## Outputs
- Fully functional CLI: `wdd init`, `wdd ward create`, `wdd ward status`, `wdd ward reopen`, `wdd complete`
- Correct exit codes (0 success, 1 error)
- Help text for each command

## Specification

### Command Routing
```
wdd init --name "project" [--force]
wdd ward create "Name" --epic <slug> [--layer <layer>] [--tests <N>]
wdd ward status <id> <new-status> [--feedback "text"]
wdd ward reopen <id> --reason "text"
wdd complete <id>
wdd --help
```

### Argument Parsing
- Subcommand: `ward` routes to sub-switch for `create`/`status`/`reopen`
- Positional args: first non-flag arg after subcommand
- Flags: `--name`, `--epic`, `--layer`, `--tests`, `--force`, `--feedback`, `--reason`

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | cli_init | `wdd init --name test` exits 0, creates .wdd/ |
| 2 | cli_ward_create | `wdd ward create "X" --epic core` exits 0, creates ward file |
| 3 | cli_ward_status | `wdd ward status 1 red` exits 0, updates frontmatter |
| 4 | cli_ward_reopen | `wdd ward reopen 1 --reason "fix"` exits 0, creates fix ward |
| 5 | cli_complete | `wdd complete 1` exits 0 on gold ward |
| 6 | cli_unknown_command | `wdd bogus` exits 1 |
| 7 | cli_help | `wdd --help` exits 0, prints usage |
| 8 | cli_ward_unknown_sub | `wdd ward bogus` exits 1 |

## Must NOT
- Do NOT add new command logic — only wire existing functions
- Do NOT add interactive prompts
- Do NOT import external CLI parsing libraries

## Must DO
- Use `child_process.execFile` in tests to run actual CLI
- Test real exit codes and stdout
- Handle errors with useful messages and exit code 1

## Verification
- All 8 tests pass
- `npx tsx src/cli.ts ward create "Test" --epic core` actually works
- TypeScript compiles with zero errors

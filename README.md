# wdd — Ward-Driven Development

A control system for AI-assisted software construction. WDD enforces a
test-first, file-based workflow where every unit of work — a **Ward** — moves
through explicit **Red → Gold → Complete** states with human approval at each
transition.

It is designed for pair-coding with LLMs (Claude, Cursor, Copilot): the
filesystem is the contract, the CLI is the referee.

## Install

```bash
npm install -g @boringreliability/wdd
```

The binary is `wdd`:

```bash
wdd --help
```

Or run without global install:

```bash
npx @boringreliability/wdd init --name "my-project"
```

> ⚠️ **Do NOT use `npx wdd`** — there is an unrelated package called `wdd` on
> npm (a test package that squatted the name). Always use the scoped form
> `npx @boringreliability/wdd`. The binary name `wdd` only resolves to this
> package after global install.

## Quick start

```bash
mkdir my-project && cd my-project
wdd init --name "my-project"
wdd epic create "Core" --slug core
wdd ward create "First feature" --epic core --tests 3
wdd ward status 1 red
wdd ward status 1 red_approved
wdd ward status 1 gold
wdd ward status 1 gold_approved
wdd complete 1
```

State lives in `.wdd/`. Every transition writes a markdown file you can read,
diff, and grep.

## Commands

| Command | Purpose |
|---------|---------|
| `wdd init` | Initialize WDD in a project |
| `wdd ward create <name>` | Create a new Ward (test-first spec) |
| `wdd ward status <id> <state>` | Move Ward through state machine |
| `wdd ward reopen <id>` | Reopen a completed Ward as revision |
| `wdd complete <id>` | Step-by-step Ward completion |
| `wdd epic create <name>` | Create a new Epic (group of Wards) |
| `wdd session` | Assemble context bundle for AI consumption |
| `wdd status` | Progress dashboard |
| `wdd progress` | Regenerate `PROGRESS.md` |
| `wdd validate` | Check structure and invariants |
| `wdd graph` | Print dependency tree of all Wards |
| `wdd ready` | List Wards whose dependencies are complete |
| `wdd search <query>` | Search project memory (CONTEXT, BACKLOG, Wards) |
| `wdd bootstrap claude\|cursor\|copilot` | Install AI adapter skills/rules/prompts |
| `wdd api` | List exports from `src/` to prevent reinvention |
| `wdd upgrade` | Migrate older `.wdd/` schema to current version |
| `wdd configure` | Detect scan paths/extensions for `wdd api` |
| `wdd eval` | Validate skill evals |

Run any command with `--help` for full usage.

## AI adapters

After `wdd init`, install the adapter for your AI of choice:

```bash
wdd bootstrap claude    # Adds .claude/skills/wdd/, /ward, /ward-new
wdd bootstrap cursor    # Adds .cursor/rules/wdd.mdc
wdd bootstrap copilot   # Adds .github/copilot-instructions.md + prompts + agent
```

The adapters teach the AI the Red/Gold workflow, the file conventions, and
the manual-smoke-test discipline. Same methodology, three different ways to
embed it in the AI:

| Adapter | Activation | Files written |
|---------|------------|---------------|
| Claude Code | `/wdd`, `/ward`, `/ward-new` skills | `.claude/skills/{wdd,ward,ward-new}/SKILL.md` + evals |
| Cursor | Always-on rule (`alwaysApply: true`) | `.cursor/rules/wdd.mdc` |
| GitHub Copilot | Auto-loaded instructions + `/wdd`, `/ward`, `/ward-new` prompts + `wdd` agent | `.github/copilot-instructions.md`, `.github/prompts/*.prompt.md`, `.github/agents/wdd.agent.md` |

## Principles

- **File-based** — all state in markdown and JSON; no database
- **Zero runtime dependencies** — Node.js built-ins only
- **Human-readable protocol, machine-checkable invariants** — `wdd validate`
- **Git-native** — every state change is a file change
- **Convention over configuration**

## Requirements

- Node.js >= 18

## Methodology

For the full WDD specification, see
[WDD-FRAMEWORK-SPEC.md](https://github.com/boringreliability/wdd/blob/main/WDD-FRAMEWORK-SPEC.md)
in the repository.

## License

MIT — see [LICENSE](./LICENSE).

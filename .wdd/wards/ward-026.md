---
ward: 26
revision: null
name: "WDD Copilot Adapter"
epic: "adapter-bootstrap"
status: "complete"
dependencies: [11]
layer: "typescript"
estimated_tests: 7
created: "2026-06-03"
completed: "2026-06-03"
---
# Ward 026: WDD Copilot Adapter

## Scope
Add a third adapter target — GitHub Copilot in VS Code — alongside Claude and
Cursor. Generates `.github/copilot-instructions.md` (always-loaded), three
`.github/prompts/*.prompt.md` slash commands mirroring the Claude skills, and
one `.github/agents/wdd.agent.md` persona. Driven by `wdd bootstrap copilot`.

## Inputs
- `getSharedContent(projectName)` from `src/templates/adapter-content.ts` —
  the universal WDD brief. Same source of truth Claude and Cursor adapters use.
- `bootstrapAdapter` dispatch switch in `src/commands/bootstrap.ts` — extend
  the existing pattern, do not fork.
- The three Claude skill bodies (`getClaudeSkills()` returns `wdd`, `ward`,
  `ward-new`) — reuse their *body content* in the equivalent prompt files
  (frontmatter differs, body is identical).

## Outputs
- New emitter `getCopilotAdapter(projectName)` returning a typed array of
  `{ path, content }` entries — pure function, easy to test.
- New `bootstrapCopilot(projectDir, projectName)` in `bootstrap.ts` extending
  the existing switch.
- New CLI entry: `wdd bootstrap copilot` (works because cli.ts already passes
  `args[1]` through to `bootstrapAdapter`).
- 5 files written to `.github/`:
  1. `.github/copilot-instructions.md` — auto-loaded, plain Markdown, NO frontmatter
  2. `.github/prompts/wdd.prompt.md` — `/wdd` slash command
  3. `.github/prompts/ward.prompt.md` — `/ward` slash command
  4. `.github/prompts/ward-new.prompt.md` — `/ward-new` slash command
  5. `.github/agents/wdd.agent.md` — selectable persona

## Specification

### File 1: `.github/copilot-instructions.md`
Plain Markdown, no frontmatter. Body = `getSharedContent(projectName)` verbatim.
Auto-loaded by VS Code Copilot on every chat request.

### Files 2-4: `.github/prompts/*.prompt.md`
YAML frontmatter:
```yaml
---
description: '<one-line description>'
---
```
- Field is `description` only — keep frontmatter minimal so it works across
  Copilot versions without breakage.
- Do NOT specify `model` or `tools` — let user's defaults rule.
- Body = same content as the equivalent Claude skill (the markdown body, not
  the SKILL.md frontmatter).

Mapping to existing Claude skill content:
| Copilot prompt file | Claude skill source |
|---------------------|---------------------|
| `wdd.prompt.md` | first entry from `getClaudeSkills()` (dir: "wdd") |
| `ward.prompt.md` | second entry (dir: "ward") |
| `ward-new.prompt.md` | third entry (dir: "ward-new") |

Strip the Claude `---\nname: ...\ndescription: ...\n---\n` block from the
content and replace with Copilot's frontmatter shape.

### File 5: `.github/agents/wdd.agent.md`
YAML frontmatter:
```yaml
---
description: 'WDD discipline enforcer — runs Ward checkpoints and halts at human approval gates'
---
```
Body: a condensed version of `getSharedContent()` focused on the discipline
rules (the Ward Lifecycle section + Manual Smoke Test Protocol). The agent
file is meant to be selected by the user as a persona, so it should emphasize
"halt at gates, never proceed without explicit approval" more strongly than
the always-on instructions file.

### Dispatch
Extend `bootstrapAdapter` switch in `bootstrap.ts`:
```typescript
case "copilot": {
  return bootstrapCopilot(projectDir, projectName);
}
```
Update the error message to list copilot as available.

### CLI help
Update `printHelp()` in `cli.ts`:
```
bootstrap           Install AI adapter (claude|cursor|copilot)
```

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `bootstrap_copilot_creates_instructions_file` | `.github/copilot-instructions.md` exists with project name in body, NO YAML frontmatter at the top |
| 2 | `bootstrap_copilot_creates_three_prompt_files` | `.github/prompts/{wdd,ward,ward-new}.prompt.md` all exist with valid `---\ndescription:` frontmatter |
| 3 | `bootstrap_copilot_creates_agent_file` | `.github/agents/wdd.agent.md` exists with `description` frontmatter and Ward Lifecycle content |
| 4 | `instructions_includes_shared_content` | The instructions file body contains the "Ward Lifecycle — Checkpoint Discipline" header and projectName substitution worked |
| 5 | `prompt_bodies_match_claude_skills` | Each prompt body contains the same key directives as the equivalent Claude skill body (test via shared sentinel strings, not byte-for-byte) |
| 6 | `frontmatter_parses_as_valid_yaml` | Each generated `.prompt.md` and `.agent.md` file's frontmatter parses cleanly via existing `parseFrontmatter()` and has `description` field |
| 7 | `unknown_adapter_still_errors` | `bootstrapAdapter(dir, "vim")` throws Error listing copilot in available adapters |

## Must NOT
- Do NOT duplicate `getSharedContent()` content — reuse it. Drift between
  adapters defeats the purpose.
- Do NOT add `tools:` or `model:` to prompt frontmatter — those depend on user
  setup and Copilot version. Minimal frontmatter survives version churn.
- Do NOT create `.github/` if `.github/` already exists with user content —
  only create subdirs (`prompts/`, `agents/`) and write our specific files.
  Do not touch other files in `.github/`.
- Do NOT include Claude-specific or Cursor-specific syntax in the bodies
  (`<` tags, MDC-specific syntax). The shared content is already neutral
  but verify when reusing skill bodies.

## Must DO
- Reuse `ClaudeSkillFile`-style pattern: return an array of
  `{ path, content }` from a pure function `getCopilotAdapter()` so tests can
  assert on file paths and contents without filesystem.
- Mirror the exact `bootstrapClaude`/`bootstrapCursor` structure in
  `bootstrapCopilot` — same logging style, same return type (`string[]`).
- Update help text in `cli.ts` AND the error message in `bootstrapAdapter`'s
  default branch to mention copilot.
- Idempotent: running `wdd bootstrap copilot` twice in a row must succeed
  without errors and produce identical files (no append, full overwrite).

## Manual Smoke Test

### Setup
```bash
cd /Users/Z6DEC/kmddev/wdd
npm run build
TMP=$(mktemp -d)
cd "$TMP"
mkdir smoke-copilot && cd smoke-copilot
/Users/Z6DEC/kmddev/wdd/dist/cli.js init --name "smoke-copilot"
```

### Steps
1. Run: `/Users/Z6DEC/kmddev/wdd/dist/cli.js bootstrap copilot`
   Expected output should include:
   ```
   Installed WDD Copilot adapter:
     .github/copilot-instructions.md
     .github/prompts/wdd.prompt.md
     .github/prompts/ward.prompt.md
     .github/prompts/ward-new.prompt.md
     .github/agents/wdd.agent.md
   ```

2. Run: `ls -la .github/ .github/prompts/ .github/agents/`
   Verify: all 5 files exist.

3. Run: `head -5 .github/copilot-instructions.md`
   Verify: starts with `You are working on **smoke-copilot**`, NO `---` frontmatter.

4. Run: `head -5 .github/prompts/ward.prompt.md`
   Verify: starts with `---`, has `description:` field, ends frontmatter with `---`.

5. Run: `head -5 .github/agents/wdd.agent.md`
   Verify: starts with `---`, has `description:` field about discipline enforcement.

6. Run: `/Users/Z6DEC/kmddev/wdd/dist/cli.js bootstrap copilot` (second time)
   Verify: succeeds, no errors, files are unchanged (idempotent).

7. Run: `/Users/Z6DEC/kmddev/wdd/dist/cli.js bootstrap vim` (negative test)
   Verify: error message lists `claude, cursor, copilot` as available.

8. Open one of the `.prompt.md` files in VS Code with Copilot installed.
   Verify: VS Code recognizes it as a prompt file (icon in editor, can be
   invoked via Chat: Run Prompt command palette).

### Pass criteria
- [ ] All 5 files exist after first run
- [ ] `head` outputs confirm correct frontmatter shape per file type
- [ ] Idempotent re-run succeeds without altering files
- [ ] Negative test (unknown adapter) errors cleanly with copilot listed
- [ ] At least one prompt file is visually recognized as a prompt by VS Code

## Verification
- All 7 automated tests pass: `npm test -- --test-name-pattern "Ward 026"`
- Full test suite still green: `npm test`
- Manual smoke test passes all 5 checkboxes
- `wdd validate` returns clean (or only stale-backlog warnings) after Ward complete

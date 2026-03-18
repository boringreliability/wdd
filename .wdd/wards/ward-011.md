---
ward: 11
revision: null
name: "WDD Skill Content"
epic: "adapter-bootstrap"
status: "complete"
dependencies: []
layer: "typescript"
estimated_tests: 6
created: "2026-03-18"
completed: "2026-03-18"
---
# Ward 011: WDD Skill Content

## Scope
Define the WDD workflow instruction content as a TypeScript template string. This is the shared content that both Claude Code skills and Cursor rules will use. The content teaches an AI agent how to follow WDD: when to run `wdd session`, checkpoint discipline (Red → STOP → Gold → STOP), CLI commands, and "never skip human approval."

## Inputs
- WDD-FRAMEWORK-SPEC.md Section 4.2 (state machine), Section 10.1 (complete flow)
- CLI commands from Wards 1-10

## Outputs
- `getSkillContent(projectName)` function returning the instruction text
- `getClaudeSkill(projectName)` function returning Claude Code skill format
- `getCursorRule(projectName)` function returning Cursor MDC format
- All exported from `src/templates/adapter-content.ts`

## Specification

### Skill Content Must Cover
1. **Session start**: Always run `wdd session` first to get context
2. **Ward lifecycle**: planned → red (write tests) → STOP → approved → gold (implement) → STOP → complete
3. **Checkpoint discipline**: NEVER proceed from Red to Gold without human "approved". NEVER proceed from Gold to Complete without human "godkendt/approved"
4. **CLI commands**: Full reference of available commands
5. **File protocol**: All state in `.wdd/`, frontmatter is source of truth
6. **After complete**: Follow commit reminder and CONTEXT.md update reminder

### Claude Code Skill Format
```markdown
---
name: wdd
description: Ward-Driven Development workflow for {projectName}
---
{content}
```

### Cursor Rule Format
```markdown
---
description: Ward-Driven Development workflow
globs: "**/*"
alwaysApply: true
---
{content}
```

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | content_has_session | Content mentions `wdd session` |
| 2 | content_has_checkpoints | Content mentions stopping for approval |
| 3 | content_has_cli_commands | Content lists all core CLI commands |
| 4 | claude_skill_format | Claude skill has correct frontmatter format |
| 5 | cursor_rule_format | Cursor rule has globs and alwaysApply |
| 6 | content_has_project_name | Functions inject project name correctly |

## Must NOT
- Do NOT write files to disk (that's Ward 12)
- Do NOT implement the `bootstrap` CLI command (that's Ward 12)
- Do NOT hardcode project-specific details

## Must DO
- Parameterize with project name
- Cover all WDD checkpoints explicitly
- Include `wdd validate` in the workflow
- Make content actionable, not just descriptive

## Verification
- All 6 tests pass
- TypeScript compiles with zero errors

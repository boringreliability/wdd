export function getSharedContent(projectName: string): string {
  return `You are working on **${projectName}**, a project managed with Ward-Driven Development (WDD).
All project state lives in the \`.wdd/\` directory as markdown files with YAML frontmatter.

## Ward Lifecycle — Checkpoint Discipline

Every Ward follows this exact sequence. **You MUST STOP at each checkpoint.**

\`\`\`
planned → red (write tests)
    ⏸️ STOP — Present tests to human. Wait for "approved".
    NEVER proceed without explicit human approval.

red → approved → gold (implement until tests pass)
    ⏸️ STOP — Present implementation to human. Wait for "approved"/"godkendt".
    NEVER proceed without explicit human approval.

gold → complete (via wdd complete)
\`\`\`

**Rules:**
- NEVER skip from Red to Gold without human approving the tests
- NEVER skip from Gold to Complete without human approving the implementation
- NEVER start the next Ward before the current one is approved as complete
- If tests fail during Gold, fix them — do NOT change the test expectations

## CLI Commands

| Command | Purpose |
|---------|---------|
| \`wdd session\` | Get full project context (start here) |
| \`wdd status\` | Show progress dashboard |
| \`wdd ward create "Name" --epic <slug>\` | Create a new Ward |
| \`wdd ward status <id> <status>\` | Update Ward status |
| \`wdd complete <id>\` | Complete a Ward (snapshot + progress) |
| \`wdd validate\` | Check structural integrity |
| \`wdd progress\` | Regenerate PROGRESS.md |
| \`wdd ward reopen <id> --reason "text"\` | Reopen a completed Ward |
| \`wdd epic create "Name" --slug <slug>\` | Create a new Epic |
| \`wdd search <query> [--tag <tag>]\` | Search project memory |
| \`wdd bootstrap claude\\|cursor\` | Install AI adapter |
| \`wdd init --name "project"\` | Initialize WDD in a new project |

## Manual Smoke Test Protocol (MANDATORY before Gold approval)

Automated tests prove functions work in isolation. Manual smoke tests prove a human
can use the result. Before requesting Gold-phase approval from the human, you MUST:

1. Read the \`## Manual Smoke Test\` section from the active ward file
2. Spin up the solution as the **Setup** subsection describes (build, npm link, dev server, etc.)
3. Provide the exact **Steps** as copy-pasteable commands to the human
4. Wait for the human to run them and report results
5. Only after they confirm the smoke test passed may you ask for Gold approval

Do not claim Gold complete based on automated tests alone. The human must have *used* the thing.

## After Completing a Ward

1. Run \`wdd complete <id>\` — it will snapshot CONTEXT.md and regenerate PROGRESS.md
2. Follow the commit reminder in the output
3. Update CONTEXT.md: "Current State" and "What Comes Next"
4. Run \`wdd validate\` to check CONTEXT.md size limits

## File Protocol

- \`.wdd/wards/ward-NNN.md\` — Ward specs with YAML frontmatter (source of truth for status)
- \`.wdd/CONTEXT.md\` — Living document, updated after each Ward (max 200 lines)
- \`.wdd/PROJECT.md\` — Project identity and principles (rarely changes)
- \`.wdd/PROGRESS.md\` — Auto-generated, never hand-edit
- \`.wdd/memory/\` — Decisions, learnings, snapshots
`;
}

import {
  type SkillEvalsJson,
  getWddEvals,
  getWardEvals,
  getWardNewEvals,
} from "./skill-evals.js";

export interface ClaudeSkillFile {
  dir: string;
  content: string;
  evals?: SkillEvalsJson;
}

export function getClaudeSkills(projectName: string): ClaudeSkillFile[] {
  return [
    {
      dir: "wdd",
      content: `---
name: wdd
description: "Ward-Driven Development: get project context and orient yourself. Use at session start or when you need to understand project state."
---

# WDD — Session Context

${getSharedContent(projectName)}

## What To Do

1. Run \`wdd session\` and read the full output carefully
2. Run \`wdd validate\` to check project health
3. Summarize for the user:
   - Current state of the project
   - Which Ward is active and its status
   - Any blockers or warnings from validate
4. Ask the user what they want to work on
`,
      evals: getWddEvals(),
    },
    {
      dir: "ward",
      content: `---
name: ward
description: "Continue working on the current WDD Ward. Checks ward status and follows checkpoint discipline with mandatory human approval gates."
---

# /ward — Continue Current Ward

Run \`wdd session\` to find the current ward and its status, then follow the appropriate flow:

## planned — Start Red phase
1. Run \`wdd ward status <id> red\`
2. Write tests per the ward spec's Tests table
3. Present tests to user
4. ⏸️ **STOP — Wait for explicit approval. Do NOT proceed.**

## red — Tests written, awaiting approval
1. Present the tests if not yet shown
2. ⏸️ **STOP — Wait for explicit approval. Do NOT proceed.**

## approved — Start Gold phase
1. Run \`wdd ward status <id> gold\`
2. Implement until all tests pass
3. Read the \`## Manual Smoke Test\` section from the ward file
4. **Spin up the solution** (build, npm link, dev server, etc.) per the Setup subsection
5. **Provide the exact Steps as copy-pasteable commands to the user** and wait for them to run
6. Present implementation results AND smoke test outcome to user
7. ⏸️ **STOP — Wait for explicit approval of BOTH automated tests AND smoke test. Do NOT proceed.**

## gold — Implementation done, awaiting approval
1. Run the tests. If failing, fix implementation (not tests).
2. Run the Manual Smoke Test from the ward file if not already done in approved-phase
3. Present results to user — automated tests + smoke test outcome
4. ⏸️ **STOP — Wait for explicit approval. Do NOT proceed.**
5. When approved: run \`wdd complete <id>\` and follow its output

**The Manual Smoke Test is mandatory before Gold approval. Automated tests prove functions work — the smoke test proves the human can use the result.**

## complete — Ward is done
- Tell user this ward is complete
- Suggest creating the next ward with /ward-new

## blocked — Ward is blocked
- Show what the ward depends on
- Suggest resolving the blocker

**NEVER skip a checkpoint. NEVER proceed without the user saying "approved" or "godkendt".**
`,
      evals: getWardEvals(),
    },
    {
      dir: "ward-new",
      content: `---
name: ward-new
description: "Create a new WDD Ward with full spec, tests table, must-not/must-do lists, and test file. Use when starting new work."
---

# /ward-new — Create a New Ward

1. Ask the user for:
   - Ward name (what it builds)
   - Epic (suggest existing epics from \`.wdd/epics/\`)
   - Estimated test count
2. Run \`wdd ward create "Name" --epic <slug> --tests <N>\`
3. Open the created ward file and write the full spec:
   - Scope (one paragraph)
   - Inputs (what it uses from previous wards)
   - Outputs (what it produces)
   - Specification (detailed technical spec)
   - Tests table (# | test_name | what it verifies)
   - Must NOT list (explicit constraints)
   - Must DO list (explicit requirements)
   - **Manual Smoke Test section (MANDATORY)** — fill in:
     - Setup: exact commands to spin up (build, npm link, dev server, etc.)
     - Steps: numbered copy-pasteable commands with expected outputs
     - Pass criteria: concrete observable checkboxes
   - Verification (how to prove it's done)
4. Run \`wdd ward status <id> red\`
5. Write the test file based on the Tests table
6. Present tests to user
7. ⏸️ **STOP — Wait for explicit approval before implementing**

**The Manual Smoke Test section is not optional.** Every Ward must define how a human can manually verify the result before Gold approval. Placeholder bullets are not enough — write real, copy-pasteable commands.
`,
      evals: getWardNewEvals(),
    },
  ];
}

export function getCursorRule(projectName: string): string {
  return `---
description: Ward-Driven Development workflow for ${projectName}
globs: "**/*"
alwaysApply: true
---

# Ward-Driven Development — ${projectName}

${getSharedContent(projectName)}`;
}

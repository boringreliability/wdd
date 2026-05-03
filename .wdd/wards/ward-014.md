---
ward: 14
revision: null
name: "Skill Evals"
epic: "adapter-bootstrap"
status: "complete"
dependencies: [13]
layer: "typescript"
estimated_tests: 6
created: "2026-03-18"
completed: "2026-05-03"
---
# Ward 014: Skill Evals

## Scope
Add evals/evals.json to each of the three Claude Code skills (/wdd, /ward, /ward-new) following the agentskills.io eval spec. Each eval has realistic prompts, expected outputs, and assertions that verify the skill produces correct checkpoint discipline behavior. Also add a `wdd eval` CLI command that validates eval file structure.

## Inputs
- Three skill directories from Ward 13b (.claude/skills/wdd/, ward/, ward-new/)
- agentskills.io eval spec (evals.json format)
- Bootstrap command from Ward 12

## Outputs
- `evals/evals.json` in each skill directory
- `wdd eval` CLI command that validates eval structure
- Bootstrap command updated to also generate evals/

## Specification

### Eval Files
Each skill gets `evals/evals.json` per the agentskills.io spec:

```json
{
  "skill_name": "wdd",
  "evals": [
    {
      "id": 1,
      "prompt": "...",
      "expected_output": "...",
      "assertions": ["..."]
    }
  ]
}
```

### /wdd Evals
1. "I just opened this project, what's the status?" → expects wdd session output, project summary, active ward identification
2. "Help me with this codebase" → expects skill to run wdd session first before any work

### /ward Evals
1. "Continue working on the current ward" with a ward in red status → expects tests presented + STOP
2. "The tests look good, approved" with ward in red → expects transition to gold + implementation + STOP
3. "Implement the feature" with ward in planned status → expects Red phase first (tests), not direct implementation

### /ward-new Evals
1. "Create a new ward for user authentication" → expects wdd ward create + spec writing + tests + STOP
2. "Add a feature for caching" → expects asking for epic, creating ward, not jumping to code

### Assertions Focus
- Checkpoint discipline: AI MUST stop and wait for approval
- CLI usage: correct wdd commands invoked
- State transitions: ward status updated correctly
- No skipping: Red before Gold, approval before proceeding

### `wdd eval` Command
- Validates that evals/evals.json exists and has correct structure in skill directories
- Checks: skill_name matches directory, each eval has id/prompt/expected_output/assertions
- Reports pass/fail per skill

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | eval_wdd_file_exists | evals/evals.json created in wdd/ skill |
| 2 | eval_ward_file_exists | evals/evals.json created in ward/ skill |
| 3 | eval_ward_new_file_exists | evals/evals.json created in ward-new/ skill |
| 4 | eval_valid_structure | Each evals.json has skill_name, evals array with required fields |
| 5 | eval_assertions_present | Each eval has at least one assertion |
| 6 | eval_validate_command | `wdd eval` reports pass for valid evals |

## Must NOT
- Do NOT run the actual evals (that requires spawning AI agents)
- Do NOT implement grading or benchmarking (that's the agent's job)
- Do NOT modify skill SKILL.md content

## Must DO
- Follow agentskills.io evals.json format exactly
- Include realistic prompts that test checkpoint discipline
- Include assertions focused on STOP gates and state transitions
- Generate evals via bootstrap command (not hand-authored)
- Wire `wdd eval` into cli.ts

## Verification
- All 6 tests pass
- `wdd bootstrap claude` generates skills with evals/
- `wdd eval` validates all three skill eval files
- TypeScript compiles with zero errors

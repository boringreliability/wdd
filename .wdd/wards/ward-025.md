---
ward: 25
revision: null
name: "Multi-Agent Contest"
epic: "orchestration"
status: "planned"
dependencies: [20, 22]
layer: "typescript"
estimated_tests: 9
created: "2026-05-16"
completed: null
---
# Ward 025: Multi-Agent Contest

## Scope
Implement `wdd contest` — orchestrate N agents to produce *proposals* (default) or isolated *implementations* for a single Ward. A QA stage (separate agent or human) scores proposals using a structured rubric and recommends a winner or synthesis.

Most speculative Ward in the epic. Multi-agent contest is for arkitekturvalg, public API design, kompleks bugfix, performance/algorithmic work — not trivial mechanical tasks.

Source design: [wdd_v2.md](wdd_v2.md) "Multi-agent contest" section.

## Inputs
- Ward 20's `execution_strategy` field (`parallel-proposals` | `parallel-implementations`)
- Ward 20's `contest_agents: N` and `qa_required: true` fields
- Ward 22's lock system (for parallel-implementations mode)
- Adapter content for generating per-agent prompts

## Outputs
- `src/commands/contest.ts` exporting:
  - `prepareContest(wardId, agentCount, mode): ContestPlan`
  - `recordProposal(wardId, agentName, proposal): void`
  - `scoreContest(wardId): QARubric` (scaffold; actual scoring is human/AI)
- `wdd contest <ward-id> --agents <N> --mode <proposal|implementation>` CLI
- `.wdd/contests/ward-{NNN}/` directory structure
- QA rubric template

## Specification (sketch)

### Modes
- `proposal` (default, safe): N agents produce approach docs in `.wdd/contests/`, no code changes
- `implementation` (advanced): N agents work in isolated git worktrees, QA compares diffs. Requires `contest_safe: true` in ward frontmatter

### Per-agent task generation
```
You are agent {N} of {total} for Ward {id}.

Read: wdd session
Task: {ward scope}

Your output: write to .wdd/contests/ward-{id}/proposal-{N}.md
Include:
- Approach summary
- API shape
- Files you would touch
- Risks
- Test plan
- Tradeoffs vs other plausible approaches

Do NOT modify production code in this contest stage.
STOP when proposal is written.
```

### QA rubric template
```yaml
correctness:        0-5
test_coverage:      0-5
simplicity:         0-5
architecture_fit:   0-5
api_ergonomics:     0-5
maintainability:    0-5
risk:               low | medium | high
spec_compliance:    pass | fail

disqualifiers:
  - violates Must NOT
  - changes tests to fit implementation
  - hides errors
  - mutates inputs unexpectedly
  - crosses package boundaries incorrectly
```

### `wdd contest` output
```
Preparing contest for Ward 010 (3 agents, mode: proposal)

Agent prompts written to:
  .wdd/contests/ward-010/prompt-1.md
  .wdd/contests/ward-010/prompt-2.md
  .wdd/contests/ward-010/prompt-3.md

QA rubric: .wdd/contests/ward-010/qa-rubric.yaml

Next steps:
  1. Run each agent against its prompt
  2. Each agent writes proposal-{N}.md
  3. Run a QA agent or review manually
  4. Synthesize → start the Ward with the chosen approach
```

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | prepares_contest_directory | `.wdd/contests/ward-XXX/` created with prompts |
| 2 | generates_per_agent_prompt | Each prompt has unique agent index + shared task |
| 3 | proposal_mode_no_code_change | Prompt instructs agents NOT to modify code |
| 4 | implementation_mode_requires_contest_safe | Errors if ward lacks contest_safe: true |
| 5 | qa_rubric_template_present | qa-rubric.yaml written with required fields |
| 6 | record_proposal_writes_file | recordProposal saves to expected path |
| 7 | rejects_strict_review_mode | Cannot contest a strict-review-mode Ward without explicit override |
| 8 | wdd_contest_cli | CLI emits expected structure |
| 9 | score_contest_aggregates_files | scoreContest finds all proposal files |

## Must NOT
- Do NOT execute agents — this is planning/coordination, not an agent runner
- Do NOT auto-synthesize proposals — human or QA agent does that
- Do NOT default to `implementation` mode — proposal is safer
- Do NOT allow contest on `risk: high` wards without explicit `contest_safe: true`

## Must DO
- Generate clear, copy-pasteable prompts per agent
- QA rubric is YAML, human/QA-agent fillable
- Proposal artifacts live in `.wdd/contests/`

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. Create fixture ward with `execution_strategy: parallel-proposals, contest_agents: 3`
2. `wdd contest <id>` — verify .wdd/contests/ structure created
3. Inspect prompts — each should be runnable as an agent task
4. Manually write 3 proposal files, run `wdd contest <id> --score` — verify aggregation

### Pass criteria
- [ ] Per-agent prompts are distinct (each knows its index)
- [ ] Prompts include enough context for an agent to start
- [ ] QA rubric is fillable and machine-readable
- [ ] Implementation mode refuses non-contest_safe wards

## Verification
- All 9 tests pass
- Manual smoke test demonstrates real contest setup
- TypeScript compiles clean

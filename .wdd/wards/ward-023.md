---
ward: 23
revision: null
name: "Review Modes"
epic: "orchestration"
status: "planned"
dependencies: [20]
layer: "typescript"
estimated_tests: 8
created: "2026-05-16"
completed: null
---
# Ward 023: Review Modes (strict/accelerated/autonomous)

## Scope
Make the ward state machine respect `review_mode` from Ward 20's frontmatter. Three modes change where checkpoint STOPs happen:

- **strict** — current behavior. STOP at red→approved, gold→complete.
- **accelerated** — planned→red→approved→gold in one session, STOP only before complete.
- **autonomous** — for low-risk wards only (docs, examples). Agent may run all the way to complete and produce a review report.

Updates `/ward` skill content so AI behavior changes per ward's review mode. `wdd ward status` surfaces review mode when transitioning.

## Inputs
- Ward 20's `review_mode` and `risk` fields
- Ward 3's `VALID_TRANSITIONS` (no change — review_mode affects WHERE we stop, not legal transitions)
- Ward 13's `/ward` skill content

## Outputs
- Updated `/ward` skill in [adapter-content.ts](src/templates/adapter-content.ts) with branching protocol per `review_mode`
- Updated `wdd ward status` output displaying review mode warning
- `src/utils/review-mode.ts` exporting:
  - `resolveReviewMode(ward): ReviewMode`
  - `shouldStopAt(currentStatus, targetStatus, mode): boolean`
- Validate rule: `autonomous` requires `risk: low`

## Specification (sketch)

### `/ward` skill protocol branching
```
1. Read ward frontmatter
2. Determine review_mode (default: strict)

If strict:
  planned → red [STOP for approval]
  approved → gold [STOP for approval]
  gold → complete

If accelerated:
  planned → red → approved → gold in one session
  [STOP for approval]
  → complete

If autonomous (requires risk: low):
  planned → red → approved → gold → complete
  + produce review report at end
```

### Validate enforcement
`wdd validate` rejects `review_mode: autonomous` combined with `risk: medium` or `risk: high`.

### CLI display
```
Ward 019: planned → red (review_mode: strict — STOP expected at red)
```

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | resolve_defaults_to_strict | Ward without review_mode → strict |
| 2 | should_stop_strict_planned_red | strict stops at red |
| 3 | should_stop_accelerated_only_gold | accelerated stops only at gold |
| 4 | should_stop_autonomous_never | autonomous never stops mid-flow |
| 5 | validate_rejects_autonomous_high_risk | autonomous + risk=high → error |
| 6 | validate_rejects_autonomous_medium_risk | autonomous + risk=medium → error |
| 7 | skill_content_includes_mode_branching | /ward skill has branching protocol |
| 8 | status_cli_shows_mode_warning | `wdd ward status` output includes mode |

## Must NOT
- Do NOT change `VALID_TRANSITIONS` — review_mode is about WHERE we stop
- Do NOT auto-enforce stops in CLI — the AI agent is the actor
- Do NOT permit autonomous beyond risk=low

## Must DO
- Keep strict as the safe default
- Document autonomous's constraints loudly in skill content
- `wdd validate` is the gate for autonomous + non-low-risk

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. Fixture ward with `review_mode: autonomous, risk: medium` → `wdd validate` fails
2. Bootstrap claude skill → verify `/ward` content has three-mode branching
3. `wdd ward status 19 red` — output shows `(review_mode: strict — STOP expected at red)`

### Pass criteria
- [ ] Skill content branches on review_mode
- [ ] Validate enforces autonomous + risk=low
- [ ] CLI surfaces mode in transition messages

## Verification
- All 8 tests pass
- Skill content verified via bootstrap+grep
- TypeScript compiles clean

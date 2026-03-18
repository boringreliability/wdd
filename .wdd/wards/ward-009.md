---
ward: 9
revision: null
name: "Complete Output Enhancements"
epic: core-cli
status: complete
dependencies: [5]
layer: typescript
estimated_tests: 5
created: 2026-03-17
completed: 2026-03-17
---
# Ward 009: Complete Output Enhancements

## Scope
Enhance `wdd complete` output with two actionable reminders: a commit suggestion with pre-built message, and a CONTEXT.md update reminder. These make the completion ceremony explicit — "no magic, no silence."

## Inputs
- `completeWard()` from Ward 5
- Ward frontmatter (name, number)

## Outputs
- Commit reminder line with suggested git command and message
- CONTEXT.md update reminder with specific checklist
- Both included in `CompleteResult.steps`

## Specification

### Commit Reminder
After all completion steps, output:
```
→ Remember to commit: git add .wdd/ && git commit -m "Ward {N} complete: {Name}"
```

### CONTEXT.md Reminder
Output warning if CONTEXT.md exists but was not modified during completion:
```
⚠ CONTEXT.md was not modified. Review and update it now:
  - Update "Current State" to reflect Ward {N} completion
  - Update "What Comes Next" for the next Ward
  - Run: wdd validate (checks CONTEXT.md size)
```

### Implementation
- Add reminder strings to the `steps` array returned by `completeWard()`
- Commit reminder always shown
- CONTEXT.md reminder always shown (we never modify CONTEXT.md in complete)

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | complete_commit_reminder | Output contains git commit suggestion with ward name |
| 2 | complete_context_reminder | Output contains CONTEXT.md update reminder |
| 3 | complete_commit_has_ward_name | Commit message includes ward name from frontmatter |
| 4 | complete_commit_has_ward_number | Commit message includes ward number |
| 5 | complete_context_has_validate | Reminder mentions wdd validate |

## Must NOT
- Do NOT auto-commit (human owns git history)
- Do NOT modify CONTEXT.md
- Do NOT break existing test assertions (steps array still has >= 3 items)

## Must DO
- Include ward name and number in commit suggestion
- Include actionable checklist in CONTEXT.md reminder
- Append reminders to existing steps array

## Verification
- All 5 tests pass + existing Ward 5 tests still pass
- TypeScript compiles with zero errors

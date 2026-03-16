---
ward: 3
revision: null
name: "Ward Status Transitions"
epic: core-cli
status: complete
dependencies: [1, 2]
layer: typescript
estimated_tests: 10
created: 2026-03-14
completed: 2026-03-14
---
# Ward 003: Ward Status Transitions

## Scope
Implement `wdd ward status` command that updates a Ward's status in its frontmatter. Enforces the legal state transition table from WDD-FRAMEWORK-SPEC.md Section 4.2. Includes reading ward files, updating frontmatter in-place, and rejecting invalid transitions.

## Inputs
- Ward files created by `createWard()` (Ward 2)
- Frontmatter parser/serializer (Ward 1)
- Legal transition table from spec

## Outputs
- `updateWardStatus(projectDir, wardId, newStatus)` function
- Ward file updated in-place with new status
- Rejection feedback appended to ward body on invalid Gold→Red transition

## Specification

### Legal Transitions
| From | To | Trigger |
|------|----|---------|
| planned | red | AI starts writing tests |
| planned | blocked | Dependency incomplete |
| red | approved | Human approves tests |
| red | red | Human rejects tests (with feedback) |
| approved | gold | AI starts implementing |
| gold | complete | All tests pass + human verifies |
| gold | red | Human rejects implementation (with feedback) |
| blocked | planned | Blocking dependency completed |

### Behavior
- Read ward file, parse frontmatter
- Validate transition is legal
- Update frontmatter status field
- If transitioning to `complete`: set `completed` date to today
- If transitioning gold→red (rejection): append feedback note to ward body
- Write updated file back
- Print confirmation or rejection message

### Ward ID Resolution
- Accept integer (3) or string with revision ("3b")
- Find matching file: `ward-003.md` or `ward-003b.md`
- Error if ward file not found

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | transition_planned_to_red | Valid: planned → red |
| 2 | transition_red_to_approved | Valid: red → approved |
| 3 | transition_approved_to_gold | Valid: approved → gold |
| 4 | transition_gold_to_complete | Valid: gold → complete, sets completed date |
| 5 | transition_gold_to_red | Valid: gold → red (rejection), appends feedback |
| 6 | transition_planned_to_blocked | Valid: planned → blocked |
| 7 | transition_blocked_to_planned | Valid: blocked → planned |
| 8 | reject_invalid_transition | Rejects planned → complete (skipping steps) |
| 9 | reject_invalid_red_to_gold | Rejects red → gold (must go through approved) |
| 10 | resolve_ward_by_id | Finds ward file by integer ID |

## Must NOT
- Do NOT implement ward reopen (that's Ward 4)
- Do NOT regenerate PROGRESS.md (that's a future Ward)
- Do NOT validate dependencies (blocked status is set manually)
- Do NOT modify any other ward files besides the target

## Must DO
- Enforce ALL transitions from the legal transition table
- Set `completed` date when transitioning to complete
- Return clear error messages for invalid transitions
- Preserve ward body content when updating frontmatter

## Verification
- All 10 tests pass
- TypeScript compiles with zero errors

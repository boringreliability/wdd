---
ward: 4
revision: null
name: "Ward Reopen"
epic: core-cli
status: complete
dependencies: [2, 3]
layer: typescript
estimated_tests: 7
created: 2026-03-14
completed: 2026-03-14
---
# Ward 004: Ward Reopen

## Scope
Implement `wdd ward reopen` that creates a fix Ward from a completed Ward. The original Ward stays Complete with a reopening note appended. A new ward file (e.g., `ward-003b.md`) is created with the reason, link to original, and empty spec ready for the full GS-TDD cycle.

## Inputs
- `resolveWardFile()` from Ward 3
- `parseFrontmatter()` / `serializeFrontmatter()` from Ward 1
- Ward file conventions from WDD-FRAMEWORK-SPEC.md Section 4.2 and 15

## Outputs
- `reopenWard(projectDir, wardId, reason)` function
- Original ward file updated with reopening note in body
- New ward file `ward-{NNN}{revision}.md` created

## Specification

### Behavior
- Only completed Wards can be reopened
- Original ward stays `status: complete` — integrity preserved
- Reopening note appended to original ward body
- New file created: `ward-{NNN}b.md` (or `c`, `d` if `b` exists)
- New file has `ward: N, revision: "b"`, `status: planned`, link to original
- Reason is included in new ward's body

### Revision Letter Sequencing
- First reopen: `b`
- If `b` exists: `c`, then `d`, etc.
- Scan existing files to determine next letter

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | reopen_creates_fix_ward | Creates ward-001b.md from completed ward-001 |
| 2 | reopen_preserves_original | Original ward-001 stays status: complete |
| 3 | reopen_appends_note | Original ward body gets reopening note |
| 4 | reopen_fix_ward_frontmatter | New ward has correct ward number, revision "b", status planned |
| 5 | reopen_fix_ward_body | New ward body contains reason and link to original |
| 6 | reopen_rejects_non_complete | Errors when trying to reopen a non-complete ward |
| 7 | reopen_sequential_revision | Second reopen creates ward-001c.md |

## Must NOT
- Do NOT modify original ward's frontmatter status
- Do NOT delete or replace the original ward file
- Do NOT implement any other commands
- Do NOT validate dependencies or run tests

## Must DO
- Append reopening note with date and reason to original ward body
- Set new ward's revision field correctly
- Include reason in new ward's Scope section
- Error clearly if ward is not complete

## Verification
- All 7 tests pass
- TypeScript compiles with zero errors

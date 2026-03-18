# Backlog — WDD CLI

## v0.2.0

### Priority 1 — Must Have
- [ ] **BUG-001**: CLI `ward status 13b` parses as ward 13 — parseInt strips revision suffix. `resolveWardFile()` supports revisions but CLI argument parsing does not.
- [ ] **CLI-012**: Publish to npm as `wdd` package

### Priority 2 — Should Have
- [ ] **CLI-013**: `wdd bootstrap windsurf` — Windsurf adapter
- [ ] **CLI-014**: `wdd condense` — CONTEXT.md size management

### Priority 3 — Nice to Have
- [ ] **CLI-015**: `wdd bootstrap` with interactive adapter selection

## Completed (v0.1.0)
- [x] **CLI-001**: `wdd init`
- [x] **CLI-002**: `wdd ward create`
- [x] **CLI-003**: `wdd ward status`
- [x] **CLI-004**: `wdd ward reopen`
- [x] **CLI-005**: `wdd complete`
- [x] **CLI-006**: `wdd session`
- [x] **CLI-007**: `wdd status`
- [x] **CLI-008**: `wdd progress`
- [x] **CLI-009**: `wdd validate`
- [x] **CLI-010**: `wdd search`
- [x] **CLI-011**: `wdd bootstrap claude|cursor`
- [x] **CLI-011b**: Skill commands /wdd, /ward, /ward-new
- [x] **CLI-011c**: Skill format fix — directory-based SKILL.md

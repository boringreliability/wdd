---
epic: "context"
name: "Working Memory"
status: "active"
created: "2026-08-17"
---
# Epic 03: Working Memory

## Goal
Stop treating `CONTEXT.md` as a logbook. Working memory — what is in flight,
what is blocked, what comes next — is **generated** from Ward frontmatter on
this checkout, the same way `PROGRESS.md` is generated. `CONTEXT.md` keeps only
invariants (active constraints). Agents read `wdd session`, not a diary.

This is the same move as epic-scoped Ward IDs: one global sequence (ward 1–500,
one global CONTEXT) does not survive parallel branches and agents.

## Why not `wdd condense` (CLI-014)
Condensing a logbook still leaves a logbook. Size limits (200 lines) already
exist and did not prevent Architecture Decisions tables, release history, or
"Current State" that describes a different epic than the branch you are on.
This epic **replaces** CLI-014.

## Why not per-epic CONTEXT files
Git already isolates in-flight Ward files per branch. If session derives
working memory from incomplete Wards on this checkout, the view is
branch-correct without a second tree of markdown. `--epic` filters when one
checkout has several epics in flight (the opus-apps case).

## Wards
| Ward | Name | Status | Depends |
|------|------|--------|---------|
| context-001 | Derived working memory | planned | — |
| context-002 | Dogfood + retire CONTEXT as session brain | planned | context-001 |

## Integration Points
- Extends Ward 6 `assembleSession` / `SESSION_SECTIONS` (data-driven section list from Ward 19)
- Extends Ward 7 `validate` beyond line/byte limits
- Changes Ward 5/9 `complete` reminders so agents stop appending Current State
- Changes Ward 1 `init` CONTEXT template and Ward 11 adapter copy
- Does **not** steal schema 1.3 from orchestration Ward 20 — no `wdd_version` bump; CONTEXT.md is user content (Ward 17: migrations never rewrite it)

## Completion Criteria
- `wdd session` shows WORKING MEMORY derived from incomplete Wards
- `wdd session --epic <slug>` scopes that view
- `wdd validate` fails CONTEXT.md that is a logbook
- Adapters tell the AI to run `wdd session`, not to maintain a project diary
- This repo's own CONTEXT.md is slimmed to constraints (context-002)
- CLI-014 closed as superseded

## Non-Goals
- No git branch name in filenames
- No embeddings, no database, no SaaS
- No automatic rewrite of existing projects' CONTEXT.md on `wdd upgrade`
- No orchestration locks (Epic 02)

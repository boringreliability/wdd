---
epic: orchestration
name: "WDD v2 — Multi-Agent Orchestration"
number: 2
status: planned
created: 2026-05-16
---
# Epic 02: WDD v2 — Multi-Agent Orchestration

## Goal
Transform WDD from "test-first project management for one agent" into
"dependency-aware orchestration for many agents." Build on the existing
`dependencies` array in ward frontmatter to enable graph queries, parallel
batch planning, resource-conflict detection, lock-based agent claims,
review-mode discrimination, and multi-agent contest workflows.

## Wards
| Ward | Name | Status | Depends |
|------|------|--------|---------|
| 19 | Dependency Graph & Ready Queue | planned | — |
| 20 | Planning Metadata Frontmatter | planned | 19 |
| 21 | Parallel Batch Computation | planned | 20 |
| 22 | Ward Locking (claim/release) | planned | 20 |
| 23 | Review Modes (strict/accelerated/autonomous) | planned | 20 |
| 24 | Graph Visualization & Critical Path | planned | 19 |
| 25 | Multi-Agent Contest | planned | 20, 22 |

## Integration Points
- Builds on Ward 1's frontmatter parser (already accepts arbitrary keys)
- Builds on Ward 17's schema migration framework (will likely bump 1.2 → 1.3 when planning metadata becomes structural)
- Extends Ward 16's `wdd api` philosophy: data-driven, not conditional cascades
- Surfaces in `wdd session` so AI agents see the broader plan, not just current ward

## Completion Criteria
- `wdd graph`, `wdd ready`, `wdd parallel`, `wdd critical-path` all produce useful output on this project
- Planning metadata (touches, workstreams, risk, review_mode) is part of the ward template
- Locks prevent two agents claiming wards with overlapping touches
- Review modes change checkpoint behavior in `/ward` skill
- Contest workflow generates proposal artifacts and QA recommendations
- Source: design captured in [wdd_v2.md](wdd_v2.md)

## Non-Goals (for this epic)
- Real-time agent coordination (no IPC/socket layer) — locks are file-based
- Automatic conflict resolution — `wdd parallel` warns, doesn't auto-resolve
- Distributed multi-machine orchestration — single-repo, single-machine scope
- Replacing human review for high-risk Wards — `autonomous` mode is for low-risk only

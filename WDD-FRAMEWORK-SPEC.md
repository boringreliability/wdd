# WDD-FRAMEWORK-SPEC.md — Ward-Driven Development Framework

## Document Control

| Field | Value |
|-------|-------|
| Type | Framework Specification |
| Status | Ready for Implementation |
| Date | 2026-03-14 |
| Version | 1.1 (incorporates GPT 5.4 review feedback) |
| Origin | Methodology developed during vcore (24 Wards, 256+ tests, 2 days) |
| Goal | Tool-agnostic framework that works with Claude Code, Cursor, Windsurf, Copilot, or any AI coding assistant |

---

## 1. Design Principles

### 1.1 Tool Agnostic

WDD is a **file-based methodology**. All state lives in markdown and JSON files in the project repository. No proprietary formats. No database. No SaaS dependency. Any AI tool that can read and write files can participate.

The framework works if:
- The AI can read `.md` and `.json` files
- The AI can create and edit files
- The human can review diffs in git

That's it. Claude Code, Cursor, Windsurf, Copilot, Aider, raw ChatGPT + copy-paste — all valid. Some tools support the workflow more naturally than others (file-centric tools like Claude Code and Cursor integrate most smoothly), but the protocol works with anything that can read and write project files.

### 1.2 Strong Conventions, Minimal Configuration

WDD uses a fixed directory structure with strong conventions. `wdd init` creates the structure with sensible defaults. A small `config.json` captures project-specific settings (test commands, lint commands), but the methodology itself requires no configuration.

### 1.3 Living Documents

Specs, context, and status files are **living documents** that update as the project progresses. They are the single source of truth — not the conversation history, not the AI's memory, not a Jira board.

### 1.4 Human Is Architect

The framework enforces human approval gates. AI proposes, human approves. AI implements, human verifies. The framework makes it easy to be the architect and hard to accidentally delegate architecture to AI.

### 1.5 Git Native

Every state change is a file change. Every file change is a git commit. The project history IS the methodology history. `git log --oneline` should read like a Ward completion timeline.

### 1.6 Three-Layer Memory Model

AI-assisted projects have three distinct memory needs. WDD addresses each with a dedicated mechanism:

| Layer | File | Analogy | Update Frequency |
|-------|------|---------|-----------------|
| **Constitutional memory** | `PROJECT.md` | Identity, principles, invariants | Rarely — only when architecture changes fundamentally |
| **Working memory** | `CONTEXT.md` | Active state, current constraints, next steps | Every Ward completion — condensed, size-limited |
| **Long-term memory** | `memory/` | Decisions, learnings, historical snapshots | Accumulated over project lifetime — searchable, never in active context |

This separation prevents the two classic failures: context files that grow into unreadable swamps, and historical rationale that vanishes into chat logs.

### 1.7 Human-Readable Protocol, Machine-Checkable Invariants

Every WDD artifact must be both human-readable (markdown) and machine-parseable (YAML frontmatter, consistent structure). This is the core design test for every feature:

- Does it make human understanding clearer?
- Does it make something important machine-checkable?
- If neither: remove it. Methods die of decoration.

---

## 2. Directory Structure

```
.wdd/
├── PROJECT.md              # Project identity, goals, architecture overview
├── CONTEXT.md              # Living context — current state only (size-limited)
├── BACKLOG.md              # Versioned backlog with prioritized items
├── PROGRESS.md             # Auto-generated progress dashboard (never hand-edit)
├── config.json             # Minimal project config
├── epics/
│   ├── 01-core.md          # Epic grouping related Wards
│   ├── 02-verticals.md
│   └── 03-integration.md
├── wards/
│   ├── ward-001.md         # Individual Ward specs (with YAML frontmatter)
│   ├── ward-002.md
│   └── ...
├── reviews/
│   ├── ward-001-review.md  # Multi-AI review notes per Ward
│   └── ...
├── memory/                 # Long-term project memory (Saga-inspired)
│   ├── decisions/          # Architectural decisions with rationale
│   │   ├── 2026-03-12-ecs-over-oop.md
│   │   └── 2026-03-13-ts-owns-colors.md
│   ├── learnings/          # Lessons learned, failure postmortems
│   │   └── 2026-03-13-god-class-antipattern.md
│   └── snapshots/          # CONTEXT.md snapshots at Ward completion
│       ├── ward-010-complete.md
│       └── ward-021-complete.md
├── templates/
│   ├── ward.md             # Ward template
│   ├── epic.md             # Epic template
│   ├── review.md           # Review template
│   ├── decision.md         # Decision record template
│   └── integration.md      # Integration spec template
└── adapters/               # Tool-specific bootstrap files
    ├── claude.md            # Claude Code / CLAUDE.md rules
    ├── cursor.md            # Cursor .cursorrules content
    └── windsurf.md          # Windsurf rules content
```

**Architecture layers:**
- **Core WDD Protocol** → `.wdd/` files + conventions + CLI
- **Adapters** → Tool-specific bootstrap files (Claude, Cursor, Windsurf, etc.)

Adapters are generated from core state, not hand-maintained. This separation protects against vendor drift.

All paths relative to project root. The `.wdd/` directory is committed to git.

---

## 3. Core Documents

### 3.1 PROJECT.md

Created once at project start. Rarely modified.

```markdown
# {Project Name}

## Identity
- **Name:** vcore
- **One-liner:** Rust/WASM scene engine for data-intensive web applications
- **License:** MIT + Apache 2.0

## Architecture Overview
{High-level architecture description}
{System boundaries and layer responsibilities}

## Principles
{Stable, constitutional rules — not timestamped decisions}
- {e.g., "Rust is color-blind — no visual decisions in WASM"}
- {e.g., "TypeScript owns entity lifecycle and theming"}
- {e.g., "Zero framework dependencies — Canvas + WASM only"}

## Technology Stack
- {Language/runtime}: {Purpose}

## Non-Goals
- {What this project explicitly does NOT do}
```

**Note:** PROJECT.md contains stable principles and boundaries, not timestamped decisions. Individual architectural decisions with rationale and consequences live in `memory/decisions/`. This avoids duplicate bookkeeping — PROJECT.md says "what we believe," memory/decisions/ says "when and why we decided it."

### 3.2 CONTEXT.md — The Living Brain

**This is the most important file in the framework.** It replaces conversation history as the source of truth. Updated after every Ward completion.

```markdown
# Context — {Project Name}

## Last Updated
Ward {N} completed — {date}

## Current State
{What exists right now. What works. What's tested.}

## Architecture Decisions Made
| Decision | Rationale | Ward |
|----------|-----------|------|
| ECS with SOA layout | Cache-friendly iteration for 100K+ entities | Ward 1 |
| Zero-copy display list | Avoid memcpy on 60fps render path | Ward 7 |
| {decision} | {why} | {when} |

## Active Constraints
{Things the AI must remember across all future Wards}
- {e.g., "tick() must never contain vertical-specific logic"}
- {e.g., "All colors are owned by TypeScript theme objects"}

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Rust tests | 169 | Ward 21 |
| TS tests | 87 | Ward 22 |
| FPS | 120 | Ward 24 |

## Known Limitations
{Brief list with references to BACKLOG.md items}

## What Comes Next
{The next 1-3 Wards and why they're prioritized}
```

**Update rules:**
- CONTEXT.md is updated at the END of each Ward, not during
- The completing AI proposes an update, the human approves it
- Previous context is revised and condensed — not accumulated endlessly
- If a session spans multiple Wards, update after each one

**Size discipline (critical):**
- CONTEXT.md must stay under **200 lines / 8KB**. This is a hard limit.
- When CONTEXT.md approaches the limit, historical content is moved to `memory/`:
  - Architecture decisions → `memory/decisions/{date}-{slug}.md`
  - Lessons learned → `memory/learnings/{date}-{slug}.md`
  - Full context snapshot → `memory/snapshots/ward-{NNN}-complete.md`
- CONTEXT.md retains only: current state, active constraints, current metrics, next steps
- The `wdd complete` command handles this automatically: snapshot → condense → verify size

Without size discipline, CONTEXT.md becomes an "undead encyclopedia" that no AI reads properly.

### 3.5 Memory System (Long-Term, File-Based)

Zero-dependency long-term project memory.
No database. No embeddings. Just timestamped markdown files with YAML frontmatter.

**Decision records** (`memory/decisions/`):
```yaml
---
type: decision
date: 2026-03-12
ward: 7
tags: [architecture, rendering, performance]
supersedes: null
---
# Zero-copy display list over SharedArrayBuffer

## Decision
Display list is a flat binary buffer in WASM linear memory.
JS reads via DataView(memory.buffer, ptr, len) — no copy.

## Rationale
Copying 100KB+ per frame at 60fps = 6MB/s unnecessary allocation.

## Consequences
- Rust owns buffer layout (command opcodes + packed floats)
- JS renderer must understand binary format
- Buffer invalidated on next tick() call
```

**Learnings** (`memory/learnings/`):
```yaml
---
type: learning
date: 2026-03-13
ward: post-20
tags: [anti-pattern, integration, god-class]
---
# God Class anti-pattern from unconstrained AI

## What happened
AI given "just build a demo" without Ward structure. Produced monolithic
wasm_api.rs with hardcoded colors, entity spawning in tick(), and
vertical-specific logic in the kernel.

## Root cause
Missing Integration Spec between component Wards and demo Ward.

## Prevention
Always write Integration Spec before connecting layers.
Always include must-not list in demo Wards.
```

**Context snapshots** (`memory/snapshots/`):
Full copy of CONTEXT.md at each Ward completion. These are cheap insurance —
audit trail and rollback capability, not daily reading material. On a 50-Ward
project this produces ~50 small files. That's fine. If it ever feels like too
much, snapshot only at Epic milestones instead.

**Search:** `wdd search "display list"` performs grep over memory/ with
frontmatter tag filtering. This is a pragmatic baseline, not semantic search.
It works well for known terms, good tags, and named decisions. It works poorly
for vague queries and cross-file relationships. Good file hygiene (descriptive
names, accurate tags) makes grep surprisingly effective. Poor hygiene makes it
useless. Same as dental floss: everyone agrees in principle, few practice consistently.
The CLI enforces tag prompts at creation time to encourage hygiene.

### 3.3 BACKLOG.md

```markdown
# Backlog — {Project Name}

## v{next version}

### Priority 1 — Must Have
- [ ] **{ID}**: {Title} — {one-line description} (Source: Ward {N})

### Priority 2 — Should Have  
- [ ] **{ID}**: {Title} — {one-line description} (Source: {review/ward})

### Priority 3 — Nice to Have
- [ ] **{ID}**: {Title} — {one-line description}

## Completed
- [x] **{ID}**: {Title} — completed in Ward {N}
```

### 3.4 PROGRESS.md — Auto-Generated Dashboard

This file is **regenerated** (never manually edited) after each Ward state change.
It must show reality, not just the happy path — including blockers and reopenings.

```markdown
# Progress — {Project Name}

## Summary
{N} of {M} Wards complete · {X} tests passing · {Y} open backlog items · {Z} blocked

## Blockers
| Ward | Blocked by | Since |
|------|------------|-------|
| Ward 15 | Ward 14 (Gold) | 2026-03-12 |

## Epics
| Epic | Wards | Complete | Blocked | Status |
|------|-------|----------|---------|--------|
| Core Engine | 1-14 | 14/14 | 0 | ✅ Complete |
| Verticals | 15-20 | 6/6 | 0 | ✅ Complete |
| Integration | 21-23 | 3/3 | 0 | ✅ Complete |
| Demo | 24 | 1/1 | 0 | ✅ Complete |

## Ward Status
| Ward | Name | Tests | Status | Date |
|------|------|-------|--------|------|
| 1 | Core Types & ECS | 8 | ✅ Complete | 2026-03-12 |
| 2 | Component Stores | 15 | ✅ Complete | 2026-03-12 |
| 3 | Spatial Index | 12 | ✅ Complete | 2026-03-12 |
| 3b | Spatial Index boundary fix | 3 | 🔴 Red | 2026-03-14 |
| ... | ... | ... | ... | ... |

## Test Summary
- Rust: {N} passing, 0 failing
- TypeScript: {N} passing, 0 failing
- Total: {N}

## Timeline
{Ward completion dates — shows velocity and any stalls}
```

**Status symbols:**
- ✅ Complete
- 🔨 Gold (implementing)
- 👀 Approved (awaiting implementation)
- 🔴 Red (tests written, awaiting approval)
- ⏸️ Blocked (dependency not met)
- 📋 Planned

---

## 4. Ward Specification Format

### 4.1 Ward Template

All Ward files use **YAML frontmatter** for machine-readable metadata.
This enables CLI parsing without fragile markdown scraping.

```markdown
---
ward: 1
name: "Core Types & ECS"
epic: core
status: planned
dependencies: []
layer: rust
estimated_tests: 8
created: 2026-03-12
completed: null
---
# Ward 001: Core Types & ECS

## Scope
{One paragraph: what this Ward builds and why}

## Inputs
{What this Ward reads/uses from previous Wards}

## Outputs
{What this Ward produces for future Wards}

## Specification
{Detailed technical spec — data structures, algorithms, API surface}

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | {test_name} | {what it proves} |
| 2 | {test_name} | {what it proves} |
| ... | ... | ... |

## Must NOT
- {Explicit constraint 1}
- {Explicit constraint 2}
- {Explicit constraint 3}

## Must DO
- {Explicit requirement 1}
- {Explicit requirement 2}

## Verification
{How to prove this Ward is complete}
```

### 4.2 Ward Lifecycle States

```
                    ┌─────────┐
                    │ Planned │
                    └────┬────┘
                         │ AI starts writing tests
                    ┌────▼────┐
              ┌─────│   Red   │◄──── feedback ────┐
              │     └────┬────┘                    │
              │          │ Human reviews tests      │
              │     ┌────▼────┐                    │
              │     │Approved │─── not right ──────┘
              │     └────┬────┘
              │          │ AI implements
              │     ┌────▼────┐
              │     │  Gold   │─── violates must-not ──┐
              │     └────┬────┘                        │
              │          │ All tests pass +             │
              │          │ human verifies               │
              │     ┌────▼────┐                        │
              │     │Complete │                   back to Red
              │     └─────────┘                   with feedback
              │
              │     ┌─────────┐
              └────►│ Blocked │ (dependency not met)
                    └─────────┘
```

**Persistent states** (stored in frontmatter):
- **Planned** — Ward spec exists, work not started
- **Red** — Failing tests written, awaiting human approval
- **Approved** — Human approved tests, awaiting implementation
- **Gold** — Implementation in progress
- **Complete** — All tests pass, human verified, Ward is locked
- **Blocked** — Dependency Ward not yet Complete

**Rejected is a transition, not a state.** When the human rejects tests (Red) or implementation (Gold), the Ward returns to Red with feedback attached. The frontmatter status goes back to `red`. The rejection is logged in the Ward's body as a comment, providing audit trail without cluttering the state model.

**Valid transitions:**

| From | To | Trigger | Who |
|------|----|---------|-----|
| Planned | Red | AI starts writing tests | AI |
| Planned | Blocked | Dependency Ward incomplete | CLI/Human |
| Red | Approved | Human approves tests | Human |
| Red | Red | Human rejects tests (with feedback) | Human |
| Approved | Gold | AI starts implementing | AI |
| Gold | Complete | All tests pass + human verifies | Human |
| Gold | Red | Human rejects implementation (with feedback) | Human |
| Blocked | Planned | Blocking dependency completed | CLI |

**Ward reopening** is handled by a dedicated command, not a status change:

```bash
wdd ward reopen 003 --reason "boundary invariant broken by Ward 12"
# → Original ward-003.md stays Complete (with reopening note appended)
# → Creates ward-003b.md with reason, link to original, and empty spec
# → Human fills in new spec, new tests, full GS-TDD cycle
```

This keeps the original Ward's integrity intact while creating a controlled fix path.

### 4.3 Ward Sizing Guidelines

These are heuristics, not laws. The true measure is cognitive and architectural boundedness.

| Signal | Guideline |
|--------|-----------|
| Tests | Most Wards land around 5-20 tests. Fewer is fine for architecturally heavy Wards. More signals a split is needed. |
| Duration | One AI session (2-8 hours). If it spans sessions, it's probably too big. |
| Layers | Prefer one layer per Ward (e.g., Rust OR TypeScript, not both). Cross-layer Wards are acceptable for Integration Wards. |
| Scope | If you can't describe the Ward in one sentence, split it. |
| File count | Not a reliable signal. Some Wards touch 8 files and are well-bounded. Others touch 2 files and are too broad. Judge by cognitive scope, not file count. |

---

## 5. Epic Specification Format

```markdown
# Epic {NN}: {Name}

## Goal
{What this epic achieves as a whole}

## Wards
| Ward | Name | Status |
|------|------|--------|
| {N} | {Name} | {Status} |
| {N+1} | {Name} | {Status} |

## Integration Points
{How this epic connects to other epics}

## Completion Criteria
{When is this epic done?}
```

---

## 6. Review Process

### 6.1 When to Review

- **Spec review**: After Ward spec is written, before Red phase
- **Implementation review**: After Gold phase, before marking Complete
- **Integration review**: After Integration Spec is written, before Integration Wards
- **Milestone review**: After each Epic is complete

### 6.2 Review Template

```markdown
# Review: Ward {NNN}

## Reviewer
{AI model name and version, or human name}

## Date
{date}

## Verdict
{Approved / Approved with notes / Changes requested}

## Findings

### Architecture
{Does this Ward respect the architecture defined in PROJECT.md?}

### Correctness
{Do the tests cover the spec? Does the implementation match the tests?}

### Constraints
{Were the must-not rules followed?}

### Performance
{Any performance concerns?}

### Notes for Future Wards
{Observations that should influence future work}
```

### 6.3 Multi-AI Review Protocol

1. Primary AI (e.g., Claude Opus) writes spec and implementation
2. Human sends spec/code to Secondary AI (e.g., Gemini, GPT)
3. Secondary AI writes review using Review Template
4. Human evaluates review findings
5. Findings either: incorporated into current Ward, or added to BACKLOG.md

**Rule:** Review findings that don't block the current Ward go to backlog, not into scope creep.

---

## 7. Context Handoff Between Sessions

### 7.1 The Problem

AI tools have limited context windows. Long projects span multiple sessions. Context is lost between sessions unless explicitly preserved.

### 7.2 The Solution: CONTEXT.md + CLAUDE.md

At the **end of each session**, the AI proposes an update to CONTEXT.md that captures:
- What was accomplished
- What decisions were made
- What the current state is
- What comes next

At the **start of each session**, the AI reads:
1. `.wdd/PROJECT.md` — what is this project?
2. `.wdd/CONTEXT.md` — where are we?
3. `.wdd/PROGRESS.md` — what's done?
4. The current Ward spec — what are we doing now?

This gives the AI full context in 4 file reads, regardless of how many sessions have elapsed.

### 7.3 Tool-Specific Bootstrap Files

For Claude Code:
```markdown
# .wdd/CLAUDE.md
Read .wdd/CONTEXT.md and .wdd/PROGRESS.md before starting any work.
Follow the Ward-Driven Development methodology.
Current Ward: {N}. Read .wdd/wards/ward-{NNN}.md for spec.
Do not modify completed Wards without explicit human approval.
```

For Cursor:
```markdown
# .wdd/CURSOR.md (copied to .cursorrules)
{Same content, adapted to Cursor's rules format}
```

For other tools: the human pastes relevant context manually.

---

## 8. Integration Spec Format

Written between component Wards and integration Wards.

```markdown
# Integration Spec: {Name}

## Scope
{What layers/components are being connected}

## Responsibility Matrix
| Concern | Owner | Where |
|---------|-------|-------|
| {concern} | {Rust/TypeScript} | {file/module} |

## Data Flow
{How data moves between layers, with direction arrows}

## API Contract
{Exact methods/functions that cross boundaries}

## Must NOT Cross Boundaries
- {e.g., "Colors must not appear in Rust code"}
- {e.g., "Entity lifecycle must not be managed in WASM"}

## Verification
{How to prove the integration works}
```

---

## 9. config.json

Minimal configuration. Convention over configuration.

```json
{
  "project": "vcore",
  "version": "1.0.0",
  "methodology": "wdd",
  "wdd_version": "1.0",
  "ai_tools": {
    "primary": "claude-code",
    "review": ["gemini", "gpt"]
  },
  "conventions": {
    "test_framework_rust": "cargo test",
    "test_framework_ts": "vitest",
    "lint_rust": "cargo clippy -- -D warnings",
    "lint_ts": "eslint",
    "format_rust": "cargo fmt --check",
    "format_ts": "prettier --check"
  },
  "ward_prefix": "ward",
  "ward_digits": 3
}
```

---

## 10. CLI Specification (Future: `npx wdd`)

### 10.1 Commands

```bash
# Initialize WDD in a project
wdd init [--name "project name"]

# Create a new Ward
wdd ward create "Ward Name" --epic "Epic Name" --layer rust --tests 12
# → Creates .wdd/wards/ward-{NNN}.md from template with YAML frontmatter

# Create a new Epic
wdd epic create "Epic Name"
# → Creates .wdd/epics/{NN}-{slug}.md from template

# Update Ward status (validates transition is legal)
wdd ward status {NNN} red|approved|gold|complete|blocked
# → Updates ward frontmatter, regenerates PROGRESS.md
# → Rejects invalid transitions (e.g., Red → Complete)
# → Rejection feedback: returns to Red with note appended to ward body

# Reopen a completed Ward (creates a fix Ward)
wdd ward reopen {NNN} --reason "description of what broke"
# → Appends reopening note to original ward-{NNN}.md
# → Creates ward-{NNN}b.md with reason, link to original, empty spec
# → Original stays Complete — fix happens in the new Ward

# Complete a Ward (explicit step-by-step, not a black box)
wdd complete {NNN}
# Step 1: Run test command from config.json → show pass/fail
# Step 2: Snapshot CONTEXT.md to memory/snapshots/ward-{NNN}-complete.md
# Step 3: Check CONTEXT.md size → warn if approaching 200-line limit
# Step 4: Prompt: "Decisions to record? (y/N)"
#         → If yes: create memory/decisions/ file from template, open in $EDITOR
# Step 5: Prompt: "Learnings to record? (y/N)"
#         → If yes: create memory/learnings/ file from template, open in $EDITOR
# Step 6: Update ward frontmatter: status → complete, completed → today
# Step 7: Regenerate PROGRESS.md
# Step 8: Print: "Ward {NNN} complete. Next suggested: Ward {NNN+1}"
# Each step prints what it's doing. No magic. No silence.

# Show progress dashboard
wdd status
# → Pretty-prints PROGRESS.md to terminal (including blockers)

# Generate PROGRESS.md from current ward states
wdd progress
# → Scans all ward frontmatter, generates PROGRESS.md

# Validate project structure
wdd validate
# → Checks all required files exist, ward numbering is sequential,
#   no wards are in invalid states, dependencies are satisfied,
#   CONTEXT.md is under size limit

# Start a session (prints context for AI)
wdd session
# → Prints PROJECT.md + CONTEXT.md + current ward spec to stdout
#   Can be piped to AI: wdd session | pbcopy

# Search project memory
wdd search "display list"
# → Greps memory/ directory with frontmatter tag filtering
# → Returns matching decisions, learnings, and snapshots

# Generate bootstrap file for specific tool
wdd bootstrap claude|cursor|windsurf
# → Generates tool-specific adapter file from current context
```

### 10.2 Implementation Notes

- Written in TypeScript, published as npm package
- Zero runtime dependencies beyond Node.js built-ins + a YAML frontmatter parser
- All state in `.wdd/` directory — CLI is stateless
- Works offline — no API calls, no cloud services
- Parses Ward state from YAML frontmatter, not markdown body
- Validates state transitions against the legal transition table
- `wdd session` is the killer feature: instant context for any AI tool
- `wdd complete` is the workflow feature: snapshot → condense → remember → progress

---

## 11. Claude Code Skill Specification

### 11.1 Skill Structure

```
/mnt/skills/user/wdd/
├── SKILL.md              # Skill entrypoint — read by Claude Code
├── templates/
│   ├── ward.md
│   ├── epic.md
│   ├── review.md
│   ├── integration.md
│   ├── project.md
│   ├── context.md
│   └── config.json
└── examples/
    ├── vcore-ward-001.md  # Real example from vcore
    ├── vcore-ward-021.md  # Integration ward example
    └── vcore-context.md   # Context document example
```

### 11.2 SKILL.md Content

```markdown
# Ward-Driven Development (WDD) Skill

## When to Use
Use this skill when the user asks to:
- Initialize WDD in a project
- Create a new Ward or Epic
- Update project context
- Generate progress reports
- Bootstrap a session
- Review Ward implementations

## How to Use

### Initialize
1. Read all templates from /mnt/skills/user/wdd/templates/
2. Create .wdd/ directory structure
3. Create PROJECT.md from user input
4. Create empty CONTEXT.md, BACKLOG.md, PROGRESS.md
5. Create config.json with project defaults

### Create Ward
1. Read .wdd/templates/ward.md
2. Determine next ward number from existing wards
3. Create ward file with user-provided scope
4. Update PROGRESS.md

### Start Session
1. Read .wdd/PROJECT.md
2. Read .wdd/CONTEXT.md
3. Read .wdd/PROGRESS.md
4. Find first non-complete Ward
5. Read that Ward's spec
6. Present summary to user

### Complete Ward
1. Verify all tests pass (run test command from config.json)
2. Update Ward status to Complete
3. Propose CONTEXT.md update
4. Regenerate PROGRESS.md
5. Suggest next Ward

## Critical Rules
- NEVER modify a Complete ward without human approval
- ALWAYS update CONTEXT.md after completing a Ward
- ALWAYS include a must-not list in Ward specs
- NEVER skip the human approval gate between Red and Gold
- Read .wdd/CONTEXT.md at the start of every session
```

---

## 12. Comparison with BMAD

BMAD and WDD solve different problems in AI-assisted development. BMAD optimizes for role-driven ideation and orchestration. WDD optimizes for bounded implementation and architectural control. Neither is universally better — they target different failure modes.

| Aspect | BMAD | WDD |
|--------|------|-----|
| **Optimizes for** | Ideation, role orchestration | Implementation control, architectural integrity |
| **Scope unit** | Stories/tasks | Wards (bounded, tested, constrained) |
| **Quality gate** | AI self-assessment via personas | Human approval + optional multi-AI review |
| **Context management** | Persona memory + PRD | CONTEXT.md + memory/ (file-based, size-limited) |
| **Architecture** | PRD + architecture doc | PROJECT.md + Integration Specs + must-not lists |
| **Failure response** | Retry with different persona | Revert Ward, document in backlog, create fix Ward |
| **Test strategy** | Optional, varies by persona | Mandatory, spec-first (GS-TDD) |
| **Tool coupling** | Designed for specific AI setups | Tool-agnostic (filesystem protocol) |
| **Constraint mechanism** | Persona role boundaries | Explicit must-not lists per Ward |
| **Evidence** | Theoretical framework | Built vcore: 24 Wards, 256+ tests, 2 days |

**When to use BMAD:** Early-stage exploration, product ideation, when you need AI to help define what to build.

**When to use WDD:** Construction phase, when you know what to build and need AI to build it correctly at scale without architectural drift.

---

## 13. Implementation Order

### Phase 1: Templates (Immediate)
Create all markdown templates in a standalone repository.
Any project can copy the `.wdd/` structure and start using WDD manually.
This is the MLP (Minimal Lovable Product) — it works today with zero tooling.

### Phase 2: CLI Tool (`npx wdd`)
Build the CLI for tool-agnostic usage. This is the motor.
If the CLI exists, any AI can `wdd session` and get full context.
MLP command set (10 commands): init, ward create, ward status, ward reopen, complete, session, status, progress, validate, search.

### Phase 3: Adapter Generators
`wdd bootstrap claude|cursor|windsurf` generates tool-specific rules files.
These are thin wrappers over the core protocol, not platforms.

### Phase 4: Claude Code Skill (Optional)
Package templates + SKILL.md for Claude Code native integration.
This is a convenience layer, not a requirement. WDD works without it.

### Phase 5: Documentation Site
boringreliability.dev/wdd — methodology docs, examples, case study (vcore).

---

## 14. Success Criteria

WDD is successful if:

1. A developer can start a new project with `wdd init` and have structure in 30 seconds
2. An AI tool can read `.wdd/CONTEXT.md` and have full project context in one file
3. Architecture violations are detected early, localized, and corrected through the Ward workflow rather than silently spreading
4. Context survives across sessions without loss — CONTEXT.md + memory/ provides full continuity
5. The methodology works identically with Claude Code, Cursor, or any other AI tool
6. A new team member can read `.wdd/PROGRESS.md` and understand project status immediately
7. CONTEXT.md stays under 200 lines regardless of project size

---

## 15. v1 File Contracts

Concrete contracts for CLI implementation. These are not guidelines — they are parseable rules.

### Ward frontmatter (required keys)
```yaml
ward: 1                    # integer, base ward number
revision: null             # null for original, "b"/"c"/etc for reopened wards
name: "Core Types & ECS"  # string, human-readable
epic: core                 # string, matches epic slug
status: planned            # enum: planned|red|approved|gold|complete|blocked
dependencies: [3, "3b"]   # array of ward references (integer or "Nb" string)
layer: rust                # enum: rust|typescript|integration|demo
estimated_tests: 8         # integer
created: 2026-03-12       # ISO date
completed: null            # ISO date or null
```

### Ward ID format
- Canonical ID: ward number + optional revision suffix → `3` or `3b`
- Files: `ward-{NNN}.md` for originals, `ward-{NNN}b.md` for reopened
- `wdd ward reopen 3` creates `ward-003b.md` with `ward: 3, revision: b`
- Dependencies can reference either format: `[3]` or `["3b"]`
- Display: "Ward 3" or "Ward 3b"

### Epic slug format
- Lowercase, hyphens, no spaces: `core`, `verticals`, `integration`
- Files: `.wdd/epics/{NN}-{slug}.md` where NN is zero-padded 2 digits

### Memory file naming
- Decisions: `memory/decisions/{YYYY-MM-DD}-{slug}.md`
- Learnings: `memory/learnings/{YYYY-MM-DD}-{slug}.md`
- Snapshots: `memory/snapshots/ward-{NNN}-complete.md`
- Slugs: lowercase, hyphens, max 50 chars

### Memory frontmatter (required keys)
```yaml
type: decision             # enum: decision|learning
date: 2026-03-12          # ISO date
ward: 7                    # integer or null (for cross-ward items)
tags: [architecture, perf] # array of lowercase strings
```

### Tag format
- Lowercase, no spaces, no special chars beyond hyphens
- Minimum 1 tag per memory file (enforced by `wdd remember`)

### Status symbols (for PROGRESS.md)
```
planned   → 📋
red       → 🔴
approved  → 👀
gold      → 🔨
complete  → ✅
blocked   → ⏸️
```

### CONTEXT.md hard limits
- Maximum 200 lines
- Maximum 8KB file size
- `wdd validate` checks both

---

## 16. MLP Scope (Minimal Lovable Product)

The MLP is not a stripped-down embarrassment. It's the smallest thing that makes developers say "this actually makes my work better." Ship less, but ship it polished.

### MLP Includes

**Templates (Phase 1):**
- `.wdd/` scaffold with all directories
- Ward template with YAML frontmatter
- Epic template
- Decision and learning templates
- PROJECT.md, CONTEXT.md, BACKLOG.md starter templates
- config.json with sensible defaults

**CLI (Phase 2) — 10 commands:**
- `wdd init` — scaffold project
- `wdd ward create` — create ward from template with frontmatter
- `wdd ward status` — update status with transition validation
- `wdd ward reopen` — create fix ward from completed ward
- `wdd complete` — step-by-step ward completion (includes remember prompts)
- `wdd session` — assemble context for AI consumption
- `wdd status` — pretty-print current progress to terminal
- `wdd progress` — regenerate PROGRESS.md from frontmatter
- `wdd validate` — check structure, states, dependencies, context size
- `wdd search` — grep memory/ with frontmatter tag filtering

Note: `wdd remember` is not a separate command — decision/learning recording is integrated into the `wdd complete` flow via prompts. If a developer needs to record a decision outside of Ward completion, they create a file in `memory/decisions/` manually using the template.

**Memory (integrated into complete flow):**
- `memory/decisions/` with template and tag prompts
- `memory/learnings/` with template
- `memory/snapshots/` auto-created by `wdd complete`
- `wdd search` — grep with frontmatter tag filtering

### MLP Does NOT Include

- Fancy dashboards or TUI interfaces
- Auto-summarization or AI-powered condensation
- Vector search or semantic memory
- Editor plugins or IDE integration
- Web interface
- Agent orchestration
- Anything that requires a database

The MLP is files, frontmatter, a simple CLI, and discipline. That's the product. Everything else must earn its place by proving it makes developers' work measurably better.

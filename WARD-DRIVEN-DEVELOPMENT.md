# Ward-Driven Development (WDD)

## A control system for AI-assisted software construction

**Version:** 1.1
**Authors:** Dennis (Human Architect), Claude Opus (AI Implementer)
**Reviewed by:** GPT 5.4 (methodology review), Gemini 3.1 Pro (architecture review)
**Origin:** Developed during construction of vcore, a Rust/WASM scene engine — 24 Wards, 256+ tests, 4 verticals, 120 FPS, built in 2 days.
**Date:** March 2026

---

## The Problem

AI coding assistants are extraordinarily capable implementers. Given a clear task, they produce working code faster than any human. But given an ambiguous task — "build me a demo" — they optimize for the shortest path to visible output, sacrificing architecture, separation of concerns, and long-term maintainability.

The failure mode is consistent and predictable:

- **Scope creep**: The AI solves problems you didn't ask it to solve
- **God Classes**: Everything gets crammed into one file because it's faster
- **Hardcoded values**: Demo-specific data ends up in kernel code
- **Architecture collapse**: Clean abstractions get bypassed for expedience
- **Invisible regression**: New code quietly breaks invariants from earlier work

These failures don't happen because AI is incompetent. They happen because AI is *too competent* at short-term problem solving and has no intrinsic sense of architectural boundaries.

Ward-Driven Development solves this by giving AI the structure it needs to stay disciplined.

---

## The Solution: Wards

A **Ward** is a bounded unit of work with:

1. A **spec** that defines scope, inputs, outputs, and constraints
2. A **test suite** written before implementation (Red phase)
3. A **human approval gate** between tests and implementation
4. An **explicit "must not" list** that constrains the AI
5. A **verification step** that proves the Ward is complete

The name "Ward" comes from hospital wards — self-contained units with clear boundaries, specialized staff, and controlled access. Code moves between Wards through defined interfaces, not hallway conversations.

---

## The Three Layers

WDD combines three methodological layers:

### Layer 1: Gold Standard TDD (GS-TDD)

The test-driven discipline within each Ward.

```
Red    → Write failing tests that define the contract
STOP   → Human reviews and approves the tests
Gold   → Implement until all tests pass
Refactor → Clean up without changing behavior
```

**Key principle:** The human owns architectural intent and acceptance criteria. The AI owns implementation within those constraints. In practice, AI will inevitably make small design choices during implementation — naming, data structure selection, local abstractions. This is expected. What WDD prevents is the AI making *architectural* decisions: system boundaries, component responsibilities, and cross-layer contracts. Those belong to the human.

**"Boring is beautiful":** GS-TDD explicitly values boring, predictable, well-tested code over clever or elegant solutions. If the implementation is boring and all tests pass, it's perfect.

### Layer 2: Ward Structure

The project decomposition that keeps AI focused.

Each Ward has:

| Element | Purpose |
|---------|---------|
| **Number** | Sequential ordering (Ward 1, Ward 2, ...) |
| **Name** | Human-readable scope identifier |
| **Spec** | Precise description of what this Ward builds |
| **Dependencies** | Which previous Wards must be complete |
| **Test count** | Expected number of tests (defined in spec) |
| **Must NOT** | Explicit list of things the AI must not do |
| **Must DO** | Explicit list of requirements |
| **Verification** | How to prove the Ward is done |

**Key principle:** A Ward's "must not" list is more important than its "must do" list. AI excels at figuring out what to build. It struggles with knowing when to stop.

### Layer 3: Multi-AI Review

The quality assurance that catches architectural drift.

```
Spec written (by Human + Primary AI)
  → Reviewed by Secondary AI (Gemini, GPT, etc.)
  → Feedback incorporated
  → Implementation by Primary AI (Claude Code)
  → Output reviewed by Human
  → Optional review by Secondary AI
```

**Key principle:** No single AI is allowed to be both architect and critic of its own work. The AI that writes the spec should not be the only one reviewing the implementation.

**When to apply:** Multi-AI review is most valuable for Integration Specs, high-risk architectural Wards, and milestone reviews. For routine Wards with well-defined scope and clear tests, human + primary AI is sufficient. The cost of multi-AI review is latency and context transfer overhead — apply it where the cost of getting architecture wrong is high, not as a universal ritual.

---

## The WDD Cycle

```
┌──────────────────────────────────────────────────────┐
│                    WARD N                              │
│                                                        │
│  1. SPEC        Human + AI write Ward spec             │
│                 Define scope, tests, must/must-not     │
│                                                        │
│  2. REVIEW      Secondary AI reviews spec              │
│                 Catches architectural issues            │
│                                                        │
│  3. RED         AI writes failing tests                 │
│                 Tests define the contract               │
│                                                        │
│  4. GATE        Human reviews and approves tests        │
│                 "These are the right tests" ✓           │
│                                                        │
│  5. GOLD        AI implements until tests pass          │
│                 Constrained by must-not list            │
│                                                        │
│  6. VERIFY      Human reviews implementation            │
│                 All tests pass + clippy/lint clean       │
│                                                        │
│  7. COMPLETE    Ward is locked. No further changes      │
│                 except bug fixes.                       │
│                                                        │
│  → Proceed to Ward N+1                                 │
└──────────────────────────────────────────────────────┘
```

---

## Ward Design Principles

### 1. Incremental Trust

Each Ward builds on proven foundations. Ward 5 (Hit Testing) trusts that Ward 3 (Spatial Index) works because Ward 3 has 12 passing tests. The AI doesn't need to re-verify or re-implement earlier Wards.

This creates a **ratchet effect**: quality only moves forward. A Ward, once complete, is a proven building block.

### 2. Ward Reopening

A completed Ward is locked by default. But reality sometimes demands reopening. Without clear criteria, teams either smuggle redesigns in as "bug fixes" or refuse to fix genuinely broken Wards.

**A Ward may be reopened only if:**

1. A later Ward reveals a violated invariant that cannot be worked around
2. The original spec is proven incomplete or wrong by new evidence
3. A dependency or interface changed through an explicit architectural decision

**Reopening process:**
- Create a new Ward (e.g., "Ward 3b: Fix Spatial Index boundary condition")
- Write a new spec explaining what changed and why
- Write new tests that cover the gap
- Go through the full Red → Approved → Gold → Complete cycle
- Update CONTEXT.md with the reopening rationale

Reopening is not failure — it's the methodology working as intended. The point is that it happens through the Ward process, not through opportunistic patching.

### 3. Bounded Blast Radius

When a Ward fails (and it will), the damage is contained. The sygeplejerske-farver incident happened because we bypassed Ward structure and gave the AI unbounded scope. With Wards, a failure in Ward 17 cannot corrupt Ward 3.

### 4. Spec Before Code, Always

The most dangerous moment in AI-assisted development is when the AI starts writing code without a spec. It will produce something that works, looks impressive, and is architecturally wrong.

**Rule:** If there's no spec, there's no Ward. If there's no Ward, there's no code.

### 5. The Must-Not List

Every Ward spec includes an explicit list of things the AI must not do. This is not optional. It is the primary constraint mechanism.

Example from vcore Ward 21:
```
## What DOES NOT exist in wasm_api.rs
- NO tick_vsheet(), tick_vtimeline(), tick_vgraph()
- NO cell_entities: Vec<Entity>
- NO hardcoded colors
- NO entity spawning inside tick or query methods
```

Without this list, the AI would have built exactly these things (and did, when unconstrained).

### 6. Human Accountability

The human is the architect. The human approves tests. The human approves implementations. If the architecture is wrong, it's the human's fault — not the AI's. The AI is an implementer following constraints.

This is not a philosophical position. It's a practical one: when something goes wrong, "the AI did it" is not a useful diagnosis. "I failed to constrain the AI" is.

---

## When to Use WDD

WDD is designed for:

- **Complex systems** with multiple interacting components
- **AI-assisted development** where one or more AIs write production code
- **Projects where architecture matters** more than speed-to-first-pixel
- **Long-lived codebases** that will be maintained and extended

WDD is overkill for:

- One-off scripts and prototypes
- Small utilities with < 500 lines of code
- Projects where a single developer understands the entire codebase
- Exploratory work where the requirements are unknown

---

## Ward Sizing

A well-sized Ward typically:

- Lands around **5-20 tests** as a guideline, not a rule
- Can be implemented in **one session** (2-8 hours of AI time)
- Touches **one layer** of the architecture (Rust OR TypeScript, not both)
- Has a **clear done condition** ("all N tests pass" or "pixels on screen")

The true measure of Ward size is **cognitive and architectural boundedness** — can you hold the entire Ward's scope in your head at once? Can the AI implement it without needing context from unrelated parts of the system?

Some Wards may have only 3 tests but carry significant architectural weight (e.g., an Integration Spec Ward). Others may have 25 tests but be mechanically straightforward. Test count is a useful heuristic, not a law.

**Splitting signals:** If a Ward needs more than 20 tests, consider splitting. If it touches both Rust and TypeScript, split. If you can't describe its scope in one sentence, split. But use judgment — don't game the numbers.

---

## The Integration Ward Pattern

The most dangerous phase of any project is integration — when isolated components must work together. This is where architecture collapses if not constrained.

WDD addresses this with **Integration Specs**: documents written between the "component Wards" and the "integration Wards" that define exactly how layers connect.

```
Ward 1-14: Core components (each isolated, tested)
     ↓
Integration Spec: "How the layers connect"
     ↓
Ward 15-20: Vertical components (each isolated, tested)
     ↓
Integration Spec: "How verticals use the core"
     ↓
Ward 21-23: Integration Wards (connecting everything)
     ↓
Ward 24: Demo Ward (proving it works end-to-end)
```

The Integration Spec is a Ward-level document that defines:
- Who owns what (Rust vs. TypeScript responsibilities)
- What calls what (API surface between layers)
- What must NOT cross boundaries (colors in Rust, entity lifecycle in WASM)

Without Integration Specs, AI will improvise the connection — and improvisation at integration time is how God Classes are born.

---

## The Backlog Ward Pattern

Known limitations discovered during implementation go into a **versioned backlog document**, not into the current Ward's scope.

```
Ward 19 discovers: "Edge culling doesn't work for long crossing edges"
  → NOT fixed in Ward 19
  → Added to BACKLOG-v1.1.md with problem/solution/impact
  → Prioritized later as its own Ward
```

This prevents scope creep within Wards and ensures nothing is forgotten.

---

## Cross-Ward Feedback Loops

A later Ward may discover that an earlier Ward was correct locally but wrong globally. This is expected and healthy — it means the system is being stressed beyond its original assumptions.

**When this happens:**

1. The discovery is documented in the current Ward's review notes
2. The fix is NOT applied opportunistically to the earlier Ward
3. Instead: a backlog item is created, or a reopening Ward is planned
4. The current Ward works around the issue if possible, or blocks on the reopening

**Example from vcore:** Ward 21 (Integration) discovered that Ward 10's `set_viewport()` had a 3-argument signature that didn't support canvas resize. Rather than silently fixing it, the new 5-argument signature was part of Ward 21's spec, with the old Ward 10 test explicitly updated.

The distinction matters: controlled change through the Ward process vs. accumulated silent patches that erode the ratchet effect.

---

## Roles in WDD

| Role | Responsibility | Example |
|------|---------------|---------|
| **Human Architect** | Writes specs, approves tests, approves implementations, designs Ward structure | Dennis |
| **Primary AI** | Writes specs (with human), writes tests, implements code, follows constraints | Claude Opus |
| **Implementation AI** | Executes Ward implementation in the codebase | Claude Code CLI |
| **Review AI(s)** | Reviews specs and implementations for architectural issues | Gemini, GPT |

The Human Architect is always the bottleneck — intentionally. The system is designed so that AI speed is constrained by human judgment, not the other way around.

---

## Evidence: vcore

vcore was built entirely using WDD over two days:

| Metric | Value |
|--------|-------|
| Total Wards | 24 |
| Rust tests | 169 |
| TypeScript tests | 87+ |
| Total tests | 256+ |
| Architecture violations | 1 (caught and reverted) |
| Verticals | 4 (vsheet, vtimeline, vgraph, vchart planned) |
| Demo tabs | 5 (Lønkørsel, Vagtplan, Skoleskema, Organisation) |
| FPS | 120 sustained, 57 worst case |
| Entities rendered | 2,587 (school schedule demo) |
| Lines of Rust | ~3,000 |
| Lines of TypeScript | ~3,000 |
| AI models used | Claude Opus (spec/review), Claude Code (implementation), Gemini (review), GPT (review) |

The one architecture violation (hardcoded nurse shift colors in the Rust kernel) occurred when Ward structure was bypassed and the AI was told to "just build a demo." It was caught, reverted, documented, and became the motivation for the Integration Spec pattern.

---

## Quick Start

To use WDD on your next project:

1. **Define the architecture** in a top-level spec document
2. **Decompose into Wards** of 5-20 tests each, one layer per Ward
3. **Write Ward 1 spec** with scope, tests, must/must-not
4. **Have a secondary AI review** the spec
5. **Give the spec to your implementation AI** — Red phase first
6. **Review and approve** the failing tests
7. **Let the AI implement** — Gold phase
8. **Verify** — all tests pass, lint clean, human review
9. **Lock the Ward** and proceed to Ward 2
10. **Write Integration Specs** before connecting layers
11. **Maintain a backlog document** for discovered limitations

Repeat until your system is complete.

---

## Summary

Ward-Driven Development is a control system for AI-assisted software construction in which architecture is held by humans, implementation is delegated to AI, and progress is constrained through bounded work units, pre-approved tests, explicit anti-scope rules, and staged verification.

It combines test-driven development (GS-TDD), bounded work units (Wards), multi-AI review, and human approval gates to produce systems that are architecturally sound, well-tested, and maintainable.

The core insight: **AI can propose architecture, but it does not reliably own architectural consequences over time.** WDD gives AI the structure to be extraordinary at implementation while keeping architectural ownership in human hands.

Stable software isn't built with vibes. It's built with Wards.

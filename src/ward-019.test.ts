import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import {
  buildDependencyGraph,
  findReadyWards,
  findPlannedWards,
  detectCycles,
  findOrphanedDependencies,
  renderGraph,
  renderReadyList,
  type WardGraph,
  type Cycle,
} from "./commands/graph.js";
import {
  parseBacklog,
  findStaleBacklogItems,
  type BacklogItem,
} from "./utils/backlog.js";
import {
  assembleSession,
  assembleSessionWith,
  SESSION_SECTIONS,
  SECTION_HANDLERS,
} from "./commands/session.js";
import { validateProject } from "./commands/validate.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

interface WardFixture {
  ward: number;
  revision?: string;
  name: string;
  status: "planned" | "red" | "approved" | "gold" | "complete" | "blocked";
  dependencies?: (number | string)[];
  body?: string;
  epic?: string;
}

function writeWard(dir: string, w: WardFixture): void {
  const num = String(w.ward).padStart(3, "0");
  const filename = w.revision ? `ward-${num}${w.revision}.md` : `ward-${num}.md`;

  const depList = (w.dependencies ?? [])
    .map((d) => (typeof d === "string" ? `"${d}"` : String(d)))
    .join(", ");

  const content = `---
ward: ${w.ward}
revision: ${w.revision ? `"${w.revision}"` : "null"}
name: "${w.name}"
epic: "${w.epic ?? "test"}"
status: "${w.status}"
dependencies: [${depList}]
layer: "typescript"
estimated_tests: 0
created: "2026-05-16"
completed: ${w.status === "complete" ? `"2026-05-16"` : "null"}
---
# Ward ${num}${w.revision ?? ""}: ${w.name}

${w.body ?? "## Scope\nTest fixture"}
`;

  fs.writeFileSync(path.join(dir, ".wdd", "wards", filename), content);
}

function setBacklog(dir: string, content: string): void {
  fs.writeFileSync(path.join(dir, ".wdd", "BACKLOG.md"), content);
}

describe("Ward 019: DAG construction & queries", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "graph-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1
  it("builds_graph_from_wards", () => {
    writeWard(tmpDir, { ward: 1, name: "Root", status: "complete" });
    writeWard(tmpDir, { ward: 2, name: "Child", status: "complete", dependencies: [1] });

    const graph = buildDependencyGraph(tmpDir);
    const root = graph.get("1");
    const child = graph.get("2");

    assert.ok(root, "Root node should exist");
    assert.equal(root!.id, "1");
    assert.equal(root!.name, "Root");
    assert.equal(root!.status, "complete");
    assert.deepEqual(root!.dependencies, []);
    assert.deepEqual(root!.dependents, ["2"]);

    assert.ok(child, "Child node should exist");
    assert.equal(child!.id, "2");
    assert.deepEqual(child!.dependencies, ["1"]);
    assert.deepEqual(child!.dependents, []);
  });

  // Test 2
  it("finds_ready_wards", () => {
    writeWard(tmpDir, { ward: 1, name: "Done", status: "complete" });
    writeWard(tmpDir, { ward: 2, name: "Ready", status: "planned", dependencies: [1] });
    writeWard(tmpDir, { ward: 3, name: "Blocked", status: "planned", dependencies: [2] });

    const graph = buildDependencyGraph(tmpDir);
    const ready = findReadyWards(graph);
    const readyIds = ready.map((w) => w.id);

    assert.ok(readyIds.includes("2"), "Ward 2 should be ready (dep 1 complete)");
    assert.ok(!readyIds.includes("3"), "Ward 3 should NOT be ready (dep 2 planned)");
    assert.ok(!readyIds.includes("1"), "Ward 1 should NOT be in ready (already complete)");
  });

  // Test 3
  it("excludes_completed_from_ready", () => {
    writeWard(tmpDir, { ward: 1, name: "All done", status: "complete" });

    const graph = buildDependencyGraph(tmpDir);
    const ready = findReadyWards(graph);

    assert.equal(ready.length, 0, "Complete wards must not appear in ready queue");
  });

  // Test 4
  it("detects_cycles_returns_cycle_struct", () => {
    writeWard(tmpDir, { ward: 1, name: "A", status: "planned", dependencies: [2] });
    writeWard(tmpDir, { ward: 2, name: "B", status: "planned", dependencies: [1] });

    const graph = buildDependencyGraph(tmpDir);
    const cycles = detectCycles(graph);

    assert.ok(Array.isArray(cycles), "detectCycles must return an array");
    assert.equal(cycles.length, 1, "Should detect exactly one cycle");

    const cycle: Cycle = cycles[0];
    assert.ok(Array.isArray(cycle.wards), "Cycle must have a `wards` array");
    assert.equal(typeof cycle.wards, "object", "Cycle.wards is array, not string");

    // Both 1 and 2 should be in the cycle
    assert.ok(cycle.wards.includes("1"), "Cycle should include ward 1");
    assert.ok(cycle.wards.includes("2"), "Cycle should include ward 2");

    // Closing edge implicit: cycle does NOT repeat the head
    assert.notEqual(
      cycle.wards[0],
      cycle.wards[cycle.wards.length - 1],
      "Cycle.wards must not repeat head as last element (closing edge is implicit)"
    );
  });

  // Test 5
  it("detects_orphaned_dependencies", () => {
    writeWard(tmpDir, { ward: 1, name: "Has orphan", status: "planned", dependencies: [99] });

    const graph = buildDependencyGraph(tmpDir);
    const orphans = findOrphanedDependencies(graph);

    assert.equal(orphans.length, 1, "Should find one orphaned dep");
    assert.equal(orphans[0].ward, "1");
    assert.deepEqual(orphans[0].missing, ["99"]);
  });
});

describe("Ward 019: revision ward semantics", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "rev-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 6a
  it("revision_ward_distinct_node", () => {
    writeWard(tmpDir, { ward: 5, name: "Original", status: "complete" });
    writeWard(tmpDir, { ward: 5, revision: "b", name: "Fix", status: "planned", dependencies: [5] });

    const graph = buildDependencyGraph(tmpDir);

    assert.ok(graph.get("5"), "Node `5` exists");
    assert.ok(graph.get("5b"), "Node `5b` exists as DISTINCT node");
    assert.notEqual(graph.get("5"), graph.get("5b"), "Nodes are not the same reference");
    assert.equal(graph.get("5")!.status, "complete");
    assert.equal(graph.get("5b")!.status, "planned");
  });

  // Test 6b — edge structure asserted, not just normalization
  it("revision_ward_mixed_dep_types", () => {
    writeWard(tmpDir, { ward: 5, name: "Original", status: "complete" });
    writeWard(tmpDir, { ward: 5, revision: "b", name: "Fix", status: "complete" });
    writeWard(tmpDir, {
      ward: 7,
      name: "Mixed deps",
      status: "planned",
      dependencies: [5, "5b"],
    });

    const graph = buildDependencyGraph(tmpDir);
    const mixed = graph.get("7");

    assert.ok(mixed, "Ward 7 node exists");
    assert.deepEqual(
      mixed!.dependencies,
      ["5", "5b"],
      "Normalized deps must be canonical strings preserving order"
    );

    // Edge structure: both 5 and 5b have 7 as a dependent
    assert.ok(
      graph.get("5")!.dependents.includes("7"),
      "Node `5` must list `7` as dependent (edge structure)"
    );
    assert.ok(
      graph.get("5b")!.dependents.includes("7"),
      "Node `5b` must list `7` as dependent (edge structure)"
    );
  });

  // Test 6c
  it("revision_completion_does_not_satisfy_base", () => {
    writeWard(tmpDir, { ward: 5, name: "Original", status: "planned" });
    writeWard(tmpDir, { ward: 5, revision: "b", name: "Fix", status: "complete" });
    writeWard(tmpDir, {
      ward: 7,
      name: "Depends on 5",
      status: "planned",
      dependencies: [5],
    });

    const graph = buildDependencyGraph(tmpDir);
    const ready = findReadyWards(graph);
    const readyIds = ready.map((w) => w.id);

    assert.ok(
      !readyIds.includes("7"),
      "Ward 7 must NOT be ready: dep on `5` is unsatisfied even though `5b` is complete"
    );
    assert.ok(
      readyIds.includes("5"),
      "Ward 5 itself should be ready (no deps, status planned)"
    );
  });
});

describe("Ward 019: rendering & CLI output", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "render-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 7 — multi-parent rendering with canonical-sort first-parent rule
  it("wdd_graph_cli_first_parent_only", () => {
    writeWard(tmpDir, { ward: 5, name: "Earlier", status: "complete" });
    writeWard(tmpDir, { ward: 10, name: "Later", status: "complete" });
    // Frontmatter order [10, 5] but canonical sort places `5` first
    writeWard(tmpDir, {
      ward: 20,
      name: "Multi-parent",
      status: "planned",
      dependencies: [10, 5],
    });

    const graph = buildDependencyGraph(tmpDir);
    const output = renderGraph(graph);

    // Ward 20 must appear under ward 5 (canonically first), not under ward 10
    const lines = output.split("\n");
    const ward5Index = lines.findIndex((l) => l.includes("005") && l.includes("Earlier"));
    const ward20Index = lines.findIndex((l) => l.includes("020") && l.includes("Multi-parent"));
    const ward10Index = lines.findIndex((l) => l.includes("010") && l.includes("Later"));

    assert.ok(ward5Index >= 0 && ward20Index >= 0 && ward10Index >= 0, "All three wards rendered");
    assert.ok(
      ward20Index > ward5Index && ward20Index < ward10Index ||
        ward20Index > ward5Index && ward20Index > ward10Index,
      "Ward 20 must appear under ward 5 (first parent after canonical sort)"
    );

    // Annotation: ward 20 line should show "(also depends on 010)"
    const ward20Line = lines.find((l) => l.includes("020") && l.includes("Multi-parent"));
    assert.ok(
      ward20Line && /also depends on 0?10/.test(ward20Line),
      `Ward 20 line should annotate other parent. Got: ${ward20Line}`
    );

    // Ward 20 must appear exactly ONCE (not under both parents)
    const occurrencesUnder10 = lines.filter(
      (l) => l.includes("Multi-parent") && (l.startsWith(" ├") || l.startsWith(" │") || l.startsWith(" └"))
    ).length;
    assert.equal(occurrencesUnder10, 1, "Ward 20 must appear exactly once in the tree");
  });

  // Test 8
  it("wdd_ready_cli", () => {
    writeWard(tmpDir, { ward: 1, name: "Done", status: "complete" });
    writeWard(tmpDir, { ward: 2, name: "Ready Ward", status: "planned", dependencies: [1] });
    writeWard(tmpDir, { ward: 3, name: "Blocked Ward", status: "planned", dependencies: [2] });

    const graph = buildDependencyGraph(tmpDir);
    const output = renderReadyList(graph);

    assert.ok(output.includes("Ready now (1)"), `Should announce 1 ready ward. Got: ${output}`);
    assert.ok(output.includes("Ready Ward"), "Should name the ready ward");
    assert.ok(output.includes("Blocked (1)"), "Should announce 1 blocked ward");
    assert.ok(output.includes("Blocked Ward"), "Should name the blocked ward");
    assert.ok(/waits for:\s*0?02/.test(output), "Should show what blocked ward waits for");
    assert.ok(output.includes("Complete: 1"), "Should show complete count");
  });
});

describe("Ward 019: backlog parsing", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "backlog-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 9 — strict negative cases
  it("parses_backlog_open_items_strict", () => {
    setBacklog(
      tmpDir,
      `# Backlog
## v0.1.0

### Priority 1 — Must Have
- [ ] **BUG-001**: open bug
- [ ] **CLI-013**: open feature
- [x] **CLI-002**: completed item (must ignore)
- [ ] **bug-099**: lowercase prefix (must ignore)
- [ ] **CLI_013**: underscore separator (must ignore)
- [ ] **CLI-013ab**: multi-letter suffix (must ignore)
  - [ ] **NESTED-001**: nested bullet (must ignore)

### Priority 2 — Should Have
- [ ] **PERF-005**: open perf item
`
    );

    const fixedDate = new Date("2026-01-01T00:00:00Z");
    const items = parseBacklog(tmpDir, {
      openedAtResolver: () => fixedDate,
    });

    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("BUG-001"), "Should include BUG-001");
    assert.ok(ids.includes("CLI-013"), "Should include CLI-013");
    assert.ok(ids.includes("PERF-005"), "Should include PERF-005 under P2");

    // Negative cases
    assert.ok(!ids.includes("CLI-002"), "[x] item must be excluded");
    assert.ok(!ids.includes("bug-099"), "lowercase prefix must be rejected");
    assert.ok(!ids.includes("CLI_013"), "underscore separator must be rejected");
    assert.ok(!ids.includes("CLI-013ab"), "multi-letter suffix must be rejected");
    assert.ok(!ids.includes("NESTED-001"), "nested bullet must be rejected");

    // Priority mapping
    const bug = items.find((i) => i.id === "BUG-001");
    const perf = items.find((i) => i.id === "PERF-005");
    assert.equal(bug?.priority, "P1");
    assert.equal(perf?.priority, "P2");
  });
});

describe("Ward 019: stale-item lookaround", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "stale-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 10 — lookaround edge cases
  it("finds_stale_with_lookaround", () => {
    const oldDate = new Date("2026-01-01T00:00:00Z"); // ~5 months before "now"
    const now = new Date("2026-05-16T00:00:00Z");

    const items: BacklogItem[] = [
      { id: "CLI-013", title: "windsurf adapter", priority: "P2", openedAt: oldDate },
      { id: "CLI-01", title: "very old", priority: "P1", openedAt: oldDate },
    ];

    // Planned ward bodies — only the strings that the caller pre-filtered
    const bodies = [
      // Reference CLI-013 inside CLI-011 (should NOT count — different ID)
      "This planned ward mentions CLI-011 and CLI-0131 but not the real one.",
      // Underscore-adjacent should NOT match
      "Has foo_CLI-013 mentioned but with underscore prefix.",
      // Hyphen-adjacent should NOT match
      "References CLI-013-bis here.",
      // Lowercase should NOT match (case-sensitive)
      "Lowercase mention of cli-013 here.",
    ];

    const stale = findStaleBacklogItems(items, bodies, now);
    const staleIds = stale.map((i) => i.id);

    // CLI-013 should be stale (no isolated uppercase mention in any body)
    assert.ok(staleIds.includes("CLI-013"), `CLI-013 should be stale — no real reference. Got: ${staleIds}`);

    // CLI-01 should be stale too (only CLI-011 appears, which doesn't match)
    assert.ok(staleIds.includes("CLI-01"), "CLI-01 should be stale (CLI-011 doesn't satisfy)");

    // Now add a real reference and verify CLI-013 is NOT stale
    const bodiesWithRef = [...bodies, "Planned ward addressing CLI-013 properly."];
    const staleAfter = findStaleBacklogItems(items, bodiesWithRef, now);
    assert.ok(
      !staleAfter.map((i) => i.id).includes("CLI-013"),
      "CLI-013 must not be stale when a body has isolated reference"
    );

    // Verify accepts surrounded-by-punctuation cases
    const punctBodies = ["Note: (CLI-013) is being worked on."];
    const punctStale = findStaleBacklogItems(items, punctBodies, now);
    assert.ok(
      !punctStale.map((i) => i.id).includes("CLI-013"),
      "(CLI-013) parens should count as valid isolated reference"
    );
  });
});

describe("Ward 019: session integration", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "session-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 11 — loud empty state
  it("session_planned_section_loud_empty", () => {
    // No planned wards (init only created the project — wards dir is empty)
    const output = assembleSession(tmpDir);

    // Find PLANNED section
    const plannedIdx = output.indexOf("═══ PLANNED ═══");
    assert.ok(plannedIdx >= 0, "PLANNED section header must be present");

    const plannedSection = output.slice(plannedIdx);

    // Three concrete checks per spec
    assert.match(
      plannedSection,
      /^═══ PLANNED ═══/m,
      "(a) Header line begins as expected"
    );
    assert.match(
      plannedSection,
      /^⚠/m,
      "(b) Warning line begins with ⚠ sentinel"
    );
    assert.ok(
      plannedSection.includes("BACKLOG.md"),
      "(c) Warning text contains 'BACKLOG.md'"
    );
    assert.ok(
      plannedSection.includes("wdd ward create"),
      "(d) Warning text contains 'wdd ward create'"
    );
  });

  // Test 12 — populated PLANNED section
  it("session_planned_section_with_wards", () => {
    writeWard(tmpDir, { ward: 1, name: "Ready One", status: "planned" });
    writeWard(tmpDir, { ward: 2, name: "Blocked Two", status: "planned", dependencies: [1] });

    const output = assembleSession(tmpDir);
    const plannedIdx = output.indexOf("═══ PLANNED ═══");
    const exportsIdx = output.indexOf("═══ EXPORTS ═══");

    assert.ok(plannedIdx >= 0, "PLANNED section present");
    assert.ok(exportsIdx >= 0, "EXPORTS section present");
    assert.ok(plannedIdx < exportsIdx, "PLANNED must appear before EXPORTS (section ordering)");

    const plannedSection = output.slice(plannedIdx, exportsIdx);
    assert.ok(plannedSection.includes("Ready One"), "Lists ready ward name");
    assert.match(plannedSection, /Blocked.*1/, "Mentions blocked count of 1");
  });

  // Test 14 — SESSION_SECTIONS contract enforcement
  it("session_sections_constant_enforced", () => {
    assert.throws(
      () =>
        assembleSessionWith(tmpDir, ["PROJECT", "NONEXISTENT_SECTION"], SECTION_HANDLERS),
      (err: Error) => {
        assert.match(
          err.message,
          /no handler for section/i,
          `Error should mention "no handler for section". Got: ${err.message}`
        );
        return true;
      }
    );
  });
});

describe("Ward 019: validate integration", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "validate-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 13 — validate emits stale + orphan warnings, exit code stays 0
  it("validate_surfaces_orphans_and_stale", () => {
    writeWard(tmpDir, { ward: 1, name: "Orphan-deps", status: "planned", dependencies: [99] });
    setBacklog(
      tmpDir,
      `### Priority 1 — Must Have
- [ ] **STALE-001**: very old item, no ward references it
`
    );

    // Inject clock to make STALE-001 stale
    const fakeNow = new Date("2026-12-31T00:00:00Z");
    const fakeClock = () => fakeNow;

    const result = validateProject(tmpDir, { clock: fakeClock });

    // Result is still valid (warnings, not errors)
    assert.equal(result.valid, true, "Stale + orphans are warnings, not errors");

    // Both warnings present
    const allWarnings = result.warnings.join("\n");
    assert.match(
      allWarnings,
      /STALE-001/,
      `Should warn about stale backlog item. Got: ${result.warnings}`
    );
    assert.match(
      allWarnings,
      /99/,
      `Should warn about orphaned dep on ward 99. Got: ${result.warnings}`
    );
  });
});


import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { completeWard } from "./commands/ward-complete.js";
import {
  assembleSession,
  assembleSessionWith,
  SESSION_SECTIONS,
  SECTION_HANDLERS,
} from "./commands/session.js";
import { validateProject } from "./commands/validate.js";
import { getSharedContent } from "./templates/adapter-content.js";
import type { Status } from "./utils/status.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-context-001-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function section(output: string, header: string, nextHeader?: string): string {
  const start = output.indexOf(header);
  assert.ok(start >= 0, `Missing section ${header}\n${output}`);
  const from = start + header.length;
  if (!nextHeader) return output.slice(from);
  const end = output.indexOf(nextHeader, from);
  return output.slice(from, end === -1 ? output.length : end);
}

function writeScopedWard(
  dir: string,
  input: Readonly<{
    epic: string;
    ward: number;
    name: string;
    status: Status;
    dependencies?: readonly (number | string)[];
  }>
): void {
  const epicDir = path.join(dir, ".wdd", "wards", input.epic);
  fs.mkdirSync(epicDir, { recursive: true });
  const padded = String(input.ward).padStart(3, "0");
  const deps = (input.dependencies ?? [])
    .map((d) => (typeof d === "string" ? `"${d}"` : String(d)))
    .join(", ");
  fs.writeFileSync(
    path.join(epicDir, `ward-${padded}.md`),
    `---
ward: ${input.ward}
revision: null
name: "${input.name}"
epic: "${input.epic}"
status: "${input.status}"
dependencies: [${deps}]
layer: "typescript"
estimated_tests: 0
created: "2026-08-17"
completed: ${input.status === "complete" ? `"2026-08-17"` : "null"}
---
# Ward ${input.epic}-${padded}: ${input.name}

## Scope
Fixture for working memory.
`
  );
}

function writeLegacyWard(
  dir: string,
  input: Readonly<{
    ward: number;
    name: string;
    epic: string;
    status: Status;
  }>
): void {
  const padded = String(input.ward).padStart(3, "0");
  fs.writeFileSync(
    path.join(dir, ".wdd", "wards", `ward-${padded}.md`),
    `---
ward: ${input.ward}
revision: null
name: "${input.name}"
epic: "${input.epic}"
status: "${input.status}"
dependencies: []
layer: "typescript"
estimated_tests: 0
created: "2026-08-17"
completed: null
---
# Ward ${padded}: ${input.name}
`
  );
}

function writeContext(dir: string, markdown: string): void {
  fs.writeFileSync(path.join(dir, ".wdd", "CONTEXT.md"), markdown);
}

describe("Ward context-001: Derived working memory", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "memory-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("session_emits_working_memory", () => {
    /**
     * Given: a freshly initialized project
     * When: assembleSession is called
     * Then: output contains a WORKING MEMORY section
     * And: that section sits after CONTEXT and before PROGRESS
     */
    const output = assembleSession(tmpDir);
    assert.ok(
      output.includes("═══ WORKING MEMORY ═══"),
      `Should emit WORKING MEMORY.\n${output}`
    );
    const contextIdx = output.indexOf("═══ CONTEXT ═══");
    const memoryIdx = output.indexOf("═══ WORKING MEMORY ═══");
    const progressIdx = output.indexOf("═══ PROGRESS ═══");
    assert.ok(contextIdx >= 0 && memoryIdx >= 0 && progressIdx >= 0);
    assert.ok(contextIdx < memoryIdx, "WORKING MEMORY must follow CONTEXT");
    assert.ok(memoryIdx < progressIdx, "WORKING MEMORY must precede PROGRESS");
  });

  it("working_memory_lists_incomplete_only", () => {
    /**
     * Given: complete, planned, red, approved, gold, blocked, and a planned
     *        Ward whose dependency is missing
     * When: session working memory is rendered
     * Then: every non-complete status appears, including approved
     * And: the completed Ward name does not appear in WORKING MEMORY
     *      (PROGRESS may still list it — that must not count)
     * And: status-blocked plus dep-blocked Wards appear under Blocked:
     */
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 1,
      name: "Finished Kernel",
      status: "complete",
    });
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 2,
      name: "Planned Gate",
      status: "planned",
    });
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 3,
      name: "Red Tests",
      status: "red",
    });
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 4,
      name: "Gold Impl",
      status: "gold",
    });
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 5,
      name: "Paused Slice",
      status: "blocked",
    });
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 6,
      name: "Approved Slice",
      status: "approved",
    });
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 7,
      name: "Waiting On Missing Dep",
      status: "planned",
      dependencies: [999],
    });

    const memory = section(
      assembleSession(tmpDir),
      "═══ WORKING MEMORY ═══",
      "═══ PROGRESS ═══"
    );

    assert.ok(memory.includes("Planned Gate"), "planned must be in flight");
    assert.ok(memory.includes("Red Tests"), "red must be in flight");
    assert.ok(memory.includes("Gold Impl"), "gold must be in flight");
    assert.ok(memory.includes("Approved Slice"), "approved must be in flight");
    assert.ok(memory.includes("Paused Slice"), "blocked must be in flight");
    assert.ok(
      memory.includes("Waiting On Missing Dep"),
      "planned Ward with unresolvable dep must be in flight"
    );
    assert.ok(
      !memory.includes("Finished Kernel"),
      `complete must not appear in WORKING MEMORY.\n${memory}`
    );
    assert.ok(memory.includes("Filter: all epics"), "unfiltered session names the filter");

    assert.ok(memory.includes("Blocked:"), `Missing Blocked subsection.\n${memory}`);
    const blockedStart = memory.indexOf("Blocked:");
    const filterStart = memory.indexOf("Filter:", blockedStart);
    const blocked = memory.slice(
      blockedStart,
      filterStart === -1 ? memory.length : filterStart
    );
    assert.ok(blocked.includes("Paused Slice"), "status blocked belongs under Blocked:");
    assert.ok(
      blocked.includes("Waiting On Missing Dep"),
      "planned Ward with incomplete deps belongs under Blocked:"
    );
    assert.ok(
      !blocked.includes("Planned Gate"),
      `Ready planned Ward leaked into Blocked.\n${blocked}`
    );
  });

  it("working_memory_filters_by_epic", () => {
    /**
     * Given: in-flight Wards in two scoped epics plus a legacy-layout Ward
     *        whose frontmatter epic is context
     * When: assembleSession is called with epic: "context"
     * Then: only context Wards appear in WORKING MEMORY
     * And: the other epic's Ward is absent from that section
     */
    writeScopedWard(tmpDir, {
      epic: "orchestration",
      ward: 20,
      name: "Planning Metadata Frontmatter",
      status: "planned",
    });
    writeScopedWard(tmpDir, {
      epic: "context",
      ward: 1,
      name: "Derived working memory",
      status: "red",
    });
    writeLegacyWard(tmpDir, {
      ward: 9,
      name: "Legacy Context Slice",
      epic: "context",
      status: "planned",
    });

    const memory = section(
      assembleSession(tmpDir, { epic: "context" }),
      "═══ WORKING MEMORY ═══",
      "═══ PROGRESS ═══"
    );

    assert.ok(memory.includes("Derived working memory"));
    assert.ok(
      memory.includes("Legacy Context Slice"),
      "legacy files must match on frontmatter epic, not only path"
    );
    assert.ok(
      !memory.includes("Planning Metadata Frontmatter"),
      `orchestration Ward leaked into filtered memory.\n${memory}`
    );
    assert.ok(memory.includes("Filter: epic context"));
  });

  it("working_memory_unknown_epic_empty", () => {
    /**
     * Given: an in-flight Ward in epic core
     * When: session is filtered to an epic that has no Wards
     * Then: it does not throw
     * And: WORKING MEMORY reports no in-flight Wards for that filter
     */
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 1,
      name: "Only Core",
      status: "planned",
    });

    let output = "";
    assert.doesNotThrow(() => {
      output = assembleSession(tmpDir, { epic: "nope" });
    });

    const memory = section(output, "═══ WORKING MEMORY ═══", "═══ PROGRESS ═══");
    assert.ok(
      memory.includes("In flight: (none)"),
      `Unknown epic should list no in-flight Wards.\n${memory}`
    );
    assert.ok(
      memory.includes("Filter: epic nope (no matching Wards)"),
      `Should name the empty filter.\n${memory}`
    );
    assert.ok(
      !memory.includes("Only Core"),
      `Core Ward must not appear under epic nope.\n${memory}`
    );
  });

  it("session_context_is_constraints_only", () => {
    /**
     * Given: CONTEXT.md that is a logbook plus a unique constraints bullet
     * When: session is assembled
     * Then: the CONTEXT section includes the constraints bullet
     * And: it omits Architecture Decisions and Release History sentinels
     */
    writeContext(
      tmpDir,
      `# Context — memory-project

## Current State
Ward 26 complete — ignore me in session.

## Architecture Decisions Made
| Decision | Rationale | Ward |
|----------|-----------|------|
| DECISION_SENTINEL | should not reach session | 1 |

## Active Constraints
- CONSTRAINT_SENTINEL must remain true

## Release History
- RELEASE_SENTINEL shipped yesterday
`
    );

    const output = assembleSession(tmpDir);
    const context = section(output, "═══ CONTEXT ═══", "═══ WORKING MEMORY ═══");

    assert.ok(context.includes("CONSTRAINT_SENTINEL"));
    assert.ok(
      !context.includes("DECISION_SENTINEL"),
      `Architecture Decisions leaked into CONTEXT section.\n${context}`
    );
    assert.ok(
      !context.includes("RELEASE_SENTINEL"),
      `Release History leaked into CONTEXT section.\n${context}`
    );
    assert.ok(
      !context.includes("Ward 26 complete"),
      `Current State narrative leaked into CONTEXT section.\n${context}`
    );
  });

  it("session_context_warns_when_active_constraints_missing", () => {
    /**
     * Given: CONTEXT.md with a title but no Active Constraints heading
     * When: session is assembled
     * Then: the CONTEXT section warns instead of dumping the rest of the file
     */
    writeContext(
      tmpDir,
      `# Context — memory-project

## Known Blockers
- none
`
    );

    const context = section(
      assembleSession(tmpDir),
      "═══ CONTEXT ═══",
      "═══ WORKING MEMORY ═══"
    );
    assert.ok(
      context.includes(
        "⚠ CONTEXT.md has no Active Constraints section — add invariants there, not a log."
      ),
      `Missing-constraints branch should emit the spec warning.\n${context}`
    );
  });

  it("session_sections_includes_working_memory", () => {
    /**
     * Given: the SESSION_SECTIONS contract from Ward 19
     * When: the section list and handlers are inspected
     * Then: WORKING_MEMORY is registered with a handler
     * And: assembleSessionWith still throws for an unknown section
     */
    assert.ok(
      (SESSION_SECTIONS as readonly string[]).includes("WORKING_MEMORY"),
      `SESSION_SECTIONS missing WORKING_MEMORY: ${SESSION_SECTIONS.join(", ")}`
    );
    assert.equal(
      typeof SECTION_HANDLERS.WORKING_MEMORY,
      "function",
      "WORKING_MEMORY must have a handler"
    );

    const memoryIdx = SESSION_SECTIONS.indexOf("WORKING_MEMORY");
    const contextIdx = SESSION_SECTIONS.indexOf("CONTEXT");
    const progressIdx = SESSION_SECTIONS.indexOf("PROGRESS");
    assert.ok(contextIdx >= 0 && memoryIdx === contextIdx + 1);
    assert.ok(progressIdx === memoryIdx + 1);

    assert.throws(
      () =>
        assembleSessionWith(tmpDir, ["PROJECT", "NONEXISTENT_SECTION"], SECTION_HANDLERS),
      (err: Error) => {
        assert.match(err.message, /no handler for section/i);
        return true;
      }
    );
  });

  it("current_ward_honours_epic_filter", () => {
    /**
     * Given: an in-flight Ward in epic "aaa" (sorts before context) and one in context
     * When: session is filtered to epic context
     * Then: CURRENT WARD is the context Ward, not aaa
     */
    writeScopedWard(tmpDir, {
      epic: "aaa",
      ward: 1,
      name: "Alphabetically First",
      status: "planned",
    });
    writeScopedWard(tmpDir, {
      epic: "context",
      ward: 1,
      name: "Derived working memory",
      status: "red",
    });

    const unfiltered = assembleSession(tmpDir);
    assert.ok(
      unfiltered.includes("Alphabetically First"),
      "Unfiltered session should still see the aaa Ward"
    );

    const filtered = assembleSession(tmpDir, { epic: "context" });
    const currentIdx = filtered.indexOf("═══ CURRENT WARD:");
    assert.ok(currentIdx >= 0, `Missing CURRENT WARD.\n${filtered}`);
    const current = filtered.slice(currentIdx);
    assert.ok(
      current.startsWith("═══ CURRENT WARD: context-001"),
      `CURRENT WARD should be context-001.\n${filtered}`
    );
    assert.ok(
      current.includes("Derived working memory"),
      "Filtered current Ward should include the context Ward body"
    );
    assert.ok(
      !current.includes("Alphabetically First"),
      `aaa Ward must not be the current Ward under --epic context.\n${filtered}`
    );
  });

  it("validate_rejects_logbook_headings", () => {
    /**
     * Given: CONTEXT.md with logbook headings
     * When: validateProject runs
     * Then: each heading is an error, not a warning
     * And: a fenced example of a forbidden heading does not count
     */
    writeContext(
      tmpDir,
      `# Context — memory-project

## Active Constraints
- real constraint

## Architecture Decisions Made
| Decision | Rationale | Ward |
|----------|-----------|------|
| ECS | speed | 1 |

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|
| Tests | 12 | 1 |

## Release History
- 2026-08-17 shipped
`
    );

    const result = validateProject(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("Architecture Decisions Made")),
      `Missing Architecture Decisions error: ${result.errors.join(" | ")}`
    );
    assert.ok(
      result.errors.some((e) => e.includes("Key Metrics")),
      `Missing Key Metrics error: ${result.errors.join(" | ")}`
    );
    assert.ok(
      result.errors.some((e) => e.includes("Release History")),
      `Missing Release History error: ${result.errors.join(" | ")}`
    );
    assert.ok(
      !result.warnings.some((w) => w.includes("Architecture Decisions Made")),
      "Logbook headings must be errors, not warnings"
    );

    writeContext(
      tmpDir,
      `# Context — memory-project

## Active Constraints
- keep going

\`\`\`markdown
## Architecture Decisions Made
do not trip validate
\`\`\`
`
    );
    const fenced = validateProject(tmpDir);
    assert.equal(
      fenced.valid,
      true,
      `Fenced logbook heading must not fail validate: ${fenced.errors.join(" | ")}`
    );
  });

  it("validate_rejects_completion_narrative", () => {
    /**
     * Given: Current State that records a completed Ward
     * When: validateProject runs
     * Then: both numeric and scoped completion lines are errors
     */
    writeContext(
      tmpDir,
      `# Context — memory-project

## Active Constraints
- ok

## Current State
Ward 26 complete — Copilot adapter shipped
`
    );
    const numeric = validateProject(tmpDir);
    assert.equal(numeric.valid, false);
    assert.ok(
      numeric.errors.some((e) => /Current State/i.test(e) && /complete/i.test(e)),
      `Numeric completion narrative not flagged: ${numeric.errors.join(" | ")}`
    );

    writeContext(
      tmpDir,
      `# Context — memory-project

## Active Constraints
- ok

## Current State
Ward \`context-001\` complete — 2026-08-17
`
    );
    const scoped = validateProject(tmpDir);
    assert.equal(scoped.valid, false);
    assert.ok(
      scoped.errors.some((e) => /Current State/i.test(e) && /complete/i.test(e)),
      `Scoped completion narrative not flagged: ${scoped.errors.join(" | ")}`
    );

    writeContext(
      tmpDir,
      `# Context — memory-project

## Active Constraints
- ok

## Current State
Planning phase — no Wards complete yet.
`
    );
    const noNarrative = validateProject(tmpDir);
    assert.equal(
      noNarrative.valid,
      true,
      `Current State without a completion narrative must not error: ${noNarrative.errors.join(" | ")}`
    );
  });

  it("validate_requires_active_constraints", () => {
    /**
     * Given: CONTEXT.md without Active Constraints
     * When: validateProject runs
     * Then: it errors
     * And: a constraints-only file passes even with Known Blockers
     */
    writeContext(
      tmpDir,
      `# Context — memory-project

## Known Blockers
- none
`
    );
    const missing = validateProject(tmpDir);
    assert.equal(missing.valid, false);
    assert.ok(
      missing.errors.some((e) => e.includes("Active Constraints")),
      `Missing Active Constraints not flagged: ${missing.errors.join(" | ")}`
    );

    writeContext(
      tmpDir,
      `# Context — memory-project

## Active Constraints
- Zero runtime dependencies beyond Node built-ins

## Known Blockers
- CLI-018
`
    );
    const ok = validateProject(tmpDir);
    assert.equal(ok.valid, true, `Constraints-only file failed: ${ok.errors.join(" | ")}`);
  });

  it("init_template_is_not_an_encyclopedia", async () => {
    /**
     * Given: a new directory
     * When: initProject runs
     * Then: CONTEXT.md has Active Constraints
     * And: it does not scaffold Architecture Decisions Made, Key Metrics,
     *      Current State, or What Comes Next
     */
    const fresh = setup();
    try {
      await initProject(fresh, { name: "scratch" });
      const contextMd = fs.readFileSync(
        path.join(fresh, ".wdd", "CONTEXT.md"),
        "utf-8"
      );
      assert.ok(contextMd.includes("# Context"));
      assert.ok(contextMd.includes("## Active Constraints"));
      assert.ok(
        contextMd.includes("## Known Blockers"),
        "init must scaffold Known Blockers"
      );
      assert.ok(
        !contextMd.includes("## Architecture Decisions Made"),
        "init must not scaffold an Architecture Decisions table"
      );
      assert.ok(!contextMd.includes("## Key Metrics"));
      assert.ok(!contextMd.includes("## Release History"));
      assert.ok(
        !contextMd.includes("## Current State"),
        "init must not scaffold Current State"
      );
      assert.ok(!contextMd.includes("## What Comes Next"));
      assert.ok(
        !contextMd.includes("## Last Updated"),
        "init must not scaffold Last Updated"
      );
      assert.ok(
        !contextMd.includes("## Known Limitations"),
        "init must not scaffold Known Limitations"
      );
      assert.ok(
        /wdd session/i.test(contextMd),
        "init CONTEXT.md should point humans at wdd session"
      );
    } finally {
      cleanup(fresh);
    }
  });

  it("complete_reminder_forbids_diary", async () => {
    /**
     * Given: a gold Ward
     * When: completeWard runs
     * Then: steps do not tell the human to update Current State
     * And: they point at generated working memory, Active Constraints, and validate
     */
    writeScopedWard(tmpDir, {
      epic: "core",
      ward: 1,
      name: "Auth Module",
      status: "gold",
    });

    const result = await completeWard(tmpDir, "core-001");
    const joined = result.steps.join("\n");

    assert.ok(
      !joined.includes('Update "Current State"'),
      `Complete still asks for a Current State diary.\n${joined}`
    );
    assert.ok(
      !joined.includes("What Comes Next"),
      `Complete still asks to rewrite What Comes Next.\n${joined}`
    );
    assert.ok(
      /Working memory is generated/i.test(joined),
      `Should say working memory is generated.\n${joined}`
    );
    assert.ok(
      joined.includes("Active Constraints"),
      `Should point at Active Constraints.\n${joined}`
    );
    assert.ok(
      /Run:\s*wdd validate/.test(joined),
      `Should emit the validate run step.\n${joined}`
    );
  });

  it("adapter_forbids_diary_standing_order", () => {
    /**
     * Given: adapter shared content
     * When: getSharedContent is read
     * Then: it no longer orders the AI to update Current State / What Comes Next
     * And: it still names wdd session as the session brain
     */
    const content = getSharedContent("test-project");
    assert.ok(content.includes("wdd session"));
    assert.ok(
      !/update.{0,80}CONTEXT\.md.{0,80}Current State/i.test(content),
      "Adapter still instructs updating Current State on CONTEXT.md"
    );
    assert.ok(
      !/update.{0,80}Current State/i.test(content),
      "Adapter still instructs updating Current State (order-insensitive)"
    );
    assert.ok(
      !/update.{0,80}What Comes Next/i.test(content),
      "Adapter still instructs updating What Comes Next"
    );
    assert.ok(
      /invariants|Active Constraints/i.test(content),
      "Adapter should describe CONTEXT.md as invariants / Active Constraints"
    );
  });
});

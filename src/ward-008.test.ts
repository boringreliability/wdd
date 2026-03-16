import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { printStatus, runProgress } from "./commands/status-progress.js";
import { searchMemory } from "./commands/search.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeMemoryFile(
  dir: string,
  subdir: string,
  filename: string,
  tags: string[],
  type: string,
  body: string
): void {
  const filePath = path.join(dir, ".wdd", "memory", subdir, filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `---\ntype: ${type}\ndate: 2026-03-15\nward: 1\ntags: [${tags.join(", ")}]\n---\n${body}\n`
  );
}

describe("Ward 008: Status & Progress", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: status prints PROGRESS.md
  it("status_prints_progress", () => {
    const output = printStatus(tmpDir);
    assert.ok(output.includes("Progress"), "Should contain Progress heading");
  });

  // Test 2: status errors when PROGRESS.md missing
  it("status_missing_file", () => {
    fs.unlinkSync(path.join(tmpDir, ".wdd", "PROGRESS.md"));

    assert.throws(
      () => printStatus(tmpDir),
      (err: Error) => {
        assert.ok(err.message.includes("PROGRESS.md"), `Should mention file: ${err.message}`);
        return true;
      }
    );
  });

  // Test 3: progress regenerates from ward frontmatter
  it("progress_regenerates", async () => {
    await createWard(tmpDir, { name: "Alpha Ward", epic: "core", layer: "rust", tests: 7 });

    runProgress(tmpDir);

    const content = fs.readFileSync(path.join(tmpDir, ".wdd", "PROGRESS.md"), "utf-8");
    assert.ok(content.includes("Alpha Ward"), "Regenerated PROGRESS.md should list ward");
    assert.ok(content.includes("0 of 1"), "Should show 0 of 1 complete");
  });
});

describe("Ward 008: Search", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 4: find by content
  it("search_by_content", () => {
    writeMemoryFile(tmpDir, "decisions", "2026-03-15-zero-copy.md",
      ["architecture", "rendering"], "decision",
      "# Zero-copy display list\nDisplay list uses SharedArrayBuffer for zero-copy rendering."
    );

    const results = searchMemory(tmpDir, "SharedArrayBuffer");
    assert.equal(results.length, 1);
    assert.ok(results[0].file.includes("zero-copy"));
  });

  // Test 5: find by tag
  it("search_by_tag", () => {
    writeMemoryFile(tmpDir, "decisions", "2026-03-15-ecs.md",
      ["architecture", "ecs"], "decision",
      "# ECS over OOP\nUsing entity component system."
    );
    writeMemoryFile(tmpDir, "decisions", "2026-03-15-colors.md",
      ["theming", "typescript"], "decision",
      "# TS owns colors\nAll colors managed by TypeScript."
    );

    const results = searchMemory(tmpDir, "", { tag: "ecs" });
    assert.equal(results.length, 1);
    assert.ok(results[0].file.includes("ecs"));
  });

  // Test 6: no results
  it("search_no_results", () => {
    const results = searchMemory(tmpDir, "nonexistent-query-xyz");
    assert.equal(results.length, 0);
  });

  // Test 7: searches both decisions and learnings
  it("search_decisions_and_learnings", () => {
    writeMemoryFile(tmpDir, "decisions", "2026-03-15-perf.md",
      ["performance"], "decision",
      "# Performance decision\nOptimize hot path."
    );
    writeMemoryFile(tmpDir, "learnings", "2026-03-15-god-class.md",
      ["anti-pattern"], "learning",
      "# God class lesson\nHot path was in a god class."
    );

    const results = searchMemory(tmpDir, "hot path");
    assert.equal(results.length, 2);
  });

  // Test 8: case insensitive
  it("search_case_insensitive", () => {
    writeMemoryFile(tmpDir, "decisions", "2026-03-15-wasm.md",
      ["wasm"], "decision",
      "# WASM API design\nThe WebAssembly module exports tick()."
    );

    const results = searchMemory(tmpDir, "webassembly");
    assert.equal(results.length, 1);
  });

  // Test 9: tag + content combined
  it("search_tag_plus_content", () => {
    writeMemoryFile(tmpDir, "decisions", "2026-03-15-a.md",
      ["rendering"], "decision",
      "# Canvas rendering\nUsing Canvas 2D API."
    );
    writeMemoryFile(tmpDir, "decisions", "2026-03-15-b.md",
      ["networking"], "decision",
      "# Network layer\nUsing Canvas protocol." // has "Canvas" but wrong tag
    );

    const results = searchMemory(tmpDir, "Canvas", { tag: "rendering" });
    assert.equal(results.length, 1);
    assert.ok(results[0].file.includes("-a.md"));
  });
});

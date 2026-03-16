import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { updateWardStatus } from "./commands/ward-status.js";
import { assembleSession } from "./commands/session.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("Ward 006: Session Command", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: output contains PROJECT.md content
  it("session_includes_project", () => {
    const output = assembleSession(tmpDir);
    assert.ok(output.includes("test-project"), "Should include project name");
    assert.ok(output.includes("═══ PROJECT ═══"), "Should have PROJECT section header");
  });

  // Test 2: output contains CONTEXT.md content
  it("session_includes_context", () => {
    const output = assembleSession(tmpDir);
    assert.ok(output.includes("═══ CONTEXT ═══"), "Should have CONTEXT section header");
    assert.ok(output.includes("Current State"), "Should include CONTEXT.md content");
  });

  // Test 3: output contains PROGRESS.md content
  it("session_includes_progress", () => {
    const output = assembleSession(tmpDir);
    assert.ok(output.includes("═══ PROGRESS ═══"), "Should have PROGRESS section header");
  });

  // Test 4: output contains first non-complete ward
  it("session_includes_current_ward", async () => {
    await createWard(tmpDir, { name: "My First Ward", epic: "core", layer: "rust", tests: 5 });

    const output = assembleSession(tmpDir);
    assert.ok(output.includes("My First Ward"), "Should include current ward name");
    assert.ok(output.includes("═══ CURRENT WARD"), "Should have CURRENT WARD header");
  });

  // Test 5: picks ward-002 when ward-001 is complete
  it("session_skips_complete_wards", async () => {
    await createWard(tmpDir, { name: "Done Ward", epic: "core", layer: "rust", tests: 5 });
    await updateWardStatus(tmpDir, 1, "red");
    await updateWardStatus(tmpDir, 1, "approved");
    await updateWardStatus(tmpDir, 1, "gold");
    await updateWardStatus(tmpDir, 1, "complete");

    await createWard(tmpDir, { name: "Active Ward", epic: "core", layer: "rust", tests: 8 });

    const output = assembleSession(tmpDir);
    assert.ok(output.includes("Active Ward"), "Should show ward-002 as current");
    assert.ok(!output.includes("═══ CURRENT WARD: 1"), "Should not show completed ward as current");
  });

  // Test 6: all wards complete
  it("session_all_complete", async () => {
    await createWard(tmpDir, { name: "Only Ward", epic: "core", layer: "rust", tests: 3 });
    await updateWardStatus(tmpDir, 1, "red");
    await updateWardStatus(tmpDir, 1, "approved");
    await updateWardStatus(tmpDir, 1, "gold");
    await updateWardStatus(tmpDir, 1, "complete");

    const output = assembleSession(tmpDir);
    assert.ok(output.includes("All Wards complete"), "Should indicate all complete");
  });

  // Test 7: handles missing PROJECT.md
  it("session_missing_files", () => {
    fs.unlinkSync(path.join(tmpDir, ".wdd", "PROJECT.md"));

    const output = assembleSession(tmpDir);
    // Should not throw, should still have other sections
    assert.ok(output.includes("═══ CONTEXT ═══"), "Should still have CONTEXT");
  });
});

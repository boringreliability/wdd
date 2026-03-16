import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { updateWardStatus } from "./commands/ward-status.js";
import { completeWard, regenerateProgress } from "./commands/ward-complete.js";
import { parseFrontmatter } from "./frontmatter.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

async function createWardInGold(dir: string, name: string, tests: number): Promise<number> {
  await createWard(dir, { name, epic: "core", layer: "rust", tests });
  const files = fs.readdirSync(path.join(dir, ".wdd", "wards"))
    .filter((f) => /^ward-\d+\.md$/.test(f));
  const num = files.length;
  await updateWardStatus(dir, num, "red");
  await updateWardStatus(dir, num, "approved");
  await updateWardStatus(dir, num, "gold");
  return num;
}

describe("Ward 005: Ward Complete Flow", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: ward transitions to complete
  it("complete_transitions_to_complete", async () => {
    const num = await createWardInGold(tmpDir, "Test Ward", 5);
    await completeWard(tmpDir, num);

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.status, "complete");
    assert.ok(frontmatter.completed !== null);
  });

  // Test 2: CONTEXT.md snapshotted
  it("complete_snapshots_context", async () => {
    // Write something identifiable to CONTEXT.md
    fs.writeFileSync(
      path.join(tmpDir, ".wdd", "CONTEXT.md"),
      "# Context\n\nUnique snapshot content 12345\n"
    );

    const num = await createWardInGold(tmpDir, "Test Ward", 5);
    await completeWard(tmpDir, num);

    const snapshotPath = path.join(
      tmpDir, ".wdd", "memory", "snapshots", "ward-001-complete.md"
    );
    assert.ok(fs.existsSync(snapshotPath), "Snapshot file should exist");

    const snapshot = fs.readFileSync(snapshotPath, "utf-8");
    assert.ok(
      snapshot.includes("Unique snapshot content 12345"),
      "Snapshot should contain CONTEXT.md content"
    );
  });

  // Test 3: PROGRESS.md regenerated
  it("complete_regenerates_progress", async () => {
    const num = await createWardInGold(tmpDir, "Test Ward", 5);
    await completeWard(tmpDir, num);

    const progress = fs.readFileSync(
      path.join(tmpDir, ".wdd", "PROGRESS.md"),
      "utf-8"
    );
    assert.ok(progress.includes("Test Ward"), "PROGRESS.md should list ward name");
    assert.ok(progress.includes("✅"), "PROGRESS.md should show complete symbol");
  });

  // Test 4: rejects non-gold ward
  it("complete_rejects_non_gold", async () => {
    await createWard(tmpDir, { name: "Planned Ward", epic: "core", layer: "rust", tests: 5 });

    await assert.rejects(
      () => completeWard(tmpDir, 1),
      (err: Error) => {
        assert.ok(
          err.message.includes("gold"),
          `Should mention gold: ${err.message}`
        );
        return true;
      }
    );
  });

  // Test 5: correct status symbols
  it("progress_status_symbols", async () => {
    // Create wards in various states
    await createWard(tmpDir, { name: "Planned", epic: "core", layer: "rust", tests: 3 });
    await createWard(tmpDir, { name: "In Red", epic: "core", layer: "rust", tests: 3 });
    await updateWardStatus(tmpDir, 2, "red");

    const progress = regenerateProgress(tmpDir);
    assert.ok(progress.includes("📋"), "Should have planned symbol");
    assert.ok(progress.includes("🔴"), "Should have red symbol");
  });

  // Test 6: progress shows all wards
  it("progress_multiple_wards", async () => {
    await createWard(tmpDir, { name: "Alpha", epic: "core", layer: "rust", tests: 5 });
    await createWard(tmpDir, { name: "Beta", epic: "core", layer: "rust", tests: 8 });
    await createWard(tmpDir, { name: "Gamma", epic: "core", layer: "rust", tests: 3 });

    const progress = regenerateProgress(tmpDir);
    assert.ok(progress.includes("Alpha"), "Should list Alpha");
    assert.ok(progress.includes("Beta"), "Should list Beta");
    assert.ok(progress.includes("Gamma"), "Should list Gamma");
  });

  // Test 7: summary has correct counts
  it("progress_summary_counts", async () => {
    const num1 = await createWardInGold(tmpDir, "Done Ward", 5);
    await updateWardStatus(tmpDir, num1, "complete");
    await createWard(tmpDir, { name: "Pending Ward", epic: "core", layer: "rust", tests: 3 });

    const progress = regenerateProgress(tmpDir);
    assert.ok(
      progress.includes("1 of 2 Wards complete"),
      `Summary should show 1 of 2, got: ${progress.split("\n").find((l) => l.includes("of"))}`
    );
  });

  // Test 8: returns step descriptions
  it("complete_prints_steps", async () => {
    const num = await createWardInGold(tmpDir, "Test Ward", 5);
    const result = await completeWard(tmpDir, num);

    assert.ok(Array.isArray(result.steps), "Should return steps array");
    assert.ok(result.steps.length >= 3, "Should have at least 3 steps");
    assert.ok(
      result.steps.some((s) => s.includes("Snapshot")),
      "Should mention snapshot step"
    );
  });
});

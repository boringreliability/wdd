import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { updateWardStatus } from "./commands/ward-status.js";
import { completeWard } from "./commands/ward-complete.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

async function createWardInGold(dir: string, name: string): Promise<number> {
  await createWard(dir, { name, epic: "core", layer: "typescript", tests: 5 });
  const files = fs.readdirSync(path.join(dir, ".wdd", "wards"))
    .filter((f) => /^ward-\d+\.md$/.test(f));
  const num = files.length;
  await updateWardStatus(dir, num, "red");
  await updateWardStatus(dir, num, "approved");
  await updateWardStatus(dir, num, "gold");
  return num;
}

describe("Ward 009: Complete Output Enhancements", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: commit reminder present
  it("complete_commit_reminder", async () => {
    const num = await createWardInGold(tmpDir, "Auth Module");
    const result = await completeWard(tmpDir, num);

    assert.ok(
      result.steps.some((s) => s.includes("git") && s.includes("commit")),
      `Should contain git commit reminder: ${result.steps}`
    );
  });

  // Test 2: CONTEXT.md reminder present
  it("complete_context_reminder", async () => {
    const num = await createWardInGold(tmpDir, "Auth Module");
    const result = await completeWard(tmpDir, num);

    assert.ok(
      result.steps.some((s) => s.includes("CONTEXT.md")),
      `Should contain CONTEXT.md reminder: ${result.steps}`
    );
  });

  // Test 3: commit message includes ward name
  it("complete_commit_has_ward_name", async () => {
    const num = await createWardInGold(tmpDir, "Spatial Index");
    const result = await completeWard(tmpDir, num);

    const commitStep = result.steps.find((s) => s.includes("commit"));
    assert.ok(commitStep, "Should have commit step");
    assert.ok(
      commitStep!.includes("Spatial Index"),
      `Commit should include ward name: ${commitStep}`
    );
  });

  // Test 4: commit message includes ward number
  it("complete_commit_has_ward_number", async () => {
    const num = await createWardInGold(tmpDir, "Auth Module");
    const result = await completeWard(tmpDir, num);

    const commitStep = result.steps.find((s) => s.includes("commit"));
    assert.ok(commitStep, "Should have commit step");
    assert.ok(
      commitStep!.includes(String(num)),
      `Commit should include ward number: ${commitStep}`
    );
  });

  // Test 5: CONTEXT.md reminder mentions validate
  it("complete_context_has_validate", async () => {
    const num = await createWardInGold(tmpDir, "Auth Module");
    const result = await completeWard(tmpDir, num);

    const contextStep = result.steps.find(
      (s) => s.includes("CONTEXT.md") && s.includes("validate")
    );
    assert.ok(
      contextStep,
      `Should have CONTEXT.md step mentioning validate: ${result.steps}`
    );
  });
});

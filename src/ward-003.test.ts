import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { updateWardStatus } from "./commands/ward-status.js";
import { parseFrontmatter } from "./frontmatter.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function readWard(dir: string, filename: string) {
  const content = fs.readFileSync(
    path.join(dir, ".wdd", "wards", filename),
    "utf-8"
  );
  return parseFrontmatter(content);
}

describe("Ward 003: Ward Status Transitions", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
    await createWard(tmpDir, { name: "Test Ward", epic: "core", layer: "rust", tests: 5 });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: planned → red
  it("transition_planned_to_red", async () => {
    await updateWardStatus(tmpDir, 1, "red");

    const { frontmatter } = readWard(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "red");
  });

  // Test 2: red → approved
  it("transition_red_to_approved", async () => {
    await updateWardStatus(tmpDir, 1, "red");
    await updateWardStatus(tmpDir, 1, "approved");

    const { frontmatter } = readWard(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "approved");
  });

  // Test 3: approved → gold
  it("transition_approved_to_gold", async () => {
    await updateWardStatus(tmpDir, 1, "red");
    await updateWardStatus(tmpDir, 1, "approved");
    await updateWardStatus(tmpDir, 1, "gold");

    const { frontmatter } = readWard(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "gold");
  });

  // Test 4: gold → complete, sets completed date
  it("transition_gold_to_complete", async () => {
    await updateWardStatus(tmpDir, 1, "red");
    await updateWardStatus(tmpDir, 1, "approved");
    await updateWardStatus(tmpDir, 1, "gold");
    await updateWardStatus(tmpDir, 1, "complete");

    const { frontmatter } = readWard(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "complete");
    assert.ok(frontmatter.completed !== null, "completed date should be set");
    assert.match(
      String(frontmatter.completed),
      /^\d{4}-\d{2}-\d{2}$/,
      "completed should be ISO date"
    );
  });

  // Test 5: gold → red (rejection) appends feedback
  it("transition_gold_to_red", async () => {
    await updateWardStatus(tmpDir, 1, "red");
    await updateWardStatus(tmpDir, 1, "approved");
    await updateWardStatus(tmpDir, 1, "gold");
    await updateWardStatus(tmpDir, 1, "red", "Violates must-not: hardcoded colors");

    const { frontmatter, body } = readWard(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "red");
    assert.ok(
      body.includes("hardcoded colors"),
      "Body should contain rejection feedback"
    );
  });

  // Test 6: planned → blocked
  it("transition_planned_to_blocked", async () => {
    await updateWardStatus(tmpDir, 1, "blocked");

    const { frontmatter } = readWard(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "blocked");
  });

  // Test 7: blocked → planned
  it("transition_blocked_to_planned", async () => {
    await updateWardStatus(tmpDir, 1, "blocked");
    await updateWardStatus(tmpDir, 1, "planned");

    const { frontmatter } = readWard(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "planned");
  });

  // Test 8: reject planned → complete
  it("reject_invalid_transition", async () => {
    await assert.rejects(
      () => updateWardStatus(tmpDir, 1, "complete"),
      (err: Error) => {
        assert.ok(
          err.message.includes("Invalid transition"),
          `Should mention invalid transition: ${err.message}`
        );
        return true;
      }
    );
  });

  // Test 9: reject red → gold (must go through approved)
  it("reject_invalid_red_to_gold", async () => {
    await updateWardStatus(tmpDir, 1, "red");

    await assert.rejects(
      () => updateWardStatus(tmpDir, 1, "gold"),
      (err: Error) => {
        assert.ok(
          err.message.includes("Invalid transition"),
          `Should mention invalid transition: ${err.message}`
        );
        return true;
      }
    );
  });

  // Test 10: resolve ward by integer ID
  it("resolve_ward_by_id", async () => {
    await createWard(tmpDir, { name: "Second Ward", epic: "core", layer: "rust", tests: 3 });
    await updateWardStatus(tmpDir, 2, "red");

    const { frontmatter } = readWard(tmpDir, "ward-002.md");
    assert.equal(frontmatter.status, "red");
  });
});

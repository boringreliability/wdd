import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { updateWardStatus } from "./commands/ward-status.js";
import { reopenWard } from "./commands/ward-reopen.js";
import { parseFrontmatter } from "./frontmatter.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function readWardFile(dir: string, filename: string) {
  const content = fs.readFileSync(
    path.join(dir, ".wdd", "wards", filename),
    "utf-8"
  );
  return parseFrontmatter(content);
}

async function createAndCompleteWard(dir: string, name: string): Promise<void> {
  await createWard(dir, { name, epic: "core", layer: "rust", tests: 5 });
  const wardNum =
    fs.readdirSync(path.join(dir, ".wdd", "wards"))
      .filter((f) => /^ward-\d+\.md$/.test(f)).length;
  await updateWardStatus(dir, wardNum, "red");
  await updateWardStatus(dir, wardNum, "approved");
  await updateWardStatus(dir, wardNum, "gold");
  await updateWardStatus(dir, wardNum, "complete");
}

describe("Ward 004: Ward Reopen", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
    await createAndCompleteWard(tmpDir, "Original Ward");
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: creates ward-001b.md
  it("reopen_creates_fix_ward", async () => {
    await reopenWard(tmpDir, 1, "Boundary invariant broken by Ward 5");

    const fixPath = path.join(tmpDir, ".wdd", "wards", "ward-001b.md");
    assert.ok(fs.existsSync(fixPath), "ward-001b.md should exist");
  });

  // Test 2: original stays complete
  it("reopen_preserves_original", async () => {
    await reopenWard(tmpDir, 1, "Need to fix edge case");

    const { frontmatter } = readWardFile(tmpDir, "ward-001.md");
    assert.equal(frontmatter.status, "complete");
  });

  // Test 3: original body gets reopening note
  it("reopen_appends_note", async () => {
    await reopenWard(tmpDir, 1, "Spatial index boundary broken");

    const { body } = readWardFile(tmpDir, "ward-001.md");
    assert.ok(
      body.includes("Reopened"),
      "Original body should contain reopening note"
    );
    assert.ok(
      body.includes("Spatial index boundary broken"),
      "Original body should contain reason"
    );
  });

  // Test 4: fix ward frontmatter
  it("reopen_fix_ward_frontmatter", async () => {
    await reopenWard(tmpDir, 1, "Fix needed");

    const { frontmatter } = readWardFile(tmpDir, "ward-001b.md");
    assert.equal(frontmatter.ward, 1);
    assert.equal(frontmatter.revision, "b");
    assert.equal(frontmatter.status, "planned");
    assert.equal(frontmatter.completed, null);
  });

  // Test 5: fix ward body contains reason and link
  it("reopen_fix_ward_body", async () => {
    await reopenWard(tmpDir, 1, "Edge culling broken for long edges");

    const { body } = readWardFile(tmpDir, "ward-001b.md");
    assert.ok(
      body.includes("Edge culling broken for long edges"),
      "Fix ward body should contain reason"
    );
    assert.ok(
      body.includes("ward-001.md"),
      "Fix ward body should reference original"
    );
  });

  // Test 6: rejects non-complete ward
  it("reopen_rejects_non_complete", async () => {
    await createWard(tmpDir, { name: "Incomplete Ward", epic: "core", layer: "rust", tests: 3 });

    await assert.rejects(
      () => reopenWard(tmpDir, 2, "Some reason"),
      (err: Error) => {
        assert.ok(
          err.message.includes("complete"),
          `Should mention complete: ${err.message}`
        );
        return true;
      }
    );
  });

  // Test 7: second reopen creates ward-001c.md
  it("reopen_sequential_revision", async () => {
    await reopenWard(tmpDir, 1, "First fix");
    await reopenWard(tmpDir, 1, "Second fix");

    const fixC = path.join(tmpDir, ".wdd", "wards", "ward-001c.md");
    assert.ok(fs.existsSync(fixC), "ward-001c.md should exist");

    const { frontmatter } = readWardFile(tmpDir, "ward-001c.md");
    assert.equal(frontmatter.revision, "c");
  });
});

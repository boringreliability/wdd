import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { parseFrontmatter } from "./frontmatter.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("Ward 002: Ward Creation", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: creates ward-001.md when no wards exist
  it("create_ward_first", async () => {
    await createWard(tmpDir, {
      name: "Core Types",
      epic: "core",
      layer: "rust",
      tests: 8,
    });

    const wardPath = path.join(tmpDir, ".wdd", "wards", "ward-001.md");
    assert.ok(fs.existsSync(wardPath), "ward-001.md should exist");
  });

  // Test 2: creates ward-002.md when ward-001 exists
  it("create_ward_sequential", async () => {
    await createWard(tmpDir, {
      name: "First Ward",
      epic: "core",
      layer: "typescript",
      tests: 5,
    });
    await createWard(tmpDir, {
      name: "Second Ward",
      epic: "core",
      layer: "typescript",
      tests: 10,
    });

    const wardPath = path.join(tmpDir, ".wdd", "wards", "ward-002.md");
    assert.ok(fs.existsSync(wardPath), "ward-002.md should exist");
  });

  // Test 3: frontmatter has correct values
  it("create_ward_frontmatter", async () => {
    await createWard(tmpDir, {
      name: "Spatial Index",
      epic: "engine",
      layer: "rust",
      tests: 12,
    });

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(content);

    assert.equal(frontmatter.ward, 1);
    assert.equal(frontmatter.name, "Spatial Index");
    assert.equal(frontmatter.epic, "engine");
    assert.equal(frontmatter.layer, "rust");
    assert.equal(frontmatter.estimated_tests, 12);
    assert.equal(frontmatter.status, "planned");
    assert.equal(frontmatter.revision, null);
    assert.equal(frontmatter.completed, null);
    assert.deepEqual(frontmatter.dependencies, []);
  });

  // Test 4: body contains ward number and name in heading
  it("create_ward_body", async () => {
    await createWard(tmpDir, {
      name: "Hit Testing",
      epic: "core",
      layer: "rust",
      tests: 6,
    });

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001.md"),
      "utf-8"
    );
    const { body } = parseFrontmatter(content);

    assert.ok(
      body.includes("# Ward 001: Hit Testing"),
      `Body should contain heading, got: ${body.slice(0, 100)}`
    );
  });

  // Test 5: layer defaults to typescript
  it("create_ward_default_layer", async () => {
    await createWard(tmpDir, {
      name: "Default Layer Ward",
      epic: "core",
    });

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(content);

    assert.equal(frontmatter.layer, "typescript");
  });

  // Test 6: errors when no name provided
  it("create_ward_requires_name", async () => {
    await assert.rejects(
      () =>
        createWard(tmpDir, {
          name: "",
          epic: "core",
        }),
      (err: Error) => {
        assert.ok(err.message.includes("name"), `Should mention name: ${err.message}`);
        return true;
      }
    );
  });

  // Test 7: errors when no epic provided
  it("create_ward_requires_epic", async () => {
    await assert.rejects(
      () =>
        createWard(tmpDir, {
          name: "Some Ward",
          epic: "",
        }),
      (err: Error) => {
        assert.ok(err.message.includes("epic"), `Should mention epic: ${err.message}`);
        return true;
      }
    );
  });

  // Test 8: numbering handles reopened wards correctly
  it("create_ward_skips_reopened", async () => {
    // Create ward 1 and 2
    await createWard(tmpDir, { name: "Ward One", epic: "core", layer: "rust", tests: 5 });
    await createWard(tmpDir, { name: "Ward Two", epic: "core", layer: "rust", tests: 5 });

    // Simulate a reopened ward-001b.md
    fs.writeFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001b.md"),
      `---
ward: 1
revision: "b"
name: "Ward One Fix"
epic: core
status: planned
dependencies: []
layer: rust
estimated_tests: 2
created: 2026-03-14
completed: null
---
# Ward 001b: Ward One Fix
`
    );

    // Next ward should be 3, not 4
    await createWard(tmpDir, { name: "Ward Three", epic: "core", layer: "rust", tests: 8 });

    const wardPath = path.join(tmpDir, ".wdd", "wards", "ward-003.md");
    assert.ok(fs.existsSync(wardPath), "ward-003.md should exist (not ward-004)");
  });
});

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";

let tmpDir: string;

function setup(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
  return dir;
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("Ward 001: Project Scaffold + Init", () => {
  beforeEach(() => {
    tmpDir = setup();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: init creates directory structure
  it("init_creates_directory_structure", async () => {
    await initProject(tmpDir, { name: "test-project" });

    const wddDir = path.join(tmpDir, ".wdd");
    assert.ok(fs.existsSync(wddDir), ".wdd/ should exist");
    assert.ok(fs.existsSync(path.join(wddDir, "wards")), "wards/ should exist");
    assert.ok(fs.existsSync(path.join(wddDir, "epics")), "epics/ should exist");
    assert.ok(fs.existsSync(path.join(wddDir, "reviews")), "reviews/ should exist");
    assert.ok(
      fs.existsSync(path.join(wddDir, "memory", "decisions")),
      "memory/decisions/ should exist"
    );
    assert.ok(
      fs.existsSync(path.join(wddDir, "memory", "learnings")),
      "memory/learnings/ should exist"
    );
    assert.ok(
      fs.existsSync(path.join(wddDir, "memory", "snapshots")),
      "memory/snapshots/ should exist"
    );
    assert.ok(fs.existsSync(path.join(wddDir, "templates")), "templates/ should exist");
    assert.ok(fs.existsSync(path.join(wddDir, "adapters")), "adapters/ should exist");
  });

  // Test 2: init creates PROJECT.md with project name
  it("init_creates_project_md", async () => {
    await initProject(tmpDir, { name: "my-awesome-project" });

    const projectMd = fs.readFileSync(
      path.join(tmpDir, ".wdd", "PROJECT.md"),
      "utf-8"
    );
    assert.ok(projectMd.includes("my-awesome-project"), "PROJECT.md should contain project name");
    assert.ok(projectMd.includes("## Identity"), "PROJECT.md should have Identity section");
    assert.ok(projectMd.includes("## Principles"), "PROJECT.md should have Principles section");
  });

  // Test 3: init creates CONTEXT.md with initial content
  it("init_creates_context_md", async () => {
    await initProject(tmpDir, { name: "test-project" });

    const contextMd = fs.readFileSync(
      path.join(tmpDir, ".wdd", "CONTEXT.md"),
      "utf-8"
    );
    assert.ok(contextMd.includes("# Context"), "CONTEXT.md should have title");
    assert.ok(contextMd.includes("## Current State"), "CONTEXT.md should have Current State");
    assert.ok(contextMd.includes("## What Comes Next"), "CONTEXT.md should have What Comes Next");
  });

  // Test 4: init creates config.json with defaults
  it("init_creates_config_json", async () => {
    await initProject(tmpDir, { name: "test-project" });

    const configPath = path.join(tmpDir, ".wdd", "config.json");
    assert.ok(fs.existsSync(configPath), "config.json should exist");

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    assert.equal(config.project, "test-project");
    assert.equal(config.methodology, "wdd");
    assert.equal(config.wdd_version, "1.0");
    assert.equal(config.ward_prefix, "ward");
    assert.equal(config.ward_digits, 3);
  });

  // Test 5: init creates all template files
  it("init_creates_templates", async () => {
    await initProject(tmpDir, { name: "test-project" });

    const templatesDir = path.join(tmpDir, ".wdd", "templates");
    const expectedTemplates = [
      "ward.md",
      "epic.md",
      "review.md",
      "integration.md",
      "decision.md",
      "learning.md",
    ];

    for (const template of expectedTemplates) {
      assert.ok(
        fs.existsSync(path.join(templatesDir, template)),
        `templates/${template} should exist`
      );
    }
  });

  // Test 6: init fails if .wdd/ already exists
  it("init_fails_if_exists", async () => {
    fs.mkdirSync(path.join(tmpDir, ".wdd"));

    await assert.rejects(
      () => initProject(tmpDir, { name: "test-project" }),
      (err: Error) => {
        assert.ok(
          err.message.includes("already exists"),
          `Error message should mention 'already exists', got: ${err.message}`
        );
        return true;
      }
    );
  });

  // Test 7: init --force overwrites existing .wdd/
  it("init_force_overwrites", async () => {
    // Create initial .wdd/ with a dummy file
    const wddDir = path.join(tmpDir, ".wdd");
    fs.mkdirSync(wddDir);
    fs.writeFileSync(path.join(wddDir, "old-file.txt"), "old content");

    await initProject(tmpDir, { name: "fresh-project", force: true });

    // Should have new structure
    assert.ok(fs.existsSync(path.join(wddDir, "PROJECT.md")), "PROJECT.md should exist after force");
    assert.ok(fs.existsSync(path.join(wddDir, "wards")), "wards/ should exist after force");

    // Old file should be gone
    assert.ok(
      !fs.existsSync(path.join(wddDir, "old-file.txt")),
      "Old files should be removed after force"
    );
  });
});

describe("Ward 001: Frontmatter Parser", () => {
  // Test 8: parse valid YAML frontmatter
  it("frontmatter_parse_valid", () => {
    const input = `---
ward: 1
name: "Core Types"
status: planned
dependencies: []
layer: rust
estimated_tests: 8
created: 2026-03-12
completed: null
---
# Ward 001: Core Types

Some body content here.`;

    const result = parseFrontmatter(input);

    assert.equal(result.frontmatter.ward, 1);
    assert.equal(result.frontmatter.name, "Core Types");
    assert.equal(result.frontmatter.status, "planned");
    assert.deepEqual(result.frontmatter.dependencies, []);
    assert.equal(result.frontmatter.layer, "rust");
    assert.equal(result.frontmatter.estimated_tests, 8);
    assert.equal(result.frontmatter.completed, null);
    assert.ok(result.body.includes("# Ward 001: Core Types"));
    assert.ok(result.body.includes("Some body content here."));
  });

  // Test 9: parse missing frontmatter
  it("frontmatter_parse_missing", () => {
    const input = `# Just a regular markdown file

No frontmatter here.`;

    const result = parseFrontmatter(input);

    assert.deepEqual(result.frontmatter, {});
    assert.ok(result.body.includes("# Just a regular markdown file"));
  });

  // Test 10: frontmatter roundtrip
  it("frontmatter_roundtrip", () => {
    const original = {
      ward: 3,
      revision: null,
      name: "Spatial Index",
      epic: "core",
      status: "complete",
      dependencies: [1, 2],
      layer: "rust",
      estimated_tests: 12,
      created: "2026-03-12",
      completed: "2026-03-12",
    };
    const body = "# Ward 003: Spatial Index\n\nBody content.";

    const serialized = serializeFrontmatter(original, body);
    const parsed = parseFrontmatter(serialized);

    assert.deepEqual(parsed.frontmatter, original);
    assert.equal(parsed.body.trim(), body);
  });
});

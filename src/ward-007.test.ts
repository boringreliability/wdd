import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { validateProject } from "./commands/validate.js";
import { parseFrontmatter, serializeFrontmatter } from "./frontmatter.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("Ward 007: Validate Command", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: fresh init passes
  it("validate_clean_project", () => {
    const result = validateProject(tmpDir);
    assert.equal(result.valid, true, `Errors: ${result.errors.join(", ")}`);
    assert.equal(result.errors.length, 0);
  });

  // Test 2: missing PROJECT.md
  it("validate_missing_project_md", () => {
    fs.unlinkSync(path.join(tmpDir, ".wdd", "PROJECT.md"));

    const result = validateProject(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("PROJECT.md")),
      `Should mention PROJECT.md: ${result.errors}`
    );
  });

  // Test 3: missing wards/ directory
  it("validate_missing_directory", () => {
    fs.rmSync(path.join(tmpDir, ".wdd", "wards"), { recursive: true });

    const result = validateProject(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("wards")),
      `Should mention wards: ${result.errors}`
    );
  });

  // Test 4: invalid ward status
  it("validate_invalid_ward_status", async () => {
    await createWard(tmpDir, { name: "Bad Ward", epic: "core", layer: "rust", tests: 3 });

    // Manually corrupt the status
    const wardPath = path.join(tmpDir, ".wdd", "wards", "ward-001.md");
    const content = fs.readFileSync(wardPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    frontmatter.status = "invalid_status";
    fs.writeFileSync(wardPath, serializeFrontmatter(frontmatter as Record<string, unknown>, body));

    const result = validateProject(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("invalid") || e.includes("status")),
      `Should mention invalid status: ${result.errors}`
    );
  });

  // Test 5: dependency references non-existent ward
  it("validate_missing_dependency", async () => {
    await createWard(tmpDir, { name: "Dep Ward", epic: "core", layer: "rust", tests: 3 });

    const wardPath = path.join(tmpDir, ".wdd", "wards", "ward-001.md");
    const content = fs.readFileSync(wardPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    frontmatter.dependencies = [99];
    fs.writeFileSync(wardPath, serializeFrontmatter(frontmatter as Record<string, unknown>, body));

    const result = validateProject(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("99")),
      `Should mention missing ward 99: ${result.errors}`
    );
  });

  // Test 6: CONTEXT.md over 200 lines = error
  it("validate_context_over_limit", () => {
    const lines = Array.from({ length: 210 }, (_, i) => `Line ${i + 1}`).join("\n");
    fs.writeFileSync(path.join(tmpDir, ".wdd", "CONTEXT.md"), lines);

    const result = validateProject(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("CONTEXT.md") && e.includes("200")),
      `Should mention line limit: ${result.errors}`
    );
  });

  // Test 7: CONTEXT.md over 150 lines = warning
  it("validate_context_warning", () => {
    const lines = Array.from({ length: 160 }, (_, i) => `Line ${i + 1}`).join("\n");
    fs.writeFileSync(path.join(tmpDir, ".wdd", "CONTEXT.md"), lines);

    const result = validateProject(tmpDir);
    assert.equal(result.valid, true, "Should still be valid (warning, not error)");
    assert.ok(
      result.warnings.some((w) => w.includes("CONTEXT.md")),
      `Should warn about size: ${result.warnings}`
    );
  });

  // Test 8: malformed config.json
  it("validate_invalid_config", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".wdd", "config.json"),
      "{ this is not valid json"
    );

    const result = validateProject(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("config.json")),
      `Should mention config.json: ${result.errors}`
    );
  });

  // Test 9: passes with properly created wards
  it("validate_valid_with_wards", async () => {
    await createWard(tmpDir, { name: "Ward One", epic: "core", layer: "rust", tests: 5 });
    await createWard(tmpDir, { name: "Ward Two", epic: "core", layer: "typescript", tests: 8 });

    const result = validateProject(tmpDir);
    assert.equal(result.valid, true, `Errors: ${result.errors.join(", ")}`);
  });
});

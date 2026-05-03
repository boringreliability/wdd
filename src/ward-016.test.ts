import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { updateWardStatus } from "./commands/ward-status.js";
import { completeWard } from "./commands/ward-complete.js";
import { reopenWard } from "./commands/ward-reopen.js";
import { assembleSession } from "./commands/session.js";
import { parseFrontmatter } from "./frontmatter.js";
import { inventoryExports } from "./commands/api.js";

const execFileAsync = promisify(execFile);
const CLI = path.join(import.meta.dirname, "cli.ts");

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeSrcFixture(dir: string, files: Record<string, string>): void {
  for (const [relPath, content] of Object.entries(files)) {
    const full = path.join(dir, "src", relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

async function run(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      "npx",
      ["tsx", CLI, ...args],
      { cwd, env: { ...process.env, NODE_NO_WARNINGS: "1" } }
    );
    return { stdout, stderr, code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

async function createCompletedWard(dir: string, name: string): Promise<number> {
  await createWard(dir, { name, epic: "core", layer: "typescript", tests: 1 });
  const num = fs
    .readdirSync(path.join(dir, ".wdd", "wards"))
    .filter((f) => /^ward-\d+\.md$/.test(f))
    .length;
  await updateWardStatus(dir, num, "red");
  await updateWardStatus(dir, num, "approved");
  await updateWardStatus(dir, num, "gold");
  await completeWard(dir, num);
  return num;
}

describe("Ward 016: inventoryExports", () => {
  beforeEach(() => {
    tmpDir = setup();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: scanner finds known exports across kinds
  it("api_inventory_finds_known_exports", () => {
    writeSrcFixture(tmpDir, {
      "utils/section.ts": `export function extractSection(body: string, heading: string): string {\n  return "";\n}\n`,
      "utils/ward-id.ts": `export function formatWardId(num: number): string {\n  return "";\n}\n\nexport function wardFilename(num: number): string {\n  return "";\n}\n`,
      "frontmatter.ts": `export interface ParsedDocument {\n  frontmatter: Record<string, unknown>;\n  body: string;\n}\n\nexport function parseFrontmatter(input: string): ParsedDocument {\n  return { frontmatter: {}, body: input };\n}\n`,
    });

    const inventory = inventoryExports(tmpDir);
    const allNames = inventory.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(allNames.includes("extractSection"), `Should find extractSection. Got: ${allNames.join(", ")}`);
    assert.ok(allNames.includes("formatWardId"), "Should find formatWardId");
    assert.ok(allNames.includes("wardFilename"), "Should find wardFilename");
    assert.ok(allNames.includes("ParsedDocument"), "Should find ParsedDocument interface");
    assert.ok(allNames.includes("parseFrontmatter"), "Should find parseFrontmatter");
  });

  // Test 2: test files excluded
  it("api_inventory_excludes_test_files", () => {
    writeSrcFixture(tmpDir, {
      "real.ts": `export function realThing(): void {}\n`,
      "thing.test.ts": `export function testHelperShouldNotAppear(): void {}\n`,
      "nested/another.test.ts": `export const HIDDEN = "x";\n`,
    });

    const inventory = inventoryExports(tmpDir);
    const allNames = inventory.flatMap((f) => f.exports.map((e) => e.name));
    const allFiles = inventory.map((f) => f.file);

    assert.ok(allNames.includes("realThing"), "Should include real export");
    assert.ok(
      !allNames.includes("testHelperShouldNotAppear"),
      `Should NOT include test exports. Got: ${allNames.join(", ")}`
    );
    assert.ok(!allNames.includes("HIDDEN"), "Should NOT include nested test exports");
    assert.ok(
      !allFiles.some((f) => f.includes(".test.ts")),
      `No .test.ts files in inventory. Got: ${allFiles.join(", ")}`
    );
  });

  // Test 3: kinds correctly categorized
  it("api_inventory_categorizes_kind", () => {
    writeSrcFixture(tmpDir, {
      "mixed.ts": `export function aFunc(): void {}\n\nexport async function asyncFunc(): Promise<void> {}\n\nexport interface AnInterface {\n  x: number;\n}\n\nexport type AType = string | number;\n\nexport const A_CONST = 42;\n\nexport class AClass {}\n`,
    });

    const inventory = inventoryExports(tmpDir);
    const exports = inventory[0]?.exports ?? [];
    const byName = new Map(exports.map((e) => [e.name, e.kind]));

    assert.equal(byName.get("aFunc"), "function");
    assert.equal(byName.get("asyncFunc"), "function");
    assert.equal(byName.get("AnInterface"), "interface");
    assert.equal(byName.get("AType"), "type");
    assert.equal(byName.get("A_CONST"), "const");
    assert.equal(byName.get("AClass"), "class");
  });

  // Test 4: filter by file pattern
  it("api_inventory_filter_by_file", () => {
    writeSrcFixture(tmpDir, {
      "utils/a.ts": `export function utilA(): void {}\n`,
      "utils/b.ts": `export function utilB(): void {}\n`,
      "commands/c.ts": `export function commandC(): void {}\n`,
    });

    const inventory = inventoryExports(tmpDir, { file: "utils/" });
    const allNames = inventory.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(allNames.includes("utilA"), "Should include utils/a.ts exports");
    assert.ok(allNames.includes("utilB"), "Should include utils/b.ts exports");
    assert.ok(
      !allNames.includes("commandC"),
      `Should NOT include commands/ exports when filtering for utils/. Got: ${allNames.join(", ")}`
    );
  });

  // Test 5: filter by kind
  it("api_inventory_filter_by_kind", () => {
    writeSrcFixture(tmpDir, {
      "mixed.ts": `export function f1(): void {}\nexport interface I1 { x: number; }\nexport const C1 = 1;\nexport type T1 = string;\n`,
    });

    const onlyFunctions = inventoryExports(tmpDir, { kind: "function" });
    const onlyFunctionNames = onlyFunctions.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(onlyFunctionNames.includes("f1"), "Should include functions");
    assert.ok(
      !onlyFunctionNames.includes("I1"),
      `Should NOT include interfaces when filtering for functions. Got: ${onlyFunctionNames.join(", ")}`
    );
    assert.ok(!onlyFunctionNames.includes("C1"), "Should NOT include consts");
    assert.ok(!onlyFunctionNames.includes("T1"), "Should NOT include types");
  });
});

describe("Ward 016: session integration", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "session-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 6: session output includes EXPORTS section
  it("session_includes_exports_section", () => {
    writeSrcFixture(tmpDir, {
      "utils/sample.ts": `export function sampleExport(): void {}\n`,
    });

    const output = assembleSession(tmpDir);

    assert.ok(
      output.includes("═══ EXPORTS ═══"),
      `Session output should contain EXPORTS section. Got: ${output.slice(0, 500)}`
    );
    assert.ok(
      output.includes("sampleExport"),
      "Session EXPORTS section should contain inventoried symbols"
    );
  });
});

describe("Ward 016: revision-aware command IDs", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "rev-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 7: completeWard accepts revision string
  it("complete_accepts_revision_string", async () => {
    const num = await createCompletedWard(tmpDir, "Original");
    await reopenWard(tmpDir, num, "needs fix");

    // Take ward-001b through TDD cycle to gold using string IDs
    await updateWardStatus(tmpDir, "1b", "red");
    await updateWardStatus(tmpDir, "1b", "approved");
    await updateWardStatus(tmpDir, "1b", "gold");

    // Now complete it via string id — this is what's being tested
    await completeWard(tmpDir, "1b");

    const fixContent = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001b.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(fixContent);
    assert.equal(frontmatter.status, "complete", "Fix ward should be complete");
    assert.ok(frontmatter.completed, "Fix ward should have completed date");
  });

  // Test 8: reopenWard accepts revision string (reopens a fix ward → creates ward-001c)
  it("reopen_accepts_revision_string", async () => {
    const num = await createCompletedWard(tmpDir, "Original");
    await reopenWard(tmpDir, num, "first fix");

    // Take 1b through complete
    await updateWardStatus(tmpDir, "1b", "red");
    await updateWardStatus(tmpDir, "1b", "approved");
    await updateWardStatus(tmpDir, "1b", "gold");
    await completeWard(tmpDir, "1b");

    // Now reopen 1b via string id — this should create ward-001c.md
    await reopenWard(tmpDir, "1b", "second fix");

    assert.ok(
      fs.existsSync(path.join(tmpDir, ".wdd", "wards", "ward-001c.md")),
      "Reopening 1b should create ward-001c.md"
    );
  });

  // Test 9: CLI ward status with revision id end-to-end
  it("cli_status_revision_id", async () => {
    await run(["init", "--name", "cli-rev"], tmpDir);
    await run(["ward", "create", "Original", "--epic", "core"], tmpDir);
    await run(["ward", "status", "1", "red"], tmpDir);
    await run(["ward", "status", "1", "approved"], tmpDir);
    await run(["ward", "status", "1", "gold"], tmpDir);
    await run(["complete", "1"], tmpDir);
    await run(["ward", "reopen", "1", "--reason", "needs work"], tmpDir);

    // The bug: this used to fail because parseInt("1b") = 1 and ward 1 is already complete.
    const result = await run(["ward", "status", "1b", "red"], tmpDir);
    assert.equal(result.code, 0, `wdd ward status 1b red should exit 0. stderr: ${result.stderr}`);

    const fixContent = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001b.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(fixContent);
    assert.equal(frontmatter.status, "red", "ward-001b status should be red after CLI transition");
  });

  // Test 10: reopen body has Manual Smoke Test section
  it("reopen_body_has_smoke_test_section", async () => {
    const num = await createCompletedWard(tmpDir, "Original");
    await reopenWard(tmpDir, num, "smoke parity check");

    const fixContent = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001b.md"),
      "utf-8"
    );
    const { body } = parseFrontmatter(fixContent);

    assert.ok(
      body.includes("## Manual Smoke Test"),
      `Fix-ward body should include Manual Smoke Test section. Got body: ${body.slice(0, 400)}`
    );
    assert.ok(body.includes("### Setup"), "Manual Smoke Test should include Setup");
    assert.ok(body.includes("### Steps"), "Manual Smoke Test should include Steps");
    assert.ok(body.includes("### Pass criteria"), "Manual Smoke Test should include Pass criteria");
  });
});

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { initProject } from "./commands/init.js";
import { bootstrapAdapter } from "./commands/bootstrap.js";

const execFileAsync = promisify(execFile);
const CLI = path.join(import.meta.dirname, "cli.ts");

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
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

describe("Ward 012: Bootstrap Command", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: creates skill directories with SKILL.md
  it("bootstrap_claude_creates_skills", async () => {
    await bootstrapAdapter(tmpDir, "claude");

    const skillsDir = path.join(tmpDir, ".claude", "skills");
    assert.ok(fs.existsSync(path.join(skillsDir, "wdd", "SKILL.md")), "wdd/SKILL.md should exist");
    assert.ok(fs.existsSync(path.join(skillsDir, "ward", "SKILL.md")), "ward/SKILL.md should exist");
    assert.ok(fs.existsSync(path.join(skillsDir, "ward-new", "SKILL.md")), "ward-new/SKILL.md should exist");
  });

  // Test 2: each skill has correct name in frontmatter matching directory
  it("bootstrap_claude_skill_names", async () => {
    await bootstrapAdapter(tmpDir, "claude");

    const skillsDir = path.join(tmpDir, ".claude", "skills");
    const wddContent = fs.readFileSync(path.join(skillsDir, "wdd", "SKILL.md"), "utf-8");
    const wardContent = fs.readFileSync(path.join(skillsDir, "ward", "SKILL.md"), "utf-8");
    const wardNewContent = fs.readFileSync(path.join(skillsDir, "ward-new", "SKILL.md"), "utf-8");

    assert.ok(wddContent.includes("name: wdd"), "wdd skill should have name: wdd");
    assert.ok(wardContent.includes("name: ward"), "ward skill should have name: ward");
    assert.ok(wardNewContent.includes("name: ward-new"), "ward-new skill should have name: ward-new");
  });

  // Test 3: wdd skill contains session context and CLI commands
  it("bootstrap_claude_wdd_content", async () => {
    await bootstrapAdapter(tmpDir, "claude");

    const content = fs.readFileSync(
      path.join(tmpDir, ".claude", "skills", "wdd", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("wdd session"), "Should mention wdd session");
    assert.ok(content.includes("STOP"), "Should mention checkpoints");
    assert.ok(content.includes("CLI Commands"), "Should have CLI reference");
  });

  // Test 4: creates .cursor/rules/wdd.mdc
  it("bootstrap_cursor_creates_file", async () => {
    await bootstrapAdapter(tmpDir, "cursor");

    const filePath = path.join(tmpDir, ".cursor", "rules", "wdd.mdc");
    assert.ok(fs.existsSync(filePath), ".cursor/rules/wdd.mdc should exist");

    const content = fs.readFileSync(filePath, "utf-8");
    assert.ok(content.includes("alwaysApply: true"), "Should have alwaysApply");
  });

  // Test 5: content includes project name from config
  it("bootstrap_reads_project_name", async () => {
    await bootstrapAdapter(tmpDir, "claude");

    const content = fs.readFileSync(
      path.join(tmpDir, ".claude", "skills", "wdd", "SKILL.md"),
      "utf-8"
    );
    assert.ok(content.includes("test-project"), "Should include project name");
  });

  // Test 6: removes old flat file format
  it("bootstrap_removes_old_format", async () => {
    // Create old format file
    const oldDir = path.join(tmpDir, ".claude", "skills");
    fs.mkdirSync(oldDir, { recursive: true });
    fs.writeFileSync(path.join(oldDir, "wdd.md"), "old content");

    await bootstrapAdapter(tmpDir, "claude");

    assert.ok(!fs.existsSync(path.join(oldDir, "wdd.md")), "Old wdd.md should be removed");
    assert.ok(fs.existsSync(path.join(oldDir, "wdd", "SKILL.md")), "New format should exist");
  });

  // Test 7: errors on unknown adapter
  it("bootstrap_unknown_adapter", async () => {
    await assert.rejects(
      () => bootstrapAdapter(tmpDir, "vscode"),
      (err: Error) => {
        assert.ok(err.message.includes("Unknown adapter"));
        return true;
      }
    );
  });

  // Test 8: CLI wiring
  it("bootstrap_cli", async () => {
    await run(["init", "--name", "cli-test"], tmpDir);
    const { code } = await run(["bootstrap", "claude"], tmpDir);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "skills", "wdd", "SKILL.md")));
  });
});

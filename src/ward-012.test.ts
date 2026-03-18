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

  // Test 1: creates .claude/skills/wdd.md
  it("bootstrap_claude_creates_file", async () => {
    await bootstrapAdapter(tmpDir, "claude");

    const filePath = path.join(tmpDir, ".claude", "skills", "wdd.md");
    assert.ok(fs.existsSync(filePath), ".claude/skills/wdd.md should exist");
  });

  // Test 2: claude file contains WDD content
  it("bootstrap_claude_content", async () => {
    await bootstrapAdapter(tmpDir, "claude");

    const content = fs.readFileSync(
      path.join(tmpDir, ".claude", "skills", "wdd.md"),
      "utf-8"
    );
    assert.ok(content.includes("wdd session"), "Should mention wdd session");
    assert.ok(content.includes("STOP"), "Should mention checkpoints");
    assert.ok(content.includes("name:"), "Should have skill frontmatter");
  });

  // Test 3: creates .cursor/rules/wdd.mdc
  it("bootstrap_cursor_creates_file", async () => {
    await bootstrapAdapter(tmpDir, "cursor");

    const filePath = path.join(tmpDir, ".cursor", "rules", "wdd.mdc");
    assert.ok(fs.existsSync(filePath), ".cursor/rules/wdd.mdc should exist");
  });

  // Test 4: cursor file has alwaysApply
  it("bootstrap_cursor_content", async () => {
    await bootstrapAdapter(tmpDir, "cursor");

    const content = fs.readFileSync(
      path.join(tmpDir, ".cursor", "rules", "wdd.mdc"),
      "utf-8"
    );
    assert.ok(content.includes("alwaysApply: true"), "Should have alwaysApply");
    assert.ok(content.includes("globs:"), "Should have globs");
  });

  // Test 5: content includes project name from config
  it("bootstrap_reads_project_name", async () => {
    await bootstrapAdapter(tmpDir, "claude");

    const content = fs.readFileSync(
      path.join(tmpDir, ".claude", "skills", "wdd.md"),
      "utf-8"
    );
    assert.ok(content.includes("test-project"), "Should include project name");
  });

  // Test 6: creates directories if missing
  it("bootstrap_creates_directories", async () => {
    // .claude/ doesn't exist yet
    assert.ok(!fs.existsSync(path.join(tmpDir, ".claude")));

    await bootstrapAdapter(tmpDir, "claude");

    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "skills")));
  });

  // Test 7: errors on unknown adapter
  it("bootstrap_unknown_adapter", async () => {
    await assert.rejects(
      () => bootstrapAdapter(tmpDir, "vscode"),
      (err: Error) => {
        assert.ok(
          err.message.includes("Unknown adapter"),
          `Should mention unknown adapter: ${err.message}`
        );
        return true;
      }
    );
  });

  // Test 8: CLI wiring
  it("bootstrap_cli", async () => {
    await run(["init", "--name", "cli-test"], tmpDir);
    const { code } = await run(["bootstrap", "claude"], tmpDir);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, ".claude", "skills", "wdd.md")));
  });
});

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseFrontmatter } from "./frontmatter.js";

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
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.code ?? 1,
    };
  }
}

describe("Ward 006: CLI Wiring", () => {
  beforeEach(() => {
    tmpDir = setup();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: wdd init
  it("cli_init", async () => {
    const { code, stdout } = await run(["init", "--name", "myproject"], tmpDir);
    assert.equal(code, 0, `Expected exit 0, stderr might help debug`);
    assert.ok(fs.existsSync(path.join(tmpDir, ".wdd", "PROJECT.md")));
  });

  // Test 2: wdd ward create
  it("cli_ward_create", async () => {
    await run(["init", "--name", "test"], tmpDir);
    const { code } = await run(
      ["ward", "create", "My Ward", "--epic", "core"],
      tmpDir
    );
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, ".wdd", "wards", "ward-001.md")));
  });

  // Test 3: wdd ward status
  it("cli_ward_status", async () => {
    await run(["init", "--name", "test"], tmpDir);
    await run(["ward", "create", "My Ward", "--epic", "core"], tmpDir);
    const { code } = await run(["ward", "status", "1", "red"], tmpDir);
    assert.equal(code, 0);

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.status, "red");
  });

  // Test 4: wdd ward reopen
  it("cli_ward_reopen", async () => {
    await run(["init", "--name", "test"], tmpDir);
    await run(["ward", "create", "My Ward", "--epic", "core"], tmpDir);
    await run(["ward", "status", "1", "red"], tmpDir);
    await run(["ward", "status", "1", "approved"], tmpDir);
    await run(["ward", "status", "1", "gold"], tmpDir);
    await run(["ward", "status", "1", "complete"], tmpDir);

    const { code } = await run(
      ["ward", "reopen", "1", "--reason", "boundary bug"],
      tmpDir
    );
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, ".wdd", "wards", "ward-001b.md")));
  });

  // Test 5: wdd complete
  it("cli_complete", async () => {
    await run(["init", "--name", "test"], tmpDir);
    await run(["ward", "create", "My Ward", "--epic", "core"], tmpDir);
    await run(["ward", "status", "1", "red"], tmpDir);
    await run(["ward", "status", "1", "approved"], tmpDir);
    await run(["ward", "status", "1", "gold"], tmpDir);

    const { code } = await run(["complete", "1"], tmpDir);
    assert.equal(code, 0);

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "ward-001.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.status, "complete");
  });

  // Test 6: unknown command exits 1
  it("cli_unknown_command", async () => {
    const { code } = await run(["bogus"], tmpDir);
    assert.equal(code, 1);
  });

  // Test 7: --help exits 0
  it("cli_help", async () => {
    const { code, stdout } = await run(["--help"], tmpDir);
    assert.equal(code, 0);
    assert.ok(stdout.includes("wdd"), "Help should mention wdd");
  });

  // Test 8: ward unknown subcommand exits 1
  it("cli_ward_unknown_sub", async () => {
    await run(["init", "--name", "test"], tmpDir);
    const { code } = await run(["ward", "bogus"], tmpDir);
    assert.equal(code, 1);
  });
});

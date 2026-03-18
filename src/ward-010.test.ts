import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { initProject } from "./commands/init.js";
import { createEpic } from "./commands/epic-create.js";
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
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

describe("Ward 010: Epic Create Command", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: creates 01-core.md when no epics exist
  it("create_epic_first", async () => {
    await createEpic(tmpDir, { name: "Core Engine", slug: "core" });

    const epicPath = path.join(tmpDir, ".wdd", "epics", "01-core.md");
    assert.ok(fs.existsSync(epicPath), "01-core.md should exist");
  });

  // Test 2: creates 02-ui.md when 01 exists
  it("create_epic_sequential", async () => {
    await createEpic(tmpDir, { name: "Core", slug: "core" });
    await createEpic(tmpDir, { name: "UI Layer", slug: "ui" });

    const epicPath = path.join(tmpDir, ".wdd", "epics", "02-ui.md");
    assert.ok(fs.existsSync(epicPath), "02-ui.md should exist");
  });

  // Test 3: frontmatter has correct values
  it("create_epic_frontmatter", async () => {
    await createEpic(tmpDir, { name: "Rendering Pipeline", slug: "rendering" });

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "epics", "01-rendering.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(content);

    assert.equal(frontmatter.epic, "rendering");
    assert.equal(frontmatter.name, "Rendering Pipeline");
    assert.equal(frontmatter.number, 1);
    assert.equal(frontmatter.status, "active");
  });

  // Test 4: body contains epic name in heading
  it("create_epic_body", async () => {
    await createEpic(tmpDir, { name: "Hit Testing", slug: "hit-test" });

    const content = fs.readFileSync(
      path.join(tmpDir, ".wdd", "epics", "01-hit-test.md"),
      "utf-8"
    );
    const { body } = parseFrontmatter(content);

    assert.ok(body.includes("Hit Testing"), "Body should contain epic name");
  });

  // Test 5: errors when no name
  it("create_epic_requires_name", async () => {
    await assert.rejects(
      () => createEpic(tmpDir, { name: "", slug: "core" }),
      (err: Error) => {
        assert.ok(err.message.includes("name"), `Should mention name: ${err.message}`);
        return true;
      }
    );
  });

  // Test 6: errors when no slug
  it("create_epic_requires_slug", async () => {
    await assert.rejects(
      () => createEpic(tmpDir, { name: "Core", slug: "" }),
      (err: Error) => {
        assert.ok(err.message.includes("slug"), `Should mention slug: ${err.message}`);
        return true;
      }
    );
  });

  // Test 7: CLI wiring works
  it("create_epic_cli", async () => {
    await run(["init", "--name", "test"], tmpDir);
    const { code } = await run(
      ["epic", "create", "My Epic", "--slug", "my-epic"],
      tmpDir
    );
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, ".wdd", "epics", "01-my-epic.md")));
  });
});

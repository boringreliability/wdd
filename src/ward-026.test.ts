import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { bootstrapAdapter } from "./commands/bootstrap.js";
import {
  getCopilotAdapter,
  getClaudeSkills,
} from "./templates/adapter-content.js";
import { parseFrontmatter } from "./frontmatter.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-ward026-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("Ward 026: WDD Copilot Adapter", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-copilot" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: instructions file exists, NO frontmatter
  it("bootstrap_copilot_creates_instructions_file", async () => {
    await bootstrapAdapter(tmpDir, "copilot");
    const instructionsPath = path.join(tmpDir, ".github", "copilot-instructions.md");
    assert.ok(fs.existsSync(instructionsPath), "copilot-instructions.md should exist");

    const content = fs.readFileSync(instructionsPath, "utf-8");
    assert.ok(
      content.includes("test-copilot"),
      "Should include the project name"
    );
    assert.ok(
      !content.startsWith("---"),
      "Instructions file MUST NOT have YAML frontmatter (Microsoft spec)"
    );
  });

  // Test 2: three prompt files with description frontmatter
  it("bootstrap_copilot_creates_three_prompt_files", async () => {
    await bootstrapAdapter(tmpDir, "copilot");
    const promptsDir = path.join(tmpDir, ".github", "prompts");
    const expected = ["wdd.prompt.md", "ward.prompt.md", "ward-new.prompt.md"];

    for (const file of expected) {
      const filePath = path.join(promptsDir, file);
      assert.ok(fs.existsSync(filePath), `${file} should exist`);
      const content = fs.readFileSync(filePath, "utf-8");
      assert.ok(
        content.startsWith("---\n"),
        `${file} should start with YAML frontmatter`
      );
      const { frontmatter } = parseFrontmatter(content);
      assert.ok(
        typeof frontmatter.description === "string" && frontmatter.description.length > 0,
        `${file} should have a non-empty description field`
      );
    }
  });

  // Test 3: agent file exists with description frontmatter and discipline content
  it("bootstrap_copilot_creates_agent_file", async () => {
    await bootstrapAdapter(tmpDir, "copilot");
    const agentPath = path.join(tmpDir, ".github", "agents", "wdd.agent.md");
    assert.ok(fs.existsSync(agentPath), "wdd.agent.md should exist");

    const content = fs.readFileSync(agentPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    assert.ok(
      typeof frontmatter.description === "string",
      "Agent should have description frontmatter"
    );
    assert.ok(
      body.includes("Ward Lifecycle") || body.includes("Checkpoint"),
      "Agent body should reference Ward Lifecycle discipline"
    );
    assert.ok(
      body.includes("STOP") || body.includes("approval"),
      "Agent body should reference halt-at-gates discipline"
    );
  });

  // Test 4: instructions includes shared content + projectName substitution
  it("instructions_includes_shared_content", async () => {
    await bootstrapAdapter(tmpDir, "copilot");
    const instructionsPath = path.join(tmpDir, ".github", "copilot-instructions.md");
    const content = fs.readFileSync(instructionsPath, "utf-8");

    assert.ok(
      content.includes("Ward Lifecycle"),
      "Should include the Ward Lifecycle header from shared content"
    );
    assert.ok(
      content.includes("**test-copilot**"),
      "Should have substituted the project name into the brief"
    );
    assert.ok(
      content.includes("wdd session"),
      "Should reference wdd session command"
    );
  });

  // Test 5: prompt bodies match Claude skill bodies (semantic check)
  it("prompt_bodies_match_claude_skills", () => {
    const copilot = getCopilotAdapter("test-copilot");
    const claude = getClaudeSkills("test-copilot");

    const wddPrompt = copilot.find((f) => f.path.endsWith("wdd.prompt.md"));
    const wardPrompt = copilot.find((f) => f.path.endsWith("ward.prompt.md"));
    const wardNewPrompt = copilot.find((f) => f.path.endsWith("ward-new.prompt.md"));

    assert.ok(wddPrompt && wardPrompt && wardNewPrompt, "All three prompt files emitted");

    const wddSkillBody = parseFrontmatter(claude[0].content).body;
    const wardSkillBody = parseFrontmatter(claude[1].content).body;
    const wardNewSkillBody = parseFrontmatter(claude[2].content).body;

    // Pick sentinel phrases that must survive the body reuse.
    assert.ok(
      parseFrontmatter(wddPrompt!.content).body.includes("Run `wdd session`"),
      "wdd.prompt.md body should keep the 'Run wdd session' directive from skill"
    );
    assert.ok(
      parseFrontmatter(wardPrompt!.content).body.includes("STOP"),
      "ward.prompt.md body should keep the STOP checkpoint discipline"
    );
    assert.ok(
      parseFrontmatter(wardNewPrompt!.content).body.includes("Manual Smoke Test"),
      "ward-new.prompt.md body should require the Manual Smoke Test section"
    );

    // And verify the skill bodies actually contained those sentinels too —
    // proving we're testing real shared content, not coincidence.
    assert.ok(wddSkillBody.includes("Run `wdd session`"));
    assert.ok(wardSkillBody.includes("STOP"));
    assert.ok(wardNewSkillBody.includes("Manual Smoke Test"));
  });

  // Test 6: every file with frontmatter has valid parseable YAML
  it("frontmatter_parses_as_valid_yaml", async () => {
    await bootstrapAdapter(tmpDir, "copilot");
    const filesWithFrontmatter = [
      path.join(tmpDir, ".github", "prompts", "wdd.prompt.md"),
      path.join(tmpDir, ".github", "prompts", "ward.prompt.md"),
      path.join(tmpDir, ".github", "prompts", "ward-new.prompt.md"),
      path.join(tmpDir, ".github", "agents", "wdd.agent.md"),
    ];

    for (const file of filesWithFrontmatter) {
      const content = fs.readFileSync(file, "utf-8");
      const parsed = parseFrontmatter(content);
      assert.ok(
        Object.keys(parsed.frontmatter).length > 0,
        `${path.basename(file)} frontmatter should parse and be non-empty`
      );
      assert.equal(
        typeof parsed.frontmatter.description,
        "string",
        `${path.basename(file)} should have string description field`
      );
    }
  });

  // Test 7: unknown adapter error still works AND lists copilot
  it("unknown_adapter_still_errors", async () => {
    await assert.rejects(
      async () => bootstrapAdapter(tmpDir, "vim"),
      (err: Error) => {
        assert.ok(err.message.includes("vim"), "Error mentions the bad name");
        assert.ok(
          err.message.includes("copilot"),
          "Error message must list copilot as an available adapter"
        );
        assert.ok(
          err.message.includes("claude") && err.message.includes("cursor"),
          "Error should also list claude and cursor"
        );
        return true;
      }
    );
  });
});

describe("Ward 026: idempotency", () => {
  // Test 8 (bonus): running bootstrap twice produces identical files
  it("bootstrap_copilot_is_idempotent", async () => {
    const dir = setup();
    try {
      await initProject(dir, { name: "idempotent-test" });
      await bootstrapAdapter(dir, "copilot");

      const collect = (): Record<string, string> => {
        const files: Record<string, string> = {};
        const githubDir = path.join(dir, ".github");
        const walk = (p: string): void => {
          for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
            const full = path.join(p, entry.name);
            if (entry.isDirectory()) walk(full);
            else files[path.relative(dir, full)] = fs.readFileSync(full, "utf-8");
          }
        };
        walk(githubDir);
        return files;
      };

      const first = collect();
      await bootstrapAdapter(dir, "copilot");
      const second = collect();

      assert.deepEqual(second, first, "Second bootstrap must yield identical files");
    } finally {
      cleanup(dir);
    }
  });
});

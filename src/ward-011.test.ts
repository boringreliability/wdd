import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSharedContent,
  getClaudeSkills,
  getCursorRule,
} from "./templates/adapter-content.js";

describe("Ward 011: WDD Skill Content", () => {
  // Test 1: shared content mentions wdd session
  it("content_has_session", () => {
    const content = getSharedContent("test-project");
    assert.ok(
      content.includes("wdd session"),
      "Content should mention wdd session"
    );
  });

  // Test 2: shared content mentions stopping for approval
  it("content_has_checkpoints", () => {
    const content = getSharedContent("test-project");
    assert.ok(
      content.includes("STOP") || content.includes("stop"),
      "Content should mention stopping"
    );
    assert.ok(
      content.includes("approved") || content.includes("approval"),
      "Content should mention approval"
    );
  });

  // Test 3: shared content lists core CLI commands
  it("content_has_cli_commands", () => {
    const content = getSharedContent("test-project");
    const commands = [
      "wdd init",
      "wdd ward create",
      "wdd ward status",
      "wdd complete",
      "wdd validate",
      "wdd session",
    ];
    for (const cmd of commands) {
      assert.ok(
        content.includes(cmd),
        `Content should mention ${cmd}`
      );
    }
  });

  // Test 4: each Claude skill file has correct frontmatter
  it("claude_skill_format", () => {
    const skills = getClaudeSkills("my-project");
    assert.ok(skills.length > 0, "Should produce at least one skill");

    for (const skill of skills) {
      assert.ok(
        skill.content.startsWith("---"),
        `${skill.dir}: Should start with frontmatter`
      );
      assert.ok(
        skill.content.includes("name:"),
        `${skill.dir}: Should have name field`
      );
      assert.ok(
        skill.content.includes("description:"),
        `${skill.dir}: Should have description field`
      );
    }

    // Project name should be injected somewhere across the skill set
    const combined = skills.map((s) => s.content).join("\n");
    assert.ok(
      combined.includes("my-project"),
      "Skill content should contain project name"
    );
  });

  // Test 5: Cursor rule has globs and alwaysApply
  it("cursor_rule_format", () => {
    const rule = getCursorRule("my-project");
    assert.ok(rule.startsWith("---"), "Should start with frontmatter");
    assert.ok(rule.includes("globs:"), "Should have globs field");
    assert.ok(rule.includes("alwaysApply: true"), "Should have alwaysApply");
  });

  // Test 6: project name injected into shared content
  it("content_has_project_name", () => {
    const content = getSharedContent("kmd-regelsim");
    assert.ok(
      content.includes("kmd-regelsim"),
      "Content should include project name"
    );
  });
});

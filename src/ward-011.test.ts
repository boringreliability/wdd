import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getSkillContent,
  getClaudeSkill,
  getCursorRule,
} from "./templates/adapter-content.js";

describe("Ward 011: WDD Skill Content", () => {
  // Test 1: content mentions wdd session
  it("content_has_session", () => {
    const content = getSkillContent("test-project");
    assert.ok(
      content.includes("wdd session"),
      "Content should mention wdd session"
    );
  });

  // Test 2: content mentions stopping for approval
  it("content_has_checkpoints", () => {
    const content = getSkillContent("test-project");
    assert.ok(
      content.includes("STOP") || content.includes("stop"),
      "Content should mention stopping"
    );
    assert.ok(
      content.includes("approved") || content.includes("approval"),
      "Content should mention approval"
    );
  });

  // Test 3: content lists core CLI commands
  it("content_has_cli_commands", () => {
    const content = getSkillContent("test-project");
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

  // Test 4: Claude skill has correct frontmatter
  it("claude_skill_format", () => {
    const skill = getClaudeSkill("my-project");
    assert.ok(skill.startsWith("---"), "Should start with frontmatter");
    assert.ok(skill.includes("name:"), "Should have name field");
    assert.ok(skill.includes("description:"), "Should have description field");
    assert.ok(skill.includes("my-project"), "Should contain project name");
  });

  // Test 5: Cursor rule has globs and alwaysApply
  it("cursor_rule_format", () => {
    const rule = getCursorRule("my-project");
    assert.ok(rule.startsWith("---"), "Should start with frontmatter");
    assert.ok(rule.includes("globs:"), "Should have globs field");
    assert.ok(rule.includes("alwaysApply: true"), "Should have alwaysApply");
  });

  // Test 6: project name injected
  it("content_has_project_name", () => {
    const content = getSkillContent("kmd-regelsim");
    assert.ok(
      content.includes("kmd-regelsim"),
      "Content should include project name"
    );
  });
});

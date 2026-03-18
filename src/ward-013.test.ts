import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getClaudeSkill, getCursorRule } from "./templates/adapter-content.js";

describe("Ward 013: Skill Commands", () => {
  const skill = getClaudeSkill("test-project");

  // Test 1: /wdd command exists
  it("skill_has_wdd_command", () => {
    assert.ok(
      skill.includes("### /wdd"),
      "Claude skill should have /wdd command section"
    );
  });

  // Test 2: /ward command exists
  it("skill_has_ward_command", () => {
    assert.ok(
      skill.includes("### /ward\n") || skill.includes("### /ward "),
      "Claude skill should have /ward command section"
    );
  });

  // Test 3: /ward-new command exists
  it("skill_has_ward_new_command", () => {
    assert.ok(
      skill.includes("### /ward-new"),
      "Claude skill should have /ward-new command section"
    );
  });

  // Test 4: /wdd mentions wdd session
  it("wdd_command_runs_session", () => {
    const wddSection = extractSection(skill, "/wdd");
    assert.ok(
      wddSection.includes("wdd session"),
      `/wdd should mention wdd session`
    );
  });

  // Test 5: /ward covers all statuses
  it("ward_command_has_states", () => {
    const wardSection = extractSection(skill, "/ward");
    const states = ["planned", "red", "approved", "gold", "complete"];
    for (const state of states) {
      assert.ok(
        wardSection.includes(state),
        `/ward should mention ${state} status`
      );
    }
  });

  // Test 6: /ward has STOP checkpoints
  it("ward_command_has_checkpoints", () => {
    const wardSection = extractSection(skill, "/ward");
    assert.ok(
      wardSection.includes("STOP"),
      `/ward should have STOP checkpoints`
    );
    assert.ok(
      wardSection.includes("approval") || wardSection.includes("approved"),
      `/ward should mention waiting for approval`
    );
  });

  // Test 7: /ward-new asks for name and epic
  it("ward_new_asks_name", () => {
    const newSection = extractSection(skill, "/ward-new");
    assert.ok(
      newSection.includes("name"),
      `/ward-new should ask for ward name`
    );
    assert.ok(
      newSection.includes("epic"),
      `/ward-new should ask for epic`
    );
  });

  // Test 8: /ward-new includes writing tests and stopping
  it("ward_new_writes_tests", () => {
    const newSection = extractSection(skill, "/ward-new");
    assert.ok(
      newSection.includes("test"),
      `/ward-new should mention writing tests`
    );
    assert.ok(
      newSection.includes("STOP"),
      `/ward-new should have STOP checkpoint`
    );
  });
});

/**
 * Extract content between a ### heading and the next ### heading.
 */
function extractSection(content: string, heading: string): string {
  const pattern = `### ${heading}`;
  const startIdx = content.indexOf(pattern);
  if (startIdx === -1) return "";

  const afterHeading = content.slice(startIdx + pattern.length);
  const nextHeading = afterHeading.indexOf("\n### ");
  if (nextHeading === -1) return afterHeading;
  return afterHeading.slice(0, nextHeading);
}

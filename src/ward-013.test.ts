import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getClaudeSkills } from "./templates/adapter-content.js";

describe("Ward 013: Skill Commands", () => {
  const skills = getClaudeSkills("test-project");

  function findSkill(dir: string) {
    const skill = skills.find((s) => s.dir === dir);
    assert.ok(skill, `Expected skill with dir "${dir}" to exist`);
    return skill!;
  }

  // Test 1: /wdd skill exists
  it("skill_has_wdd_command", () => {
    const wdd = findSkill("wdd");
    assert.ok(wdd.content.length > 0, "/wdd skill should have content");
  });

  // Test 2: /ward skill exists
  it("skill_has_ward_command", () => {
    const ward = findSkill("ward");
    assert.ok(ward.content.length > 0, "/ward skill should have content");
  });

  // Test 3: /ward-new skill exists
  it("skill_has_ward_new_command", () => {
    const wardNew = findSkill("ward-new");
    assert.ok(wardNew.content.length > 0, "/ward-new skill should have content");
  });

  // Test 4: /wdd mentions wdd session
  it("wdd_command_runs_session", () => {
    const wdd = findSkill("wdd");
    assert.ok(
      wdd.content.includes("wdd session"),
      "/wdd skill should mention wdd session"
    );
  });

  // Test 5: /ward covers all statuses
  it("ward_command_has_states", () => {
    const ward = findSkill("ward");
    const states = ["planned", "red", "approved", "gold", "complete"];
    for (const state of states) {
      assert.ok(
        ward.content.includes(state),
        `/ward should mention ${state} status`
      );
    }
  });

  // Test 6: /ward has STOP checkpoints
  it("ward_command_has_checkpoints", () => {
    const ward = findSkill("ward");
    assert.ok(
      ward.content.includes("STOP"),
      "/ward should have STOP checkpoints"
    );
    assert.ok(
      ward.content.includes("approval") || ward.content.includes("approved"),
      "/ward should mention waiting for approval"
    );
  });

  // Test 7: /ward-new asks for name and epic
  it("ward_new_asks_name", () => {
    const wardNew = findSkill("ward-new");
    assert.ok(
      wardNew.content.toLowerCase().includes("name"),
      "/ward-new should ask for ward name"
    );
    assert.ok(
      wardNew.content.toLowerCase().includes("epic"),
      "/ward-new should ask for epic"
    );
  });

  // Test 8: /ward-new includes writing tests and stopping
  it("ward_new_writes_tests", () => {
    const wardNew = findSkill("ward-new");
    assert.ok(
      wardNew.content.toLowerCase().includes("test"),
      "/ward-new should mention writing tests"
    );
    assert.ok(
      wardNew.content.includes("STOP"),
      "/ward-new should have STOP checkpoint"
    );
  });
});

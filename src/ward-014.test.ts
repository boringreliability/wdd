import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { bootstrapAdapter } from "./commands/bootstrap.js";
import { validateEvals } from "./commands/eval.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function readEvalsJson(dir: string, skillName: string): unknown {
  const filePath = path.join(dir, ".claude", "skills", skillName, "evals", "evals.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

describe("Ward 014: Skill Evals", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "test-project" });
    await bootstrapAdapter(tmpDir, "claude");
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: evals/evals.json created in wdd/ skill
  it("eval_wdd_file_exists", () => {
    const filePath = path.join(tmpDir, ".claude", "skills", "wdd", "evals", "evals.json");
    assert.ok(fs.existsSync(filePath), "wdd/evals/evals.json should exist");
  });

  // Test 2: evals/evals.json created in ward/ skill
  it("eval_ward_file_exists", () => {
    const filePath = path.join(tmpDir, ".claude", "skills", "ward", "evals", "evals.json");
    assert.ok(fs.existsSync(filePath), "ward/evals/evals.json should exist");
  });

  // Test 3: evals/evals.json created in ward-new/ skill
  it("eval_ward_new_file_exists", () => {
    const filePath = path.join(tmpDir, ".claude", "skills", "ward-new", "evals", "evals.json");
    assert.ok(fs.existsSync(filePath), "ward-new/evals/evals.json should exist");
  });

  // Test 4: each evals.json has valid structure
  it("eval_valid_structure", () => {
    for (const skillName of ["wdd", "ward", "ward-new"]) {
      const data = readEvalsJson(tmpDir, skillName) as {
        skill_name: string;
        evals: Array<{ id: number; prompt: string; expected_output: string }>;
      };

      assert.equal(data.skill_name, skillName, `${skillName}: skill_name should match`);
      assert.ok(Array.isArray(data.evals), `${skillName}: evals should be array`);
      assert.ok(data.evals.length >= 1, `${skillName}: should have at least 1 eval`);

      for (const eval_ of data.evals) {
        assert.ok(typeof eval_.id === "number", `${skillName}: eval id should be number`);
        assert.ok(typeof eval_.prompt === "string" && eval_.prompt.length > 0, `${skillName}: eval prompt required`);
        assert.ok(typeof eval_.expected_output === "string" && eval_.expected_output.length > 0, `${skillName}: expected_output required`);
      }
    }
  });

  // Test 5: each eval has at least one assertion
  it("eval_assertions_present", () => {
    for (const skillName of ["wdd", "ward", "ward-new"]) {
      const data = readEvalsJson(tmpDir, skillName) as {
        evals: Array<{ assertions: string[] }>;
      };

      for (const eval_ of data.evals) {
        assert.ok(
          Array.isArray(eval_.assertions) && eval_.assertions.length >= 1,
          `${skillName}: each eval should have at least one assertion`
        );
      }
    }
  });

  // Test 6: wdd eval validates successfully
  it("eval_validate_command", () => {
    const result = validateEvals(tmpDir);
    assert.equal(result.valid, true, `Errors: ${result.errors.join(", ")}`);
    assert.equal(result.skills.length, 3, "Should validate 3 skills");
  });
});

describe("Ward 014: Eval Validator — Error Paths", () => {
  beforeEach(() => {
    tmpDir = setup();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 7: missing .claude/skills/ directory
  it("validate_fails_missing_skills_dir", () => {
    const result = validateEvals(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("skills")),
      `Should report missing skills dir: ${result.errors}`
    );
  });

  // Test 8: skill directory exists but evals/evals.json is missing
  it("validate_fails_missing_evals_file", () => {
    const skillDir = path.join(tmpDir, ".claude", "skills", "wdd");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# wdd");

    const result = validateEvals(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("missing evals/evals.json")),
      `Should report missing evals file: ${result.errors}`
    );
  });

  // Test 9: evals.json is malformed
  it("validate_fails_malformed_json", () => {
    const evalsDir = path.join(tmpDir, ".claude", "skills", "wdd", "evals");
    fs.mkdirSync(evalsDir, { recursive: true });
    fs.writeFileSync(path.join(evalsDir, "evals.json"), "{ not valid json");

    const result = validateEvals(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("not valid JSON")),
      `Should report JSON parse error: ${result.errors}`
    );
  });

  // Test 10: skill_name doesn't match directory name
  it("validate_fails_skill_name_mismatch", () => {
    const evalsDir = path.join(tmpDir, ".claude", "skills", "wdd", "evals");
    fs.mkdirSync(evalsDir, { recursive: true });
    fs.writeFileSync(
      path.join(evalsDir, "evals.json"),
      JSON.stringify({
        skill_name: "wrong-name",
        evals: [
          { id: 1, prompt: "test", expected_output: "test", assertions: ["a"] },
        ],
      })
    );

    const result = validateEvals(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("does not match")),
      `Should report skill_name mismatch: ${result.errors}`
    );
  });

  // Test 11: evals array is empty
  it("validate_fails_empty_evals", () => {
    const evalsDir = path.join(tmpDir, ".claude", "skills", "wdd", "evals");
    fs.mkdirSync(evalsDir, { recursive: true });
    fs.writeFileSync(
      path.join(evalsDir, "evals.json"),
      JSON.stringify({ skill_name: "wdd", evals: [] })
    );

    const result = validateEvals(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("empty")),
      `Should report empty evals array: ${result.errors}`
    );
  });

  // Test 12: eval is missing assertions
  it("validate_fails_missing_assertions", () => {
    const evalsDir = path.join(tmpDir, ".claude", "skills", "wdd", "evals");
    fs.mkdirSync(evalsDir, { recursive: true });
    fs.writeFileSync(
      path.join(evalsDir, "evals.json"),
      JSON.stringify({
        skill_name: "wdd",
        evals: [
          { id: 1, prompt: "test", expected_output: "test", assertions: [] },
        ],
      })
    );

    const result = validateEvals(tmpDir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => e.includes("assertion")),
      `Should report missing assertions: ${result.errors}`
    );
  });
});

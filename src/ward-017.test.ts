import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import {
  upgradeProject,
  CURRENT_SCHEMA_VERSION,
} from "./commands/upgrade.js";
import { readConfig } from "./utils/config.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function setConfigVersion(dir: string, version: string | null): void {
  const configPath = path.join(dir, ".wdd", "config.json");
  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (version === null) {
    delete raw.wdd_version;
  } else {
    raw.wdd_version = version;
  }
  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2));
}

function readConfigVersion(dir: string): string | undefined {
  return readConfig(dir)?.wdd_version;
}

describe("Ward 017: upgrade orchestrator", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "upgrade-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: noop when already at current schema
  it("upgrade_noop_at_current", () => {
    setConfigVersion(tmpDir, CURRENT_SCHEMA_VERSION);

    const result = upgradeProject(tmpDir, { dryRun: false });

    assert.equal(result.fromVersion, CURRENT_SCHEMA_VERSION);
    assert.equal(result.toVersion, CURRENT_SCHEMA_VERSION);
    assert.equal(result.migrations.length, 0, "Should have no migrations when already at current");
  });

  // Test 2: template refreshed with current WARD_BODY_TEMPLATE (which includes Manual Smoke Test)
  it("upgrade_1_0_to_1_1_refreshes_template", () => {
    setConfigVersion(tmpDir, "1.0");

    // Corrupt the template to simulate the older schema (no Manual Smoke Test)
    const templatePath = path.join(tmpDir, ".wdd", "templates", "ward.md");
    fs.writeFileSync(templatePath, "# Ward {NNN}: {Name}\n\n## Scope\n{Old style}\n");
    assert.ok(
      !fs.readFileSync(templatePath, "utf-8").includes("Manual Smoke Test"),
      "Pre-condition: template should NOT have Manual Smoke Test"
    );

    upgradeProject(tmpDir, { dryRun: false });

    const refreshed = fs.readFileSync(templatePath, "utf-8");
    assert.ok(
      refreshed.includes("## Manual Smoke Test"),
      `Template should be refreshed with current sections. Got: ${refreshed.slice(0, 200)}`
    );
    assert.ok(refreshed.includes("### Setup"), "Refreshed template should include Setup");
    assert.ok(refreshed.includes("### Pass criteria"), "Refreshed template should include Pass criteria");
  });

  // Test 3: missing required directories are created
  it("upgrade_1_0_to_1_1_ensures_dirs", () => {
    setConfigVersion(tmpDir, "1.0");

    const snapshotsDir = path.join(tmpDir, ".wdd", "memory", "snapshots");
    fs.rmSync(snapshotsDir, { recursive: true, force: true });
    assert.ok(!fs.existsSync(snapshotsDir), "Pre-condition: snapshots dir removed");

    upgradeProject(tmpDir, { dryRun: false });

    assert.ok(fs.existsSync(snapshotsDir), "Migration should re-create memory/snapshots/");
    assert.ok(
      fs.statSync(snapshotsDir).isDirectory(),
      "Re-created path should be a directory"
    );
  });

  // Test 4: user content (PROJECT.md, CONTEXT.md, ward files) NOT modified
  it("upgrade_1_0_to_1_1_preserves_user_content", () => {
    setConfigVersion(tmpDir, "1.0");

    // Plant unique markers in user-owned files
    const projectPath = path.join(tmpDir, ".wdd", "PROJECT.md");
    const contextPath = path.join(tmpDir, ".wdd", "CONTEXT.md");
    const wardPath = path.join(tmpDir, ".wdd", "wards", "ward-001.md");

    fs.writeFileSync(projectPath, "# Custom Project\n\nUSER_PROJECT_MARKER");
    fs.writeFileSync(contextPath, "# Custom Context\n\nUSER_CONTEXT_MARKER");
    fs.writeFileSync(
      wardPath,
      `---\nward: 1\nrevision: null\nname: "User Ward"\nepic: core\nstatus: planned\ndependencies: []\nlayer: typescript\nestimated_tests: 0\ncreated: "2026-01-01"\ncompleted: null\n---\n# Ward 001\n\nUSER_WARD_MARKER\n`
    );

    upgradeProject(tmpDir, { dryRun: false });

    assert.ok(
      fs.readFileSync(projectPath, "utf-8").includes("USER_PROJECT_MARKER"),
      "PROJECT.md must be untouched"
    );
    assert.ok(
      fs.readFileSync(contextPath, "utf-8").includes("USER_CONTEXT_MARKER"),
      "CONTEXT.md must be untouched"
    );
    assert.ok(
      fs.readFileSync(wardPath, "utf-8").includes("USER_WARD_MARKER"),
      "Existing ward file must be untouched"
    );
  });

  // Test 5: config.json wdd_version bumped
  it("upgrade_1_0_to_1_1_bumps_version", () => {
    setConfigVersion(tmpDir, "1.0");
    assert.equal(readConfigVersion(tmpDir), "1.0", "Pre-condition");

    upgradeProject(tmpDir, { dryRun: false });

    assert.equal(
      readConfigVersion(tmpDir),
      CURRENT_SCHEMA_VERSION,
      "Version should be bumped to current"
    );
  });

  // Test 6: --dry-run returns steps but writes nothing
  it("upgrade_dry_run_no_changes", () => {
    setConfigVersion(tmpDir, "1.0");

    // Corrupt template; record bytes
    const templatePath = path.join(tmpDir, ".wdd", "templates", "ward.md");
    const corrupted = "# Stale template\n";
    fs.writeFileSync(templatePath, corrupted);

    const result = upgradeProject(tmpDir, { dryRun: true });

    assert.equal(result.dryRun, true);
    assert.ok(result.migrations.length > 0, "Should have planned migrations");
    assert.ok(
      result.migrations[0].steps.length > 0,
      "Should have planned steps"
    );

    // Verify nothing actually changed on disk
    assert.equal(
      fs.readFileSync(templatePath, "utf-8"),
      corrupted,
      "Template must be unchanged in dry run"
    );
    assert.equal(readConfigVersion(tmpDir), "1.0", "Version must be unchanged in dry run");
  });

  // Test 7: idempotent — second run is a no-op
  it("upgrade_idempotent", () => {
    setConfigVersion(tmpDir, "1.0");

    const first = upgradeProject(tmpDir, { dryRun: false });
    assert.ok(first.migrations.length > 0, "First run should run migrations");
    assert.equal(readConfigVersion(tmpDir), CURRENT_SCHEMA_VERSION);

    const second = upgradeProject(tmpDir, { dryRun: false });
    assert.equal(
      second.migrations.length,
      0,
      "Second run should be a no-op (no migrations applied)"
    );
    assert.equal(second.fromVersion, CURRENT_SCHEMA_VERSION);
    assert.equal(second.toVersion, CURRENT_SCHEMA_VERSION);
  });

  // Test 8: missing wdd_version treated as "1.0"
  it("upgrade_missing_version_treats_as_1_0", () => {
    setConfigVersion(tmpDir, null);
    assert.equal(readConfigVersion(tmpDir), undefined, "Pre-condition: no wdd_version");

    const result = upgradeProject(tmpDir, { dryRun: false });

    assert.equal(result.fromVersion, "1.0", "Missing version should be treated as 1.0");
    assert.equal(result.toVersion, CURRENT_SCHEMA_VERSION);
    assert.ok(result.migrations.length > 0, "Should have run the 1.0 → current migration");
    assert.equal(readConfigVersion(tmpDir), CURRENT_SCHEMA_VERSION);
  });

  // Test 9: higher version than current is rejected
  it("upgrade_rejects_higher_version", () => {
    setConfigVersion(tmpDir, "9.9");

    assert.throws(
      () => upgradeProject(tmpDir, { dryRun: false }),
      (err: Error) => {
        assert.ok(
          err.message.includes("9.9") || err.message.toLowerCase().includes("newer"),
          `Error should mention the unrecognized higher version. Got: ${err.message}`
        );
        return true;
      }
    );

    // Version must NOT be silently downgraded
    assert.equal(readConfigVersion(tmpDir), "9.9", "Higher version must remain untouched");
  });
});

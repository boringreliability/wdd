import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { createEpic } from "./commands/epic-create.js";
import { createWard } from "./commands/ward-create.js";
import { buildDependencyGraph } from "./commands/graph.js";
import { upgradeProject, CURRENT_SCHEMA_VERSION } from "./commands/upgrade.js";
import { initProject } from "./commands/init.js";
import { parseFrontmatter } from "./frontmatter.js";
import { readConfig } from "./utils/config.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-ward027-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeLegacyWard(
  dir: string,
  input: Readonly<{
    ward: number;
    epic: string;
    name: string;
    status?: string;
    dependencies?: readonly (number | string)[];
  }>
): void {
  const wardId = String(input.ward).padStart(3, "0");
  const dependencies = (input.dependencies ?? [])
    .map((dependency) => typeof dependency === "string" ? `"${dependency}"` : String(dependency))
    .join(", ");
  const content = `---
ward: ${input.ward}
revision: null
name: "${input.name}"
epic: "${input.epic}"
status: "${input.status ?? "planned"}"
dependencies: [${dependencies}]
layer: "typescript"
estimated_tests: 0
created: "2026-06-12"
completed: null
---
# Ward ${wardId}: ${input.name}

## Scope
Legacy fixture.
`;

  fs.writeFileSync(path.join(dir, ".wdd", "wards", `ward-${wardId}.md`), content);
}

function writeLegacyEpic(dir: string, input: Readonly<{ number: number; slug: string; name: string }>): void {
  const epicId = String(input.number).padStart(2, "0");
  const content = `---
epic: "${input.slug}"
name: "${input.name}"
number: ${input.number}
status: "active"
created: "2026-06-12"
---
# Epic ${epicId}: ${input.name}
`;

  fs.writeFileSync(path.join(dir, ".wdd", "epics", `${epicId}-${input.slug}.md`), content);
}

describe("Ward 027: epic-scoped Ward IDs", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "scoped-ids" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("creates slug-only epics without global numeric filenames", async () => {
    /**
     * Given: A project using branch-safe WDD identifiers
     * When:  A new epic is created with slug "dashboard-polish"
     * Then:  The epic file should be `.wdd/epics/dashboard-polish.md`
     * And:   The frontmatter should not contain a global `number` field.
     */
    const epicPath = await createEpic(tmpDir, {
      name: "Dashboard Polish",
      slug: "dashboard-polish",
    });

    assert.equal(path.relative(tmpDir, epicPath), ".wdd/epics/dashboard-polish.md");
    const { frontmatter, body } = parseFrontmatter(fs.readFileSync(epicPath, "utf-8"));
    assert.equal(frontmatter.epic, "dashboard-polish");
    assert.ok(!("number" in frontmatter), "Epic frontmatter must not use global numbering");
    assert.ok(body.includes("# Epic: Dashboard Polish"));
  });

  it("creates Ward files under the owning epic with per-epic numbering", async () => {
    /**
     * Given: Two independent epics on the same branch
     * When:  Each epic receives its first Ward
     * Then:  Both Wards should be numbered 001 under their own epic folder
     * And:   Their canonical graph IDs should include the epic slug.
     */
    await createEpic(tmpDir, { name: "Drive Polish", slug: "drive-polish" });
    await createEpic(tmpDir, { name: "Dashboard Polish", slug: "dashboard-polish" });

    const driveWardPath = await createWard(tmpDir, {
      name: "Address Scroll",
      epic: "drive-polish",
      tests: 4,
    });
    const dashboardWardPath = await createWard(tmpDir, {
      name: "Widget Typography",
      epic: "dashboard-polish",
      tests: 6,
    });

    assert.equal(
      path.relative(tmpDir, driveWardPath),
      ".wdd/wards/drive-polish/ward-001.md"
    );
    assert.equal(
      path.relative(tmpDir, dashboardWardPath),
      ".wdd/wards/dashboard-polish/ward-001.md"
    );

    const graph = buildDependencyGraph(tmpDir);
    assert.ok(graph.get("drive-polish-001"), "Drive ward should use scoped graph ID");
    assert.ok(graph.get("dashboard-polish-001"), "Dashboard ward should use scoped graph ID");
  });
});

describe("Ward 027: upgrade migration for scoped Wards", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "upgrade-scoped-ids" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("migrates legacy epics and Wards into scoped directories", () => {
    /**
     * Given: A legacy project with globally numbered epics and Wards
     * When:  `wdd upgrade` runs to the current schema
     * Then:  Epic filenames should be slug-only
     * And:   Ward files should move under `.wdd/wards/<epic>/ward-NNN.md`
     * And:   Dependencies should be rewritten to scoped Ward IDs.
     */
    const cfgPath = path.join(tmpDir, ".wdd", "config.json");
    const config = readConfig(tmpDir) ?? {};
    fs.writeFileSync(cfgPath, JSON.stringify({ ...config, wdd_version: "1.2" }, null, 2));

    writeLegacyEpic(tmpDir, { number: 1, slug: "drive-polish", name: "Drive Polish" });
    writeLegacyEpic(tmpDir, { number: 2, slug: "dashboard-polish", name: "Dashboard Polish" });
    writeLegacyWard(tmpDir, {
      ward: 27,
      epic: "drive-polish",
      name: "Address Scroll",
      status: "complete",
    });
    writeLegacyWard(tmpDir, {
      ward: 28,
      epic: "dashboard-polish",
      name: "Widget Typography",
      dependencies: [27],
    });

    const result = upgradeProject(tmpDir, { dryRun: false });

    assert.equal(result.toVersion, CURRENT_SCHEMA_VERSION);
    assert.ok(fs.existsSync(path.join(tmpDir, ".wdd", "epics", "drive-polish.md")));
    assert.ok(!fs.existsSync(path.join(tmpDir, ".wdd", "epics", "01-drive-polish.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".wdd", "wards", "drive-polish", "ward-027.md")));
    assert.ok(fs.existsSync(path.join(tmpDir, ".wdd", "wards", "dashboard-polish", "ward-028.md")));
    assert.ok(!fs.existsSync(path.join(tmpDir, ".wdd", "wards", "ward-027.md")));

    const migrated = fs.readFileSync(
      path.join(tmpDir, ".wdd", "wards", "dashboard-polish", "ward-028.md"),
      "utf-8"
    );
    const { frontmatter } = parseFrontmatter(migrated);
    assert.deepEqual(frontmatter.dependencies, ["drive-polish-027"]);
  });
});

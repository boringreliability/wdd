import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { initProject } from "./commands/init.js";
import { inventoryExports } from "./commands/api.js";
import {
  detectScanConfig,
  writeScanConfig,
} from "./commands/configure.js";
import { upgradeProject } from "./commands/upgrade.js";
import { readConfig } from "./utils/config.js";

let tmpDir: string;

function setup(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wdd-test-"));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(dir: string, relPath: string, content: string): void {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function setScanConfig(dir: string, scan: unknown): void {
  const cfgPath = path.join(dir, ".wdd", "config.json");
  const config: Record<string, unknown> = readConfig(dir) ?? {};
  config.scan = scan;
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));
}

function setConfigVersion(dir: string, version: string | null): void {
  const cfgPath = path.join(dir, ".wdd", "config.json");
  const config: Record<string, unknown> = readConfig(dir) ?? {};
  if (version === null) delete config.wdd_version;
  else config.wdd_version = version;
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));
}

describe("Ward 018: inventory respects config.scan", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "scan-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 1: roots from config drives which directories are scanned
  it("inventory_uses_config_roots", () => {
    writeFile(tmpDir, "src/in_src.ts", `export function inSrc(): void {}\n`);
    writeFile(tmpDir, "lib/in_lib.ts", `export function inLib(): void {}\n`);

    setScanConfig(tmpDir, {
      roots: ["lib/"],
      extensions: [".ts"],
      exclude: [],
    });

    const inventory = inventoryExports(tmpDir);
    const names = inventory.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(
      names.includes("inLib"),
      `Should find lib/ exports. Got: ${names.join(", ")}`
    );
    assert.ok(
      !names.includes("inSrc"),
      `Should NOT find src/ exports when roots=['lib/']. Got: ${names.join(", ")}`
    );
  });

  // Test 2: extensions from config drives which files are scanned
  it("inventory_uses_config_extensions", () => {
    writeFile(tmpDir, "src/code.ts", `export function tsExport(): void {}\n`);
    writeFile(tmpDir, "src/code.py", `def py_export():\n    pass\n`);

    setScanConfig(tmpDir, {
      roots: ["src/"],
      extensions: [".py"],
      exclude: [],
    });

    const inventory = inventoryExports(tmpDir);
    const names = inventory.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(
      names.includes("py_export"),
      `Should find Python exports. Got: ${names.join(", ")}`
    );
    assert.ok(
      !names.includes("tsExport"),
      `Should NOT scan .ts when extensions=['.py']. Got: ${names.join(", ")}`
    );
  });

  // Test 3a: glob in roots — packages/*/src/ resolves to multiple monorepo paths
  it("inventory_supports_glob_roots", () => {
    writeFile(tmpDir, "packages/alpha/src/foo.ts", `export function fooInAlpha(): void {}\n`);
    writeFile(tmpDir, "packages/beta/src/bar.ts", `export function barInBeta(): void {}\n`);
    writeFile(tmpDir, "outside/baz.ts", `export function bazOutside(): void {}\n`);

    setScanConfig(tmpDir, {
      roots: ["packages/*/src/"],
      extensions: [".ts"],
      exclude: [],
    });

    const inventory = inventoryExports(tmpDir);
    const names = inventory.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(
      names.includes("fooInAlpha"),
      `Glob root should match packages/alpha/src/. Got: ${names.join(", ")}`
    );
    assert.ok(
      names.includes("barInBeta"),
      "Glob root should match packages/beta/src/"
    );
    assert.ok(
      !names.includes("bazOutside"),
      "Glob root should NOT match outside/ paths"
    );
  });

  // Test 3: exclude patterns filter matching files
  it("inventory_uses_config_exclude", () => {
    writeFile(tmpDir, "src/keep.ts", `export function keep(): void {}\n`);
    writeFile(tmpDir, "src/skip.ts", `export function skip(): void {}\n`);

    setScanConfig(tmpDir, {
      roots: ["src/"],
      extensions: [".ts"],
      exclude: ["**/skip.ts"],
    });

    const inventory = inventoryExports(tmpDir);
    const names = inventory.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(names.includes("keep"), "Non-excluded file should be scanned");
    assert.ok(
      !names.includes("skip"),
      `Excluded file should be skipped. Got: ${names.join(", ")}`
    );
  });

  // Test 4: missing scan block uses TS defaults (backward compat) — and default exclude works
  it("inventory_falls_back_to_defaults", () => {
    writeFile(tmpDir, "src/keep.ts", `export function defaulted(): void {}\n`);
    writeFile(tmpDir, "src/skipped.test.ts", `export function testSkipped(): void {}\n`);
    writeFile(tmpDir, "src/skipped.spec.ts", `export function specSkipped(): void {}\n`);
    writeFile(tmpDir, "src/skipped.d.ts", `export interface DtsSkipped {}\n`);
    writeFile(tmpDir, "dist/built.ts", `export function distSkipped(): void {}\n`);
    writeFile(
      tmpDir,
      "node_modules/pkg/index.ts",
      `export function depSkipped(): void {}\n`
    );

    const cfg = readConfig(tmpDir);
    assert.ok(
      cfg && !("scan" in cfg),
      "Pre-condition: no scan config in fresh init"
    );

    const inventory = inventoryExports(tmpDir);
    const names = inventory.flatMap((f) => f.exports.map((e) => e.name));

    // Default scan finds plain src/*.ts
    assert.ok(
      names.includes("defaulted"),
      `Default TS scan should find src/*.ts. Got: ${names.join(", ")}`
    );

    // Default exclude covers test files, type declarations, dist, node_modules
    for (const banned of ["testSkipped", "specSkipped", "DtsSkipped", "distSkipped", "depSkipped"]) {
      assert.ok(
        !names.includes(banned),
        `Default exclude should drop ${banned}. Got: ${names.join(", ")}`
      );
    }
  });
});

describe("Ward 018: Python parser", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "py-test" });
    setScanConfig(tmpDir, {
      roots: ["src/"],
      extensions: [".py"],
      exclude: [],
    });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 5: detects def, async def, class
  it("python_parser_detects_def_class", () => {
    writeFile(
      tmpDir,
      "src/module.py",
      `def regular_func():
    pass

async def async_func():
    pass

class MyClass:
    pass
`
    );

    const inventory = inventoryExports(tmpDir);
    const exports = inventory[0]?.exports ?? [];
    const byName = new Map(exports.map((e) => [e.name, e.kind]));

    assert.equal(byName.get("regular_func"), "function");
    assert.equal(byName.get("async_func"), "function");
    assert.equal(byName.get("MyClass"), "class");
  });

  // Test 6: skips underscore-prefixed names (Python private convention)
  it("python_parser_skips_private", () => {
    writeFile(
      tmpDir,
      "src/module.py",
      `def public_func():
    pass

def _private_func():
    pass

class _PrivateClass:
    pass

class PublicClass:
    pass
`
    );

    const inventory = inventoryExports(tmpDir);
    const names = inventory.flatMap((f) => f.exports.map((e) => e.name));

    assert.ok(names.includes("public_func"));
    assert.ok(names.includes("PublicClass"));
    assert.ok(
      !names.includes("_private_func"),
      "Private function should be skipped"
    );
    assert.ok(
      !names.includes("_PrivateClass"),
      "Private class should be skipped"
    );
  });

  // Test 7: top-level UPPER_CASE = ... detected as const
  it("python_parser_detects_uppercase_const", () => {
    writeFile(
      tmpDir,
      "src/module.py",
      `API_KEY = "secret"
MAX_RETRIES = 3
_internal = "x"
lowercase_var = 1
`
    );

    const inventory = inventoryExports(tmpDir);
    const exports = inventory[0]?.exports ?? [];
    const consts = exports.filter((e) => e.kind === "const").map((e) => e.name);

    assert.ok(consts.includes("API_KEY"), "API_KEY should be detected");
    assert.ok(consts.includes("MAX_RETRIES"), "MAX_RETRIES should be detected");
    assert.ok(
      !consts.includes("_internal"),
      "Underscore-prefixed should be skipped"
    );
    assert.ok(
      !consts.includes("lowercase_var"),
      "Lowercase should not be treated as const (heuristic for exported)"
    );
  });
});

describe("Ward 018: parser registry routes by extension", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "mixed-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 12: when scan includes both .ts and .py, each file uses its appropriate parser
  it("parser_registry_routes_by_extension", () => {
    writeFile(
      tmpDir,
      "src/code.ts",
      `export function tsFunc(): void {}\nexport interface TsInterface { x: number; }\n`
    );
    writeFile(
      tmpDir,
      "src/code.py",
      `def py_func():\n    pass\n\nclass PyClass:\n    pass\n`
    );

    setScanConfig(tmpDir, {
      roots: ["src/"],
      extensions: [".ts", ".py"],
      exclude: [],
    });

    const inventory = inventoryExports(tmpDir);
    const tsFile = inventory.find((f) => f.file.endsWith(".ts"));
    const pyFile = inventory.find((f) => f.file.endsWith(".py"));

    assert.ok(tsFile, "TS file should be in inventory");
    assert.ok(pyFile, "Python file should be in inventory");

    // TS file: TS parser only — should detect function + interface
    const tsKinds = new Map(tsFile!.exports.map((e) => [e.name, e.kind]));
    assert.equal(tsKinds.get("tsFunc"), "function", "TS parser detects function");
    assert.equal(tsKinds.get("TsInterface"), "interface", "TS parser detects interface");

    // Python file: Python parser only — must NOT misidentify py code as TS
    const pyKinds = new Map(pyFile!.exports.map((e) => [e.name, e.kind]));
    assert.equal(pyKinds.get("py_func"), "function", "Python parser detects def");
    assert.equal(pyKinds.get("PyClass"), "class", "Python parser detects class");

    // Cross-contamination check: TS parser should NOT have matched py file's "def"
    // (Python's `def` syntax doesn't include "export" so this should be impossible —
    // but explicit test guards against a permissive TS regex)
    const tsNames = tsFile!.exports.map((e) => e.name);
    assert.ok(
      !tsNames.includes("py_func"),
      "TS file inventory must not contain Python identifiers"
    );

    const pyNames = pyFile!.exports.map((e) => e.name);
    assert.ok(
      !pyNames.includes("tsFunc"),
      "Python file inventory must not contain TS identifiers"
    );
  });
});

describe("Ward 018: detectScanConfig", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "configure-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 8: detects standard src/+TS layout
  it("configure_detects_src_layout", () => {
    writeFile(tmpDir, "src/a.ts", `export function a(): void {}\n`);
    writeFile(tmpDir, "src/b.tsx", `export function b(): void {}\n`);

    const detected = detectScanConfig(tmpDir);

    assert.ok(
      detected.roots.includes("src/"),
      `Should detect src/. Got: ${JSON.stringify(detected.roots)}`
    );
    assert.ok(
      detected.extensions.includes(".ts") || detected.extensions.includes(".tsx"),
      `Should detect TS extensions. Got: ${JSON.stringify(detected.extensions)}`
    );
  });

  // Test 9: detects Python layout
  it("configure_detects_python_layout", () => {
    writeFile(tmpDir, "src/main.py", `def f(): pass\n`);
    writeFile(tmpDir, "src/util.py", `def g(): pass\n`);

    const detected = detectScanConfig(tmpDir);

    assert.ok(
      detected.extensions.includes(".py"),
      `Should detect .py. Got: ${JSON.stringify(detected.extensions)}`
    );
    assert.ok(
      !detected.extensions.includes(".ts"),
      `Should NOT detect .ts in pure-Python repo. Got: ${JSON.stringify(detected.extensions)}`
    );
  });

  // Test 10: writeScanConfig persists to config.json
  it("configure_write_updates_config", () => {
    writeFile(tmpDir, "src/main.py", `def f(): pass\n`);

    const detected = detectScanConfig(tmpDir);
    writeScanConfig(tmpDir, detected);

    const persisted = readConfig(tmpDir);
    assert.ok(persisted?.scan, "scan field should be set after writeScanConfig");
    assert.deepEqual(
      (persisted as { scan: unknown }).scan,
      detected,
      "Persisted scan config should equal detected config"
    );
  });
});

describe("Ward 018: 1.1 → 1.2 migration", () => {
  beforeEach(async () => {
    tmpDir = setup();
    await initProject(tmpDir, { name: "migrate-test" });
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Test 11: migration adds default scan block; idempotent; never overwrites existing scan
  it("upgrade_1_1_to_1_2_adds_scan_block", () => {
    const cfgPath = path.join(tmpDir, ".wdd", "config.json");

    // --- Case A: 1.1 with no scan → migration adds default scan and bumps version
    setConfigVersion(tmpDir, "1.1");
    const initial: Record<string, unknown> = readConfig(tmpDir) ?? {};
    delete initial.scan;
    fs.writeFileSync(cfgPath, JSON.stringify(initial, null, 2));

    upgradeProject(tmpDir, { dryRun: false });

    const afterFirst = readConfig(tmpDir) as {
      scan?: { roots: string[]; extensions: string[]; exclude: string[] };
      wdd_version?: string;
    };
    assert.ok(afterFirst.scan, "Migration should add scan block");
    assert.equal(afterFirst.wdd_version, "1.2");
    assert.deepEqual(afterFirst.scan.roots, ["src/"], "Default roots");
    assert.ok(afterFirst.scan.extensions.includes(".ts"));
    assert.ok(afterFirst.scan.exclude.some((p) => p.includes("test")));

    // --- Case B: idempotency — running upgrade again is a no-op
    const second = upgradeProject(tmpDir, { dryRun: false });
    assert.equal(
      second.migrations.length,
      0,
      "Second upgrade should be no-op (idempotent)"
    );
    const afterSecond = readConfig(tmpDir);
    assert.deepEqual(
      afterSecond,
      afterFirst,
      "Second upgrade must not mutate config"
    );

    // --- Case C: existing scan is preserved (never overwritten)
    setConfigVersion(tmpDir, "1.1");
    const customScan = {
      roots: ["lib/", "apps/*/src/"],
      extensions: [".py"],
      exclude: ["**/build/**"],
    };
    const withCustom: Record<string, unknown> = readConfig(tmpDir) ?? {};
    withCustom.scan = customScan;
    fs.writeFileSync(cfgPath, JSON.stringify(withCustom, null, 2));

    upgradeProject(tmpDir, { dryRun: false });

    const afterCustom = readConfig(tmpDir) as { scan?: unknown };
    assert.deepEqual(
      afterCustom.scan,
      customScan,
      "Existing scan config must be preserved — never overwritten by migration"
    );
  });
});

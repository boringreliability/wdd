import fs from "node:fs";
import path from "node:path";
import { readConfig, configPath, DEFAULT_SCAN } from "../utils/config.js";
import { WARD_TEMPLATE } from "../templates/ward-body.js";

export const CURRENT_SCHEMA_VERSION = "1.2";

export interface MigrationStep {
  action: "create" | "overwrite" | "ensure-dir" | "patch";
  path: string;
  description: string;
}

export interface UpgradeOptions {
  dryRun: boolean;
}

export interface UpgradeResult {
  fromVersion: string;
  toVersion: string;
  migrations: Array<{ version: string; steps: MigrationStep[] }>;
  dryRun: boolean;
}

type MigrationFn = (projectDir: string, dryRun: boolean) => MigrationStep[];

interface MigrationEntry {
  to: string;
  fn: MigrationFn;
}

export const MIGRATIONS: Record<string, MigrationEntry> = {
  "1.0": { to: "1.1", fn: migrateFrom_1_0_to_1_1 },
  "1.1": { to: "1.2", fn: migrateFrom_1_1_to_1_2 },
};

export function upgradeProject(
  projectDir: string,
  options: UpgradeOptions
): UpgradeResult {
  const config = readConfig(projectDir);
  const fromVersion = config?.wdd_version ?? "1.0";

  if (compareVersions(fromVersion, CURRENT_SCHEMA_VERSION) > 0) {
    throw new Error(
      `Project schema version "${fromVersion}" is newer than this CLI's CURRENT_SCHEMA_VERSION "${CURRENT_SCHEMA_VERSION}". Upgrade your wdd CLI.`
    );
  }

  if (fromVersion === CURRENT_SCHEMA_VERSION) {
    return {
      fromVersion,
      toVersion: CURRENT_SCHEMA_VERSION,
      migrations: [],
      dryRun: options.dryRun,
    };
  }

  const migrations: UpgradeResult["migrations"] = [];
  let currentFrom = fromVersion;

  while (currentFrom !== CURRENT_SCHEMA_VERSION) {
    const entry = MIGRATIONS[currentFrom];
    if (!entry) {
      throw new Error(
        `No migration registered for version "${currentFrom}". Known starting versions: ${Object.keys(MIGRATIONS).join(", ")}`
      );
    }

    const steps = entry.fn(projectDir, options.dryRun);
    migrations.push({ version: `${currentFrom} → ${entry.to}`, steps });
    currentFrom = entry.to;
  }

  return {
    fromVersion,
    toVersion: CURRENT_SCHEMA_VERSION,
    migrations,
    dryRun: options.dryRun,
  };
}

const REQUIRED_DIRS_1_1 = [
  "wards",
  "epics",
  "reviews",
  "memory",
  "memory/decisions",
  "memory/learnings",
  "memory/snapshots",
  "templates",
  "adapters",
];

function migrateFrom_1_0_to_1_1(projectDir: string, dryRun: boolean): MigrationStep[] {
  const steps: MigrationStep[] = [];
  const wddDir = path.join(projectDir, ".wdd");

  // Refresh ward template if it differs from the canonical version
  const templatePath = path.join(wddDir, "templates", "ward.md");
  const templateExists = fs.existsSync(templatePath);
  const currentContent = templateExists ? fs.readFileSync(templatePath, "utf-8") : null;
  if (currentContent !== WARD_TEMPLATE) {
    steps.push({
      action: templateExists ? "overwrite" : "create",
      path: ".wdd/templates/ward.md",
      description: "Refresh ward template with current sections (incl. Manual Smoke Test)",
    });
    if (!dryRun) {
      fs.mkdirSync(path.dirname(templatePath), { recursive: true });
      fs.writeFileSync(templatePath, WARD_TEMPLATE);
    }
  }

  // Ensure required directories exist (additive only)
  for (const dir of REQUIRED_DIRS_1_1) {
    const fullPath = path.join(wddDir, dir);
    if (!fs.existsSync(fullPath)) {
      steps.push({
        action: "ensure-dir",
        path: `.wdd/${dir}/`,
        description: "Create missing required directory",
      });
      if (!dryRun) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  // Bump wdd_version in config.json
  steps.push({
    action: "patch",
    path: ".wdd/config.json",
    description: `Bump wdd_version: "1.0" → "1.1"`,
  });
  if (!dryRun) {
    const cfgPath = configPath(projectDir);
    const config: Record<string, unknown> = readConfig(projectDir) ?? {};
    config.wdd_version = "1.1";
    fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));
  }

  return steps;
}

function migrateFrom_1_1_to_1_2(projectDir: string, dryRun: boolean): MigrationStep[] {
  const steps: MigrationStep[] = [];
  const cfgPath = configPath(projectDir);
  const config: Record<string, unknown> = readConfig(projectDir) ?? {};

  if (!config.scan) {
    steps.push({
      action: "patch",
      path: ".wdd/config.json",
      description: "Add default scan block (roots, extensions, exclude)",
    });
    if (!dryRun) {
      config.scan = DEFAULT_SCAN;
    }
  }

  steps.push({
    action: "patch",
    path: ".wdd/config.json",
    description: `Bump wdd_version: "1.1" → "1.2"`,
  });
  if (!dryRun) {
    config.wdd_version = "1.2";
    fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));
  }

  return steps;
}

function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  if (aMajor !== bMajor) return aMajor - bMajor;
  return aMinor - bMinor;
}

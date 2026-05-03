import fs from "node:fs";
import path from "node:path";

export interface WddConfig {
  project: string;
  version?: string;
  methodology?: string;
  wdd_version?: string;
  ward_prefix?: string;
  ward_digits?: number;
  [key: string]: unknown;
}

export function configPath(projectDir: string): string {
  return path.join(projectDir, ".wdd", "config.json");
}

export function readConfig(projectDir: string): WddConfig | null {
  const file = configPath(projectDir);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as WddConfig;
}

export function readProjectName(projectDir: string, fallback = "my-project"): string {
  const config = readConfig(projectDir);
  return config?.project ?? fallback;
}

/** Today's date in ISO `YYYY-MM-DD` form — used for ward `created`/`completed` stamps. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

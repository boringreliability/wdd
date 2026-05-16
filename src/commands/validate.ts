import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";
import { isStatus } from "../utils/status.js";
import { type Clock, defaultClock } from "../utils/clock.js";
import {
  buildDependencyGraph,
  findOrphanedDependencies,
  getWardBodies,
} from "./graph.js";
import { parseBacklog, findStaleBacklogItems } from "../utils/backlog.js";

const REQUIRED_FILES = ["PROJECT.md", "CONTEXT.md", "PROGRESS.md", "config.json"];
const REQUIRED_DIRS = ["wards", "epics", "reviews", "memory", "templates"];

const REQUIRED_FRONTMATTER_KEYS = [
  "ward", "name", "status", "epic", "layer", "dependencies",
];

const CONTEXT_WARN_LINES = 150;
const CONTEXT_MAX_LINES = 200;
const CONTEXT_MAX_BYTES = 8192;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidateOptions {
  clock?: Clock;
}

export function validateProject(
  projectDir: string,
  opts: ValidateOptions = {}
): ValidationResult {
  const wddDir = path.join(projectDir, ".wdd");
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(wddDir, file))) {
      errors.push(`Missing required file: ${file}`);
    }
  }

  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(path.join(wddDir, dir))) {
      errors.push(`Missing required directory: ${dir}/`);
    }
  }

  const configPath = path.join(wddDir, "config.json");
  if (fs.existsSync(configPath)) {
    try {
      JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      errors.push("config.json is not valid JSON");
    }
  }

  const contextPath = path.join(wddDir, "CONTEXT.md");
  if (fs.existsSync(contextPath)) {
    const content = fs.readFileSync(contextPath, "utf-8");
    const lineCount = content.split("\n").length;
    const byteSize = Buffer.byteLength(content, "utf-8");

    if (lineCount > CONTEXT_MAX_LINES) {
      errors.push(`CONTEXT.md exceeds 200 line limit (${lineCount} lines)`);
    } else if (lineCount > CONTEXT_WARN_LINES) {
      warnings.push(`CONTEXT.md approaching limit: ${lineCount}/200 lines`);
    }

    if (byteSize > CONTEXT_MAX_BYTES) {
      errors.push(`CONTEXT.md exceeds 8KB limit (${byteSize} bytes)`);
    }
  }

  validateWardFrontmatter(wddDir, errors);

  // Orphan dependencies are warnings (not errors) so they don't block validate.
  // The graph-based check supersedes the earlier per-file orphan errors.
  const graph = buildDependencyGraph(projectDir);
  for (const { ward, missing } of findOrphanedDependencies(graph)) {
    for (const m of missing) {
      warnings.push(`Ward ${ward} depends on ward ${m} which does not exist`);
    }
  }

  // Stale backlog items as warnings
  const clock = opts.clock ?? defaultClock;
  const plannedBodies = getWardBodies(graph, projectDir, (n) => n.status === "planned");
  const backlog = parseBacklog(projectDir);
  const stale = findStaleBacklogItems(backlog, plannedBodies, clock());
  for (const item of stale) {
    warnings.push(
      `BACKLOG.md item ${item.id} ('${item.title}') is stale: open >30 days, no planned ward references it`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateWardFrontmatter(wddDir: string, errors: string[]): void {
  const wardsDir = path.join(wddDir, "wards");
  if (!fs.existsSync(wardsDir)) return;

  const wardFiles = fs.readdirSync(wardsDir).filter((f) => f.endsWith(".md"));

  for (const file of wardFiles) {
    const content = fs.readFileSync(path.join(wardsDir, file), "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    for (const key of REQUIRED_FRONTMATTER_KEYS) {
      if (!(key in frontmatter)) {
        errors.push(`${file}: missing required frontmatter key '${key}'`);
      }
    }

    const status = frontmatter.status;
    if (status !== undefined && status !== null && !isStatus(status)) {
      errors.push(`${file}: invalid status '${status}'`);
    }
  }
}

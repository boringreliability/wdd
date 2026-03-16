import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";

const VALID_STATUSES = ["planned", "red", "approved", "gold", "complete", "blocked"];

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

export function validateProject(projectDir: string): ValidationResult {
  const wddDir = path.join(projectDir, ".wdd");
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required files
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(wddDir, file))) {
      errors.push(`Missing required file: ${file}`);
    }
  }

  // Required directories
  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(path.join(wddDir, dir))) {
      errors.push(`Missing required directory: ${dir}/`);
    }
  }

  // config.json validity
  const configPath = path.join(wddDir, "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      JSON.parse(raw);
    } catch {
      errors.push("config.json is not valid JSON");
    }
  }

  // CONTEXT.md size
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

  // Ward validation
  const wardsDir = path.join(wddDir, "wards");
  if (fs.existsSync(wardsDir)) {
    const wardFiles = fs.readdirSync(wardsDir).filter((f) => f.endsWith(".md"));
    const existingWards = new Set<string>();

    // First pass: collect all ward IDs
    for (const file of wardFiles) {
      const content = fs.readFileSync(path.join(wardsDir, file), "utf-8");
      const { frontmatter } = parseFrontmatter(content);
      const ward = frontmatter.ward as number;
      const revision = frontmatter.revision as string | null;
      const id = revision ? `${ward}${revision}` : String(ward);
      existingWards.add(id);
    }

    // Second pass: validate each ward
    for (const file of wardFiles) {
      const content = fs.readFileSync(path.join(wardsDir, file), "utf-8");
      const { frontmatter } = parseFrontmatter(content);

      // Required keys
      for (const key of REQUIRED_FRONTMATTER_KEYS) {
        if (!(key in frontmatter)) {
          errors.push(`${file}: missing required frontmatter key '${key}'`);
        }
      }

      // Valid status
      const status = frontmatter.status as string;
      if (status && !VALID_STATUSES.includes(status)) {
        errors.push(`${file}: invalid status '${status}'`);
      }

      // Dependencies exist
      const deps = frontmatter.dependencies as Array<number | string> | undefined;
      if (Array.isArray(deps)) {
        for (const dep of deps) {
          const depId = String(dep);
          if (!existingWards.has(depId)) {
            errors.push(`${file}: dependency ward ${dep} does not exist`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

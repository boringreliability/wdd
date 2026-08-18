import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";

/** Zero-pad a ward number to 3 digits, optionally with revision suffix. */
export function formatWardId(num: number, revision?: string | null): string {
  const padded = String(num).padStart(3, "0");
  return revision ? `${padded}${revision}` : padded;
}

/**
 * Only legacy reopen suffixes ("b", "c", ...) are part of a Ward id.
 * Numeric frontmatter `revision` values are spec/document revisions.
 */
export function wardRevisionSuffix(revision: unknown): string | null {
  if (typeof revision !== "string") return null;
  return /^[a-z]$/.test(revision) ? revision : null;
}

/** Format the canonical graph/dependency Ward id from frontmatter. */
export function formatFrontmatterWardId(
  num: number,
  revision: unknown,
  epic?: string | null
): string {
  const suffix = wardRevisionSuffix(revision);
  if (!epic) return `${num}${suffix ?? ""}`;
  return `${epic}-${formatWardId(num, suffix)}`;
}

/** Format a zero-padded display Ward id from frontmatter. */
export function formatFrontmatterDisplayWardId(
  num: number,
  revision: unknown,
  epic?: string | null
): string {
  const localId = formatWardId(num, wardRevisionSuffix(revision));
  return epic ? `${epic}-${localId}` : localId;
}

/** Build the canonical ward filename: e.g., `ward-003.md` or `ward-003b.md`. */
export function wardFilename(num: number, revision?: string | null): string {
  return `ward-${formatWardId(num, revision)}.md`;
}

export interface ParsedWardId {
  epic: string | null;
  num: number;
  revision: string | null;
}

/**
 * Parse a ward identifier like `3`, `"3"`, or `"3b"` into its parts.
 * Returns null when the input doesn't look like a ward id.
 */
export function parseWardId(
  id: number | string
): ParsedWardId | null {
  const str = String(id);
  const scopedMatch = str.match(/^([a-z0-9][a-z0-9-]*)-(\d{3})([a-z])?$/);
  if (scopedMatch) {
    return {
      epic: scopedMatch[1],
      num: parseInt(scopedMatch[2], 10),
      revision: scopedMatch[3] ?? null,
    };
  }

  const match = str.match(/^(\d+)([a-z])?$/);
  if (!match) return null;
  return {
    epic: null,
    num: parseInt(match[1], 10),
    revision: match[2] ?? null,
  };
}

export interface WardFileEntry {
  filePath: string;
  relativePath: string;
  epicFromPath: string | null;
}

export function frontmatterEpicForWard(
  frontmatter: Record<string, unknown>,
  file: Pick<WardFileEntry, "epicFromPath">
): string | null {
  return typeof frontmatter.epic === "string" && file.epicFromPath
    ? frontmatter.epic
    : null;
}

/** Recursively collect both legacy root-level Wards and scoped Ward files. */
export function listWardFiles(wardsDir: string): WardFileEntry[] {
  if (!fs.existsSync(wardsDir)) return [];

  const entries: WardFileEntry[] = [];

  function walk(dir: string, epicFromPath: string | null): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, epicFromPath ?? entry.name);
        continue;
      }

      if (!/^ward-.+\.md$/.test(entry.name)) continue;
      entries.push({
        filePath: fullPath,
        relativePath: path.relative(wardsDir, fullPath),
        epicFromPath,
      });
    }
  }

  walk(wardsDir, null);
  entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return entries;
}

export function resolveWardFile(projectDir: string, wardId: number | string): string {
  const parsed = parseWardId(wardId);
  if (!parsed) {
    throw new Error(`Invalid ward id: ${wardId}`);
  }

  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const filename = wardFilename(parsed.num, parsed.revision);

  if (parsed.epic) {
    const scopedPath = path.join(wardsDir, parsed.epic, filename);
    if (fs.existsSync(scopedPath)) return scopedPath;
    throw new Error(`Ward file not found: ${path.join(parsed.epic, filename)}`);
  }

  const legacyPath = path.join(wardsDir, filename);
  if (fs.existsSync(legacyPath)) return legacyPath;

  const matches = listWardFiles(wardsDir).filter((entry) => {
    if (path.basename(entry.filePath) !== filename) return false;
    const { frontmatter } = parseFrontmatter(fs.readFileSync(entry.filePath, "utf-8"));
    return Number(frontmatter.ward) === parsed.num &&
      wardRevisionSuffix(frontmatter.revision) === parsed.revision;
  });

  if (matches.length === 1) return matches[0].filePath;
  if (matches.length > 1) {
    const candidates = matches.map((entry) => entry.relativePath).join(", ");
    throw new Error(`Ambiguous ward id "${wardId}". Use a scoped id. Candidates: ${candidates}`);
  }

  throw new Error(`Ward file not found: ${filename}`);
}

/**
 * Resolve a dependency token relative to the current Ward's epic.
 * Numeric `2` inside epic `core` becomes `core-2`. Already-scoped ids pass through.
 */
export function normalizeWardId(value: unknown, currentEpic: string | null): string {
  if (typeof value === "number" && currentEpic) {
    return formatFrontmatterWardId(value, null, currentEpic);
  }

  const parsed = typeof value === "string" ? parseWardId(value) : null;
  if (parsed && !parsed.epic && currentEpic) {
    return formatFrontmatterWardId(parsed.num, parsed.revision, currentEpic);
  }

  return String(value);
}

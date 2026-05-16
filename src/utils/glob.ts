import fs from "node:fs";
import path from "node:path";

/**
 * Convert a glob pattern to a regex anchored at full-string match.
 *
 * Supported syntax:
 *   `*`     — matches any chars except `/` (one path segment)
 *   `**`    — matches any chars including `/` (across path segments)
 *   `**\/`  — at start, matches zero or more leading path segments
 *   `/**`   — at end, matches zero or more trailing path segments
 *
 * Examples:
 *   `**\/*.test.ts` matches `foo.test.ts`, `src/foo.test.ts`, `a/b/foo.test.ts`
 *   `dist/**`       matches `dist`, `dist/foo`, `dist/a/b`
 *   `**\/dist/**`   matches `dist`, `dist/x`, `a/dist`, `a/b/dist/x`
 */
export function globToRegex(pattern: string): RegExp {
  // Use sentinel chars when substituting glob tokens so the regex fragments
  // they expand to (`.*`, `[^/]*`) are not re-matched by later passes.
  const PREFIX = "\x00P\x00";
  const SUFFIX = "\x00S\x00";
  const DOUBLE = "\x00D\x00";
  const STAR = "\x00X\x00";

  let p = pattern;
  p = p.replace(/\*\*\//g, PREFIX);
  p = p.replace(/\/\*\*$/g, SUFFIX);
  p = p.replace(/\*\*/g, DOUBLE);
  p = p.replace(/\*/g, STAR);

  p = p.replace(/[.+^$()|[\]{}]/g, "\\$&");

  p = p.replace(new RegExp(PREFIX, "g"), "(?:.*/)?");
  p = p.replace(new RegExp(SUFFIX, "g"), "(?:/.*)?");
  p = p.replace(new RegExp(DOUBLE, "g"), ".*");
  p = p.replace(new RegExp(STAR, "g"), "[^/]*");

  return new RegExp(`^${p}$`);
}

export function matchesGlob(filePath: string, pattern: string): boolean {
  return globToRegex(pattern).test(filePath);
}

/**
 * Expand a glob pattern in a root path (like `packages/*\/src/`) to actual
 * directory paths on disk, relative to projectDir.
 *
 * Only single-segment globs (`*`) are expanded in roots — `**` is not supported
 * here because root patterns are meant to be specific.
 */
export function expandGlobRoots(projectDir: string, pattern: string): string[] {
  const normalized = pattern.replace(/\/$/, "");

  if (!normalized.includes("*")) {
    const abs = path.join(projectDir, normalized);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      return [normalized + "/"];
    }
    return [];
  }

  return expandParts(projectDir, normalized.split("/"), []);
}

function expandParts(projectDir: string, parts: string[], soFar: string[]): string[] {
  if (parts.length === 0) {
    const rel = soFar.join("/");
    const abs = path.join(projectDir, rel);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      return [rel + "/"];
    }
    return [];
  }

  const [head, ...rest] = parts;

  if (head === "*") {
    const currentDir = soFar.length === 0 ? projectDir : path.join(projectDir, ...soFar);
    if (!fs.existsSync(currentDir)) return [];

    const results: string[] = [];
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(...expandParts(projectDir, rest, [...soFar, entry.name]));
      }
    }
    return results;
  }

  return expandParts(projectDir, rest, [...soFar, head]);
}

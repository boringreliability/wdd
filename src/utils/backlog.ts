import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export interface BacklogItem {
  id: string;
  title: string;
  priority: "P1" | "P2" | "P3";
  openedAt: Date;
}

export interface ParseBacklogOptions {
  openedAtResolver?: (lineNumber: number) => Date;
}

const ITEM_REGEX = /^- \[ \] \*\*([A-Z]+-\d+[a-z]?)\*\*:\s*(.+?)\s*$/;
const PRIORITY_HEADING_REGEX = /^### Priority ([123]) — /;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function parseBacklog(
  projectDir: string,
  opts: ParseBacklogOptions = {}
): BacklogItem[] {
  const filePath = path.join(projectDir, ".wdd", "BACKLOG.md");
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const resolver = opts.openedAtResolver ?? makeGitBlameResolver(filePath);

  const items: BacklogItem[] = [];
  let currentPriority: "P1" | "P2" | "P3" = "P3";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const priorityMatch = line.match(PRIORITY_HEADING_REGEX);
    if (priorityMatch) {
      const level = priorityMatch[1];
      currentPriority = level === "1" ? "P1" : level === "2" ? "P2" : "P3";
      continue;
    }

    const itemMatch = line.match(ITEM_REGEX);
    if (!itemMatch) continue;

    items.push({
      id: itemMatch[1],
      title: itemMatch[2],
      priority: currentPriority,
      openedAt: resolver(i + 1),
    });
  }

  return items;
}

/**
 * Default openedAtResolver: uses `git blame --line-porcelain` to find when each
 * line was authored. Falls back to file mtime if git is unavailable.
 */
function makeGitBlameResolver(filePath: string): (lineNumber: number) => Date {
  let blameCache: Map<number, Date> | null = null;
  let blameAttempted = false;

  return (lineNumber: number) => {
    if (!blameAttempted) {
      blameAttempted = true;
      blameCache = tryGitBlame(filePath);
    }
    if (blameCache?.has(lineNumber)) {
      return blameCache.get(lineNumber)!;
    }
    return fs.statSync(filePath).mtime;
  };
}

function tryGitBlame(filePath: string): Map<number, Date> | null {
  try {
    const dir = path.dirname(filePath);
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: dir,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    const relPath = path.relative(repoRoot, filePath);
    const output = execFileSync(
      "git",
      ["blame", "--line-porcelain", "--", relPath],
      {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "ignore"],
      }
    ).toString();

    const map = new Map<number, Date>();
    const blameLines = output.split("\n");
    let currentLine = 0;
    let currentAuthorTime: number | null = null;

    for (const line of blameLines) {
      // Header form: "<sha> <orig-line> <final-line> [<group>]"
      const header = line.match(/^[0-9a-f]{40} \d+ (\d+)(?: \d+)?$/);
      if (header) {
        currentLine = parseInt(header[1], 10);
        continue;
      }
      const authorTime = line.match(/^author-time (\d+)$/);
      if (authorTime) {
        currentAuthorTime = parseInt(authorTime[1], 10);
        continue;
      }
      // Content line starts with tab
      if (line.startsWith("\t") && currentLine > 0 && currentAuthorTime !== null) {
        map.set(currentLine, new Date(currentAuthorTime * 1000));
        currentAuthorTime = null;
      }
    }

    return map;
  } catch {
    return null;
  }
}

/**
 * Stale = opened more than 30 days ago AND no planned ward body contains the id
 * as an isolated, case-sensitive token (lookaround avoids `\b` quirks with `-`/`_`).
 */
export function findStaleBacklogItems(
  backlog: BacklogItem[],
  plannedWardBodies: string[],
  now: Date
): BacklogItem[] {
  const stale: BacklogItem[] = [];

  for (const item of backlog) {
    const ageMs = now.getTime() - item.openedAt.getTime();
    if (ageMs <= THIRTY_DAYS_MS) continue;

    if (anyBodyReferences(item.id, plannedWardBodies)) continue;

    stale.push(item);
  }

  return stale;
}

function anyBodyReferences(id: string, bodies: string[]): boolean {
  const escaped = id.replace(/[.+^$()|[\]{}*?\\\-]/g, "\\$&");
  const pattern = new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`);
  return bodies.some((body) => pattern.test(body));
}

import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";
import { inventoryExports, formatInventory } from "./api.js";
import {
  buildDependencyGraph,
  findReadyWards,
  findPlannedWards,
  getWardBodies,
} from "./graph.js";
import { parseBacklog, findStaleBacklogItems } from "../utils/backlog.js";
import { type Clock, defaultClock } from "../utils/clock.js";

export interface SessionOptions {
  clock?: Clock;
}

export type SectionHandler = (projectDir: string, opts: SessionOptions) => string;

export const SECTION_HANDLERS: Record<string, SectionHandler> = {
  PROJECT: renderProject,
  CONTEXT: renderContext,
  PROGRESS: renderProgress,
  PLANNED: renderPlanned,
  EXPORTS: renderExports,
  CURRENT_WARD: renderCurrentWard,
};

export const SESSION_SECTIONS = [
  "PROJECT",
  "CONTEXT",
  "PROGRESS",
  "PLANNED",
  "EXPORTS",
  "CURRENT_WARD",
] as const;

export function assembleSession(projectDir: string, opts: SessionOptions = {}): string {
  return assembleSessionWith(projectDir, SESSION_SECTIONS, SECTION_HANDLERS, opts);
}

/**
 * Testable helper: iterates `sections` and renders each via `handlers`. Throws
 * if any section name has no registered handler. This is how Test 14 enforces
 * the SESSION_SECTIONS contract.
 */
export function assembleSessionWith(
  projectDir: string,
  sections: readonly string[],
  handlers: Record<string, SectionHandler>,
  opts: SessionOptions = {}
): string {
  const out: string[] = [];
  for (const name of sections) {
    const handler = handlers[name];
    if (!handler) {
      throw new Error(`assembleSession: no handler for section "${name}"`);
    }
    const rendered = handler(projectDir, opts);
    if (rendered) {
      out.push(rendered);
      out.push("");
    }
  }
  return out.join("\n");
}

function renderProject(projectDir: string): string {
  const file = path.join(projectDir, ".wdd", "PROJECT.md");
  if (!fs.existsSync(file)) return "";
  return `═══ PROJECT ═══\n${fs.readFileSync(file, "utf-8").trim()}`;
}

function renderContext(projectDir: string): string {
  const file = path.join(projectDir, ".wdd", "CONTEXT.md");
  if (!fs.existsSync(file)) return "";
  return `═══ CONTEXT ═══\n${fs.readFileSync(file, "utf-8").trim()}`;
}

function renderProgress(projectDir: string): string {
  const file = path.join(projectDir, ".wdd", "PROGRESS.md");
  if (!fs.existsSync(file)) return "";
  return `═══ PROGRESS ═══\n${fs.readFileSync(file, "utf-8").trim()}`;
}

function renderPlanned(projectDir: string, opts: SessionOptions): string {
  const clock = opts.clock ?? defaultClock;
  const graph = buildDependencyGraph(projectDir);
  const ready = findReadyWards(graph);
  const planned = findPlannedWards(graph);
  const readyIds = new Set(ready.map((w) => w.id));
  const blocked = planned.filter((w) => !readyIds.has(w.id));

  const lines: string[] = ["═══ PLANNED ═══"];

  if (planned.length === 0) {
    lines.push("⚠ No planned wards.");
    lines.push("");
    lines.push("  Either the backlog needs formalizing, or there's truly nothing planned.");
    lines.push("  Check `.wdd/BACKLOG.md` for open items.");
    lines.push('  Run `wdd ward create "Name" --epic <slug>` to create a planned ward.');
    return lines.join("\n");
  }

  if (ready.length > 0) {
    lines.push(`Ready: ${ready.map((w) => `${formatId(w.id)} ${w.name}`).join(", ")}`);
  } else {
    lines.push("Ready: (none)");
  }

  if (blocked.length > 0) {
    lines.push(
      `Blocked: ${blocked.length} ward${blocked.length === 1 ? "" : "s"} (${blocked
        .map((w) => formatId(w.id))
        .join(", ")})`
    );
  }

  // Stale backlog warnings
  const plannedBodies = getWardBodies(graph, projectDir, (n) => n.status === "planned");
  const backlog = parseBacklog(projectDir);
  const stale = findStaleBacklogItems(backlog, plannedBodies, clock());

  if (stale.length > 0) {
    lines.push("");
    lines.push("⚠ Backlog warnings:");
    for (const item of stale) {
      lines.push(
        `  - ${item.id} ('${item.title}') is open in BACKLOG.md but no planned ward references it (opened >30 days ago)`
      );
    }
  }

  return lines.join("\n");
}

function renderExports(projectDir: string): string {
  return `═══ EXPORTS ═══\n${formatInventory(inventoryExports(projectDir))}`;
}

function renderCurrentWard(projectDir: string): string {
  const wddDir = path.join(projectDir, ".wdd");
  const currentWard = findCurrentWard(wddDir);
  if (currentWard) {
    return `═══ CURRENT WARD: ${currentWard.id} — ${currentWard.name} ═══\n${currentWard.content.trim()}`;
  }
  return "═══ All Wards complete ═══";
}

interface CurrentWard {
  id: number;
  name: string;
  content: string;
}

function findCurrentWard(wddDir: string): CurrentWard | null {
  const wardsDir = path.join(wddDir, "wards");
  if (!fs.existsSync(wardsDir)) return null;

  const files = fs
    .readdirSync(wardsDir)
    .filter((f) => /^ward-\d+\.md$/.test(f))
    .sort();

  for (const file of files) {
    const content = fs.readFileSync(path.join(wardsDir, file), "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    if (frontmatter.status !== "complete") {
      return {
        id: frontmatter.ward as number,
        name: frontmatter.name as string,
        content,
      };
    }
  }

  return null;
}

function formatId(id: string): string {
  const match = id.match(/^(\d+)([a-z]?)$/);
  if (!match) return id;
  return match[1].padStart(3, "0") + match[2];
}

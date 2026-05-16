import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";
import { STATUS_SYMBOLS, type Status } from "../utils/status.js";

export type WardId = string;

export interface WardNode {
  id: WardId;
  name: string;
  status: Status;
  dependencies: WardId[];
  dependents: WardId[];
}

export type WardGraph = Map<WardId, WardNode>;

export interface Cycle {
  wards: WardId[];
}

/**
 * Canonical sort: numeric prefix asc, then revision suffix asc.
 * `"5" < "5b" < "10" < "100"`.
 */
export function compareWardId(a: WardId, b: WardId): number {
  const aMatch = a.match(/^(\d+)([a-z]?)$/);
  const bMatch = b.match(/^(\d+)([a-z]?)$/);
  if (!aMatch || !bMatch) return a.localeCompare(b);

  const aNum = parseInt(aMatch[1], 10);
  const bNum = parseInt(bMatch[1], 10);
  if (aNum !== bNum) return aNum - bNum;

  return aMatch[2].localeCompare(bMatch[2]);
}

function normalizeWardId(value: unknown): WardId {
  return String(value);
}

function formatForDisplay(id: WardId): string {
  const match = id.match(/^(\d+)([a-z]?)$/);
  if (!match) return id;
  return match[1].padStart(3, "0") + match[2];
}

export function buildDependencyGraph(projectDir: string): WardGraph {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const graph: WardGraph = new Map();

  if (!fs.existsSync(wardsDir)) return graph;

  const files = fs.readdirSync(wardsDir).filter((f) => /^ward-.+\.md$/.test(f));

  // First pass: create all nodes (without dependents)
  for (const file of files) {
    const content = fs.readFileSync(path.join(wardsDir, file), "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    const ward = frontmatter.ward as number;
    const revision = (frontmatter.revision as string | null) ?? null;
    const id: WardId = revision ? `${ward}${revision}` : String(ward);

    const rawDeps = (frontmatter.dependencies as Array<number | string> | undefined) ?? [];
    const dependencies = rawDeps.map(normalizeWardId);

    graph.set(id, {
      id,
      name: (frontmatter.name as string) ?? "",
      status: (frontmatter.status as Status) ?? "planned",
      dependencies,
      dependents: [],
    });
  }

  // Second pass: reverse-index dependencies
  for (const node of graph.values()) {
    for (const dep of node.dependencies) {
      const depNode = graph.get(dep);
      if (depNode && !depNode.dependents.includes(node.id)) {
        depNode.dependents.push(node.id);
      }
    }
  }

  return graph;
}

/** Wards with all dependencies satisfied (complete) AND status === "planned". */
export function findReadyWards(graph: WardGraph): WardNode[] {
  const ready: WardNode[] = [];
  for (const node of graph.values()) {
    if (node.status !== "planned") continue;
    const allDepsComplete = node.dependencies.every((dep) => {
      const depNode = graph.get(dep);
      return depNode?.status === "complete";
    });
    if (allDepsComplete) ready.push(node);
  }
  ready.sort((a, b) => compareWardId(a.id, b.id));
  return ready;
}

export function findPlannedWards(graph: WardGraph): WardNode[] {
  const planned: WardNode[] = [];
  for (const node of graph.values()) {
    if (node.status === "planned") planned.push(node);
  }
  planned.sort((a, b) => compareWardId(a.id, b.id));
  return planned;
}

/**
 * DFS with white/gray/black coloring. Each cycle is recorded once with wards
 * in traversal order; closing edge (last → first) is implicit.
 */
export function detectCycles(graph: WardGraph): Cycle[] {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<WardId, number>();
  for (const id of graph.keys()) color.set(id, WHITE);

  const cycles: Cycle[] = [];
  const seenCycles = new Set<string>();

  function dfs(id: WardId, stack: WardId[]): void {
    color.set(id, GRAY);
    stack.push(id);

    const node = graph.get(id);
    if (node) {
      for (const dep of node.dependencies) {
        const c = color.get(dep);
        if (c === GRAY) {
          // Found a cycle — extract the part of stack from `dep` to end
          const idx = stack.indexOf(dep);
          const cycle = stack.slice(idx);
          const key = [...cycle].sort().join(",");
          if (!seenCycles.has(key)) {
            seenCycles.add(key);
            cycles.push({ wards: cycle });
          }
        } else if (c === WHITE) {
          dfs(dep, stack);
        }
      }
    }

    stack.pop();
    color.set(id, BLACK);
  }

  for (const id of graph.keys()) {
    if (color.get(id) === WHITE) dfs(id, []);
  }

  return cycles;
}

export function findOrphanedDependencies(
  graph: WardGraph
): Array<{ ward: WardId; missing: WardId[] }> {
  const orphans: Array<{ ward: WardId; missing: WardId[] }> = [];
  for (const node of graph.values()) {
    const missing = node.dependencies.filter((d) => !graph.has(d));
    if (missing.length > 0) {
      orphans.push({ ward: node.id, missing });
    }
  }
  return orphans;
}

/**
 * Render the graph as a text tree. Each ward appears under its FIRST parent
 * (after canonical sort of its dependencies). Multi-parent wards get an
 * "(also depends on X, Y)" annotation.
 */
export function renderGraph(graph: WardGraph): string {
  const cycles = detectCycles(graph);

  // Determine primary parent for each ward (first dep after canonical sort)
  const primaryParent = new Map<WardId, WardId | null>();
  for (const node of graph.values()) {
    if (node.dependencies.length === 0) {
      primaryParent.set(node.id, null);
    } else {
      const sorted = [...node.dependencies].sort(compareWardId);
      const firstExisting = sorted.find((d) => graph.has(d));
      primaryParent.set(node.id, firstExisting ?? null);
    }
  }

  // Build children index
  const children = new Map<WardId, WardId[]>();
  for (const [child, parent] of primaryParent) {
    if (parent === null) continue;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(child);
  }
  for (const list of children.values()) {
    list.sort(compareWardId);
  }

  // Roots = wards with null primary parent
  const roots: WardId[] = [];
  for (const [id, parent] of primaryParent) {
    if (parent === null) roots.push(id);
  }
  roots.sort(compareWardId);

  const lines: string[] = [];

  // Prepend cycle warnings
  for (const cycle of cycles) {
    const display = cycle.wards.map(formatForDisplay).join(" → ");
    const closing = formatForDisplay(cycle.wards[0]);
    lines.push(`⚠ CYCLE DETECTED: ${display} → ${closing}`);
  }
  if (cycles.length > 0) lines.push("");

  for (const root of roots) {
    renderNode(root, 0, true, [], lines, graph, children);
  }

  return lines.join("\n");
}

function renderNode(
  id: WardId,
  depth: number,
  isLast: boolean,
  prefixSegments: string[],
  lines: string[],
  graph: WardGraph,
  childrenMap: Map<WardId, WardId[]>
): void {
  const node = graph.get(id);
  if (!node) return;

  const displayId = formatForDisplay(id);
  const emoji = STATUS_SYMBOLS[node.status] ?? "❓";

  let annotation = "";
  if (node.dependencies.length > 1) {
    const sorted = [...node.dependencies].sort(compareWardId);
    const others = sorted.slice(1).map(formatForDisplay);
    if (others.length > 0) annotation = ` (also depends on ${others.join(", ")})`;
  }

  let line: string;
  if (depth === 0) {
    line = `${displayId} ${node.name} [${emoji}]${annotation}`;
  } else {
    const prefix = prefixSegments.join("");
    const connector = isLast ? " └─ " : " ├─ ";
    line = `${prefix}${connector}${displayId} ${node.name} [${emoji}]${annotation}`;
  }
  lines.push(line);

  const kids = childrenMap.get(id) ?? [];
  for (let i = 0; i < kids.length; i++) {
    const childIsLast = i === kids.length - 1;
    const nextSegment = depth === 0 ? "" : isLast ? "    " : " │  ";
    renderNode(
      kids[i],
      depth + 1,
      childIsLast,
      [...prefixSegments, nextSegment],
      lines,
      graph,
      childrenMap
    );
  }
}

export function renderReadyList(graph: WardGraph): string {
  const ready = findReadyWards(graph);
  const planned = findPlannedWards(graph);
  const readyIds = new Set(ready.map((w) => w.id));
  const blocked = planned.filter((w) => !readyIds.has(w.id));
  const completeCount = [...graph.values()].filter((w) => w.status === "complete").length;

  const lines: string[] = [];
  lines.push(`Ready now (${ready.length}):`);
  for (const w of ready) {
    lines.push(`  ${formatForDisplay(w.id)} ${w.name}`);
  }
  if (ready.length === 0) {
    lines.push("  (none — check BACKLOG.md or run `wdd ward create`)");
  }

  lines.push("");
  lines.push(`Blocked (${blocked.length}):`);
  for (const w of blocked) {
    const incomplete = w.dependencies
      .filter((d) => graph.get(d)?.status !== "complete")
      .map(formatForDisplay);
    lines.push(`  ${formatForDisplay(w.id)} ${w.name} — waits for: ${incomplete.join(", ")}`);
  }

  lines.push("");
  lines.push(`Complete: ${completeCount}`);

  return lines.join("\n");
}

/** Returns the body (markdown after frontmatter) of all wards matching predicate. */
export function getWardBodies(
  graph: WardGraph,
  projectDir: string,
  predicate: (node: WardNode) => boolean = () => true
): string[] {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  if (!fs.existsSync(wardsDir)) return [];

  const bodies: string[] = [];
  for (const node of graph.values()) {
    if (!predicate(node)) continue;

    const filename = idToFilename(node.id);
    const filePath = path.join(wardsDir, filename);
    if (!fs.existsSync(filePath)) continue;

    const { body } = parseFrontmatter(fs.readFileSync(filePath, "utf-8"));
    bodies.push(body);
  }
  return bodies;
}

function idToFilename(id: WardId): string {
  const match = id.match(/^(\d+)([a-z]?)$/);
  if (!match) return `ward-${id}.md`;
  return `ward-${match[1].padStart(3, "0")}${match[2]}.md`;
}

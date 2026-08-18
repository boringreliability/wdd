import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";
import { isStatus, type Status } from "./status.js";
import { extractSection, hasHeading } from "./section.js";
import {
  formatFrontmatterDisplayWardId,
  formatFrontmatterWardId,
  frontmatterEpicForWard,
  listWardFiles,
  normalizeWardId,
  type WardFileEntry,
} from "./ward-id.js";

/**
 * `blocked` is not in the Ward spec's InFlightWard sketch; formatWorkingMemory
 * needs it to render the Blocked subsection (status=blocked OR planned with
 * incomplete deps) without a second scan.
 */
export interface InFlightWard {
  id: string;
  name: string;
  epic: string;
  status: Status;
  blocked: boolean;
}

export interface ContextLogbookFinding {
  heading: string;
  reason: string;
}

interface WardStatusEntry {
  status: Status;
  dependencies: string[];
}

const LOGBOOK_HEADINGS = [
  "Architecture Decisions Made",
  "Key Metrics",
  "Release History",
] as const;

const COMPLETION_NARRATIVE = /Ward (?:\d+|`[a-z0-9-]+`) complete/;

const MISSING_CONSTRAINTS_WARNING =
  "⚠ CONTEXT.md has no Active Constraints section — add invariants there, not a log.";

export function listInFlightWards(projectDir: string, epic?: string): InFlightWard[] {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const files = listWardFiles(wardsDir);
  const statuses = new Map<string, WardStatusEntry>();
  const parsed: Array<{
    file: WardFileEntry;
    frontmatter: Record<string, unknown>;
    status: Status;
    graphId: string;
  }> = [];

  for (const file of files) {
    const content = fs.readFileSync(file.filePath, "utf-8");
    const { frontmatter } = parseFrontmatter(content);
    const status = frontmatter.status;
    if (!isStatus(status)) continue;

    const graphEpic = frontmatterEpicForWard(frontmatter, file);
    const graphId = formatFrontmatterWardId(
      Number(frontmatter.ward),
      frontmatter.revision,
      graphEpic
    );
    const rawDeps = (frontmatter.dependencies as Array<number | string> | undefined) ?? [];
    statuses.set(graphId, {
      status,
      dependencies: rawDeps.map((dependency) => normalizeWardId(dependency, graphEpic)),
    });
    parsed.push({ file, frontmatter, status, graphId });
  }

  const result: InFlightWard[] = [];
  for (const entry of parsed) {
    if (entry.status === "complete") continue;
    if (epic !== undefined && !matchesEpic(entry.frontmatter, entry.file, epic)) continue;

    const resolvedEpic = resolveEpic(entry.frontmatter, entry.file);
    result.push({
      id: formatFrontmatterDisplayWardId(
        Number(entry.frontmatter.ward),
        entry.frontmatter.revision,
        resolvedEpic || null
      ),
      name: typeof entry.frontmatter.name === "string" ? entry.frontmatter.name : "",
      epic: resolvedEpic,
      status: entry.status,
      blocked: isBlocked(entry.status, statuses.get(entry.graphId), statuses),
    });
  }

  return result;
}

/**
 * `epic` is required to render the Filter line (including the unknown-slug
 * empty state). The spec sketch omitted it; the Filter contract cannot be
 * satisfied from the ward list alone.
 */
export function formatWorkingMemory(wards: readonly InFlightWard[], epic?: string): string {
  const lines: string[] = [];
  const filteredEmpty = epic !== undefined && wards.length === 0;

  if (wards.length === 0) {
    lines.push("In flight: (none)");
  } else {
    lines.push("In flight (this checkout):");
    for (const ward of wards) {
      lines.push(`  ${ward.id}  ${ward.status}   ${ward.name}`);
    }
  }

  lines.push("");
  lines.push("Next:");
  if (wards.length === 0) {
    lines.push("  (none)");
  } else {
    const next = wards[0];
    lines.push(`  ${next.id}  ${next.status}   ${next.name}`);
  }

  lines.push("");
  lines.push("Blocked:");
  const blocked = wards.filter((ward) => ward.blocked);
  if (blocked.length === 0) {
    lines.push("  (none)");
  } else {
    for (const ward of blocked) {
      lines.push(`  ${ward.id}  ${ward.status}   ${ward.name}`);
    }
  }

  lines.push("");
  if (filteredEmpty) {
    lines.push(`Filter: epic ${epic} (no matching Wards)`);
  } else if (epic !== undefined) {
    lines.push(`Filter: epic ${epic}`);
  } else {
    lines.push("Filter: all epics");
  }

  return lines.join("\n");
}

export function classifyContextLogbook(markdown: string): ContextLogbookFinding[] {
  const findings: ContextLogbookFinding[] = [];

  if (!hasHeading(markdown, "Active Constraints")) {
    findings.push({
      heading: "Active Constraints",
      reason: "CONTEXT.md must include ## Active Constraints (invariants, not a diary)",
    });
  }

  for (const heading of LOGBOOK_HEADINGS) {
    if (hasHeading(markdown, heading)) {
      findings.push({
        heading,
        reason: `logbook heading ## ${heading} belongs outside CONTEXT.md`,
      });
    }
  }

  if (hasHeading(markdown, "Current State")) {
    const body = extractSection(markdown, "Current State");
    if (COMPLETION_NARRATIVE.test(body)) {
      findings.push({
        heading: "Current State",
        reason: "completion narrative (Ward N complete) belongs in PROGRESS.md",
      });
    }
  }

  return findings;
}

export function renderContextConstraints(markdown: string): string {
  const parts: string[] = [];
  const title = extractTitle(markdown);
  if (title) parts.push(title);

  if (!hasHeading(markdown, "Active Constraints")) {
    parts.push(MISSING_CONSTRAINTS_WARNING);
    return parts.join("\n\n");
  }

  const constraints = extractSection(markdown, "Active Constraints");
  parts.push(`## Active Constraints${constraints ? `\n${constraints}` : ""}`);
  return parts.join("\n\n");
}

export function resolveEpic(
  frontmatter: Record<string, unknown>,
  file: Pick<WardFileEntry, "epicFromPath">
): string {
  if (typeof frontmatter.epic === "string" && frontmatter.epic.length > 0) {
    return frontmatter.epic;
  }
  return file.epicFromPath ?? "";
}

export function matchesEpic(
  frontmatter: Record<string, unknown>,
  file: Pick<WardFileEntry, "epicFromPath">,
  epic: string
): boolean {
  if (typeof frontmatter.epic === "string" && frontmatter.epic === epic) return true;
  return file.epicFromPath === epic;
}

function isBlocked(
  status: Status,
  entry: WardStatusEntry | undefined,
  statuses: Map<string, WardStatusEntry>
): boolean {
  if (status === "blocked") return true;
  if (status !== "planned" || !entry) return false;
  return entry.dependencies.some((dep) => statuses.get(dep)?.status !== "complete");
}

function extractTitle(markdown: string): string | null {
  let inFence = false;
  for (const line of markdown.split("\n")) {
    const trimmed = line.trimStart();
    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && /^# [^#]/.test(trimmed)) return trimmed;
  }
  return null;
}

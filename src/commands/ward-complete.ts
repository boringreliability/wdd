import fs from "node:fs";
import path from "node:path";
import { updateWardStatus } from "./ward-status.js";
import { parseFrontmatter } from "../frontmatter.js";
import { extractSection } from "../utils/section.js";
import {
  type Status,
  STATUS_SYMBOLS,
  isStatus,
  statusLabel,
} from "../utils/status.js";
import { formatWardId, wardFilename, parseWardId } from "../utils/ward-id.js";
import { readProjectName } from "../utils/config.js";

export interface CompleteResult {
  steps: string[];
}

export async function completeWard(
  projectDir: string,
  wardId: number | string
): Promise<CompleteResult> {
  const parsed = parseWardId(wardId);
  if (!parsed) {
    throw new Error(`Invalid ward id: ${wardId}`);
  }

  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const padded = formatWardId(parsed.num, parsed.revision);
  const filename = wardFilename(parsed.num, parsed.revision);
  const wardPath = path.join(wardsDir, filename);

  if (!fs.existsSync(wardPath)) {
    throw new Error(`Ward file not found: ${filename}`);
  }

  const { frontmatter, body } = parseFrontmatter(fs.readFileSync(wardPath, "utf-8"));

  if (frontmatter.status !== "gold") {
    throw new Error(
      `Ward ${wardId} is in ${frontmatter.status} status. Only gold Wards can be completed.`
    );
  }

  const steps: string[] = [];

  const contextPath = path.join(projectDir, ".wdd", "CONTEXT.md");
  if (fs.existsSync(contextPath)) {
    const snapshotDir = path.join(projectDir, ".wdd", "memory", "snapshots");
    fs.mkdirSync(snapshotDir, { recursive: true });
    const snapshotPath = path.join(snapshotDir, `ward-${padded}-complete.md`);
    fs.writeFileSync(snapshotPath, fs.readFileSync(contextPath, "utf-8"));
    steps.push(`Snapshot CONTEXT.md → memory/snapshots/ward-${padded}-complete.md`);
  } else {
    steps.push("Snapshot skipped — CONTEXT.md not found");
  }

  await updateWardStatus(projectDir, wardId, "complete");
  steps.push(`Ward ${wardId}: gold → complete`);

  const progressPath = path.join(projectDir, ".wdd", "PROGRESS.md");
  fs.writeFileSync(progressPath, regenerateProgress(projectDir));
  steps.push("Regenerated PROGRESS.md");

  const wardName = frontmatter.name as string;
  steps.push(`→ Remember to commit: git add .wdd/ && git commit -m "Ward ${wardId} complete: ${wardName}"`);

  steps.push(
    `⚠ CONTEXT.md was not modified. Review and update it now:\n` +
      `  - Update "Current State" to reflect Ward ${wardId} completion\n` +
      `  - Update "What Comes Next" for the next Ward\n` +
      `  - Run: wdd validate (checks CONTEXT.md size)`
  );

  const smokeTest = extractSection(body, "Manual Smoke Test");
  if (smokeTest) {
    const indented = smokeTest.split("\n").map((l) => `    ${l}`).join("\n");
    steps.push(`📋 Manual Smoke Test (replay before declaring complete next time):\n${indented}`);
  }

  for (const step of steps) {
    console.log(`  ${step}`);
  }
  console.log(`\nWard ${wardId} complete.`);

  return { steps };
}

interface WardInfo {
  id: string;
  name: string;
  tests: number;
  status: Status;
  completed: string | null;
}

function readWardInfo(filePath: string): WardInfo {
  const { frontmatter } = parseFrontmatter(fs.readFileSync(filePath, "utf-8"));
  const num = frontmatter.ward as number;
  const revision = (frontmatter.revision as string | null) ?? null;
  const rawStatus = frontmatter.status as string;

  return {
    id: formatWardId(num, revision),
    name: (frontmatter.name as string) ?? "",
    tests: (frontmatter.estimated_tests as number) ?? 0,
    status: isStatus(rawStatus) ? rawStatus : "planned",
    completed: (frontmatter.completed as string) ?? null,
  };
}

export function regenerateProgress(projectDir: string): string {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  if (!fs.existsSync(wardsDir)) {
    return "# Progress\n\nNo wards found.\n";
  }

  const wards = fs
    .readdirSync(wardsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => readWardInfo(path.join(wardsDir, f)));

  const completeCount = wards.filter((w) => w.status === "complete").length;
  const totalTests = wards.reduce((sum, w) => sum + w.tests, 0);
  const blockedCount = wards.filter((w) => w.status === "blocked").length;
  const projectName = readProjectName(projectDir, "Project");

  const rows = wards
    .map((w) => {
      const symbol = STATUS_SYMBOLS[w.status] ?? "❓";
      const date = w.completed ?? "-";
      return `| ${w.id} | ${w.name} | ${w.tests} | ${symbol} ${statusLabel(w.status)} | ${date} |`;
    })
    .join("\n");

  return (
    `# Progress — ${projectName}\n\n` +
    `## Summary\n` +
    `${completeCount} of ${wards.length} Wards complete · ${totalTests} estimated tests · ${blockedCount} blocked\n\n` +
    `## Ward Status\n` +
    `| Ward | Name | Tests | Status | Date |\n` +
    `|------|------|-------|--------|------|\n` +
    `${rows}\n` +
    `\n## Test Summary\n` +
    `- Estimated total: ${totalTests}\n`
  );
}

import fs from "node:fs";
import path from "node:path";
import { updateWardStatus } from "./ward-status.js";
import { parseFrontmatter } from "../frontmatter.js";

const STATUS_SYMBOLS: Record<string, string> = {
  planned: "📋",
  red: "🔴",
  approved: "👀",
  gold: "🔨",
  complete: "✅",
  blocked: "⏸️",
};

export interface CompleteResult {
  steps: string[];
}

export async function completeWard(
  projectDir: string,
  wardId: number
): Promise<CompleteResult> {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const padded = String(wardId).padStart(3, "0");
  const wardPath = path.join(wardsDir, `ward-${padded}.md`);

  if (!fs.existsSync(wardPath)) {
    throw new Error(`Ward file not found: ward-${padded}.md`);
  }

  const content = fs.readFileSync(wardPath, "utf-8");
  const { frontmatter } = parseFrontmatter(content);

  if (frontmatter.status !== "gold") {
    throw new Error(
      `Ward ${wardId} is in ${frontmatter.status} status. Only gold Wards can be completed.`
    );
  }

  const steps: string[] = [];

  // Step 1: Snapshot CONTEXT.md
  const contextPath = path.join(projectDir, ".wdd", "CONTEXT.md");
  if (fs.existsSync(contextPath)) {
    const contextContent = fs.readFileSync(contextPath, "utf-8");
    const snapshotDir = path.join(projectDir, ".wdd", "memory", "snapshots");
    fs.mkdirSync(snapshotDir, { recursive: true });
    const snapshotPath = path.join(snapshotDir, `ward-${padded}-complete.md`);
    fs.writeFileSync(snapshotPath, contextContent);
    steps.push(`Snapshot CONTEXT.md → memory/snapshots/ward-${padded}-complete.md`);
  } else {
    steps.push("Snapshot skipped — CONTEXT.md not found");
  }

  // Step 2: Transition to complete
  await updateWardStatus(projectDir, wardId, "complete");
  steps.push(`Ward ${wardId}: gold → complete`);

  // Step 3: Regenerate PROGRESS.md
  const progress = regenerateProgress(projectDir);
  const progressPath = path.join(projectDir, ".wdd", "PROGRESS.md");
  fs.writeFileSync(progressPath, progress);
  steps.push("Regenerated PROGRESS.md");

  // Step 4: Commit reminder
  const wardName = frontmatter.name as string;
  steps.push(`→ Remember to commit: git add .wdd/ && git commit -m "Ward ${wardId} complete: ${wardName}"`);

  // Step 5: CONTEXT.md update reminder
  steps.push(`⚠ CONTEXT.md was not modified. Review and update it now:\n  - Update "Current State" to reflect Ward ${wardId} completion\n  - Update "What Comes Next" for the next Ward\n  - Run: wdd validate (checks CONTEXT.md size)`);

  for (const step of steps) {
    console.log(`  ${step}`);
  }
  console.log(`\nWard ${wardId} complete.`);

  return { steps };
}

export function regenerateProgress(projectDir: string): string {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  if (!fs.existsSync(wardsDir)) {
    return "# Progress\n\nNo wards found.\n";
  }

  const files = fs.readdirSync(wardsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  interface WardInfo {
    id: string;
    name: string;
    tests: number;
    status: string;
    completed: string | null;
  }

  const wards: WardInfo[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(wardsDir, file), "utf-8");
    const { frontmatter } = parseFrontmatter(content);

    const wardNum = frontmatter.ward as number;
    const revision = frontmatter.revision as string | null;
    const id = revision ? `${wardNum}${revision}` : String(wardNum);

    wards.push({
      id,
      name: (frontmatter.name as string) ?? "",
      tests: (frontmatter.estimated_tests as number) ?? 0,
      status: (frontmatter.status as string) ?? "planned",
      completed: (frontmatter.completed as string) ?? null,
    });
  }

  const completeCount = wards.filter((w) => w.status === "complete").length;
  const totalTests = wards.reduce((sum, w) => sum + w.tests, 0);
  const blockedCount = wards.filter((w) => w.status === "blocked").length;

  const configPath = path.join(projectDir, ".wdd", "config.json");
  let projectName = "Project";
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    projectName = config.project ?? "Project";
  }

  let out = `# Progress — ${projectName}\n\n`;
  out += `## Summary\n`;
  out += `${completeCount} of ${wards.length} Wards complete · ${totalTests} estimated tests · ${blockedCount} blocked\n\n`;

  out += `## Ward Status\n`;
  out += `| Ward | Name | Tests | Status | Date |\n`;
  out += `|------|------|-------|--------|------|\n`;

  for (const w of wards) {
    const symbol = STATUS_SYMBOLS[w.status] ?? "❓";
    const date = w.completed ?? "-";
    out += `| ${w.id} | ${w.name} | ${w.tests} | ${symbol} ${w.status.charAt(0).toUpperCase() + w.status.slice(1)} | ${date} |\n`;
  }

  out += `\n## Test Summary\n`;
  out += `- Estimated total: ${totalTests}\n`;

  return out;
}

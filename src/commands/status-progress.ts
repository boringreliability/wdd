import fs from "node:fs";
import path from "node:path";
import { regenerateProgress } from "./ward-complete.js";

export function printStatus(projectDir: string): string {
  const progressPath = path.join(projectDir, ".wdd", "PROGRESS.md");
  if (!fs.existsSync(progressPath)) {
    throw new Error("PROGRESS.md not found. Run 'wdd progress' to generate it.");
  }
  return fs.readFileSync(progressPath, "utf-8");
}

export function runProgress(projectDir: string): void {
  const progress = regenerateProgress(projectDir);
  const progressPath = path.join(projectDir, ".wdd", "PROGRESS.md");
  fs.writeFileSync(progressPath, progress);
  console.log("Regenerated PROGRESS.md");
}

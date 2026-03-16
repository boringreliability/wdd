import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";

export function assembleSession(projectDir: string): string {
  const wddDir = path.join(projectDir, ".wdd");
  const sections: string[] = [];

  // PROJECT.md
  const projectPath = path.join(wddDir, "PROJECT.md");
  if (fs.existsSync(projectPath)) {
    sections.push("═══ PROJECT ═══");
    sections.push(fs.readFileSync(projectPath, "utf-8").trim());
    sections.push("");
  }

  // CONTEXT.md
  const contextPath = path.join(wddDir, "CONTEXT.md");
  if (fs.existsSync(contextPath)) {
    sections.push("═══ CONTEXT ═══");
    sections.push(fs.readFileSync(contextPath, "utf-8").trim());
    sections.push("");
  }

  // PROGRESS.md
  const progressPath = path.join(wddDir, "PROGRESS.md");
  if (fs.existsSync(progressPath)) {
    sections.push("═══ PROGRESS ═══");
    sections.push(fs.readFileSync(progressPath, "utf-8").trim());
    sections.push("");
  }

  // Current Ward — first non-complete
  const currentWard = findCurrentWard(wddDir);
  if (currentWard) {
    sections.push(
      `═══ CURRENT WARD: ${currentWard.id} — ${currentWard.name} ═══`
    );
    sections.push(currentWard.content.trim());
    sections.push("");
  } else {
    sections.push("═══ All Wards complete ═══");
    sections.push("");
  }

  return sections.join("\n");
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

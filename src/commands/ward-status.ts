import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.js";

type Status = "planned" | "red" | "approved" | "gold" | "complete" | "blocked";

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  planned: ["red", "blocked"],
  red: ["approved", "red"],
  approved: ["gold"],
  gold: ["complete", "red"],
  complete: [],
  blocked: ["planned"],
};

export async function updateWardStatus(
  projectDir: string,
  wardId: number | string,
  newStatus: string,
  feedback?: string
): Promise<void> {
  const filePath = resolveWardFile(projectDir, wardId);
  const content = fs.readFileSync(filePath, "utf-8");
  const { frontmatter, body } = parseFrontmatter(content);

  const currentStatus = frontmatter.status as Status;
  const target = newStatus as Status;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed || !allowed.includes(target)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${target}. Allowed from ${currentStatus}: [${allowed?.join(", ") ?? "none"}]`
    );
  }

  frontmatter.status = target;

  if (target === "complete") {
    frontmatter.completed = new Date().toISOString().slice(0, 10);
  }

  let updatedBody = body;
  if (currentStatus === "gold" && target === "red" && feedback) {
    const date = new Date().toISOString().slice(0, 10);
    updatedBody =
      body.trimEnd() +
      `\n\n## Rejection — ${date}\n${feedback}\n`;
  }

  const updated = serializeFrontmatter(
    frontmatter as Record<string, unknown>,
    updatedBody
  );
  fs.writeFileSync(filePath, updated);

  console.log(`Ward ${wardId}: ${currentStatus} → ${target}`);
}

function resolveWardFile(projectDir: string, wardId: number | string): string {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const id = String(wardId);

  // Check for revision suffix (e.g., "3b")
  const revMatch = id.match(/^(\d+)([a-z])$/);
  let filename: string;

  if (revMatch) {
    const num = revMatch[1].padStart(3, "0");
    const rev = revMatch[2];
    filename = `ward-${num}${rev}.md`;
  } else {
    const num = String(wardId).padStart(3, "0");
    filename = `ward-${num}.md`;
  }

  const filePath = path.join(wardsDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Ward file not found: ${filename}`);
  }

  return filePath;
}

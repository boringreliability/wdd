import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.js";
import { type Status, VALID_TRANSITIONS } from "../utils/status.js";
import { wardFilename, parseWardId } from "../utils/ward-id.js";
import { todayIso } from "../utils/config.js";

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
    frontmatter.completed = todayIso();
  }

  let updatedBody = body;
  if (currentStatus === "gold" && target === "red" && feedback) {
    updatedBody =
      body.trimEnd() +
      `\n\n## Rejection — ${todayIso()}\n${feedback}\n`;
  }

  const updated = serializeFrontmatter(
    frontmatter as Record<string, unknown>,
    updatedBody
  );
  fs.writeFileSync(filePath, updated);

  console.log(`Ward ${wardId}: ${currentStatus} → ${target}`);
}

function resolveWardFile(projectDir: string, wardId: number | string): string {
  const parsed = parseWardId(wardId);
  if (!parsed) {
    throw new Error(`Invalid ward id: ${wardId}`);
  }

  const filename = wardFilename(parsed.num, parsed.revision);
  const filePath = path.join(projectDir, ".wdd", "wards", filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Ward file not found: ${filename}`);
  }

  return filePath;
}

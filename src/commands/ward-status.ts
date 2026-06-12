import fs from "node:fs";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.js";
import { type Status, VALID_TRANSITIONS } from "../utils/status.js";
import { resolveWardFile } from "../utils/ward-id.js";
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


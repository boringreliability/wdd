import fs from "node:fs";
import path from "node:path";
import { serializeFrontmatter } from "../frontmatter.js";
import { formatWardId, wardFilename } from "../utils/ward-id.js";
import { todayIso } from "../utils/config.js";
import { WARD_BODY_TEMPLATE } from "../templates/ward-body.js";

export interface CreateWardOptions {
  name: string;
  epic: string;
  layer?: string;
  tests?: number;
}

export async function createWard(
  projectDir: string,
  options: CreateWardOptions
): Promise<string> {
  if (!options.name) {
    throw new Error("Ward name is required.");
  }
  if (!options.epic) {
    throw new Error("Ward epic is required.");
  }

  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const nextNumber = getNextWardNumber(wardsDir);
  const padded = formatWardId(nextNumber);

  const frontmatter: Record<string, unknown> = {
    ward: nextNumber,
    revision: null,
    name: options.name,
    epic: options.epic,
    status: "planned",
    dependencies: [],
    layer: options.layer ?? "typescript",
    estimated_tests: options.tests ?? 0,
    created: todayIso(),
    completed: null,
  };

  const body = WARD_BODY_TEMPLATE.replace("{NNN}", padded).replace("{Name}", options.name);

  const content = serializeFrontmatter(frontmatter, body);
  const filename = wardFilename(nextNumber);
  const filePath = path.join(wardsDir, filename);

  fs.writeFileSync(filePath, content);
  console.log(`Created ${filename}: ${options.name}`);

  return filePath;
}

function getNextWardNumber(wardsDir: string): number {
  if (!fs.existsSync(wardsDir)) return 1;

  // Match ward-NNN.md but NOT ward-NNNb.md (reopened wards)
  const files = fs.readdirSync(wardsDir);
  let maxNumber = 0;

  for (const file of files) {
    const match = file.match(/^ward-(\d+)\.md$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }

  return maxNumber + 1;
}

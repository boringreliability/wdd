import fs from "node:fs";
import path from "node:path";
import { serializeFrontmatter } from "../frontmatter.js";

export interface CreateEpicOptions {
  name: string;
  slug: string;
}

export async function createEpic(
  projectDir: string,
  options: CreateEpicOptions
): Promise<string> {
  if (!options.name) {
    throw new Error("Epic name is required.");
  }
  if (!options.slug) {
    throw new Error("Epic slug is required.");
  }

  const epicsDir = path.join(projectDir, ".wdd", "epics");
  const nextNumber = getNextEpicNumber(epicsDir);
  const padded = String(nextNumber).padStart(2, "0");
  const today = new Date().toISOString().slice(0, 10);

  const frontmatter: Record<string, unknown> = {
    epic: options.slug,
    name: options.name,
    number: nextNumber,
    status: "active",
    created: today,
  };

  const body = `# Epic ${padded}: ${options.name}

## Goal
{What this epic achieves as a whole}

## Wards
| Ward | Name | Status |
|------|------|--------|

## Integration Points
{How this epic connects to other epics}

## Completion Criteria
{When is this epic done?}
`;

  const content = serializeFrontmatter(frontmatter, body);
  const filename = `${padded}-${options.slug}.md`;
  const filePath = path.join(epicsDir, filename);

  fs.writeFileSync(filePath, content);
  console.log(`Created ${filename}: ${options.name}`);

  return filePath;
}

function getNextEpicNumber(epicsDir: string): number {
  if (!fs.existsSync(epicsDir)) return 1;

  const files = fs.readdirSync(epicsDir);
  let maxNumber = 0;

  for (const file of files) {
    const match = file.match(/^(\d+)-.*\.md$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }

  return maxNumber + 1;
}

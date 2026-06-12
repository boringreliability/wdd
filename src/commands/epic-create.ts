import fs from "node:fs";
import path from "node:path";
import { serializeFrontmatter } from "../frontmatter.js";
import { todayIso } from "../utils/config.js";

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
  const today = todayIso();

  const frontmatter: Record<string, unknown> = {
    epic: options.slug,
    name: options.name,
    status: "active",
    created: today,
  };

  const body = `# Epic: ${options.name}

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
  const filename = `${options.slug}.md`;
  const filePath = path.join(epicsDir, filename);

  fs.writeFileSync(filePath, content);
  console.log(`Created ${filename}: ${options.name}`);

  return filePath;
}

import fs from "node:fs";
import path from "node:path";
import { serializeFrontmatter } from "../frontmatter.js";

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
  const padded = String(nextNumber).padStart(3, "0");
  const today = new Date().toISOString().slice(0, 10);

  const frontmatter: Record<string, unknown> = {
    ward: nextNumber,
    revision: null,
    name: options.name,
    epic: options.epic,
    status: "planned",
    dependencies: [],
    layer: options.layer ?? "typescript",
    estimated_tests: options.tests ?? 0,
    created: today,
    completed: null,
  };

  const body = `# Ward ${padded}: ${options.name}

## Scope
{One paragraph: what this Ward builds and why}

## Inputs
{What this Ward reads/uses from previous Wards}

## Outputs
{What this Ward produces for future Wards}

## Specification
{Detailed technical spec}

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | {test_name} | {what it proves} |

## Must NOT
- {Explicit constraint}

## Must DO
- {Explicit requirement}

## Verification
{How to prove this Ward is complete}
`;

  const content = serializeFrontmatter(frontmatter, body);
  const filename = `ward-${padded}.md`;
  const filePath = path.join(wardsDir, filename);

  fs.writeFileSync(filePath, content);
  console.log(`Created ${filename}: ${options.name}`);

  return filePath;
}

function getNextWardNumber(wardsDir: string): number {
  if (!fs.existsSync(wardsDir)) return 1;

  const files = fs.readdirSync(wardsDir);
  let maxNumber = 0;

  for (const file of files) {
    // Match ward-NNN.md but NOT ward-NNNb.md (reopened wards)
    const match = file.match(/^ward-(\d+)\.md$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) maxNumber = num;
    }
  }

  return maxNumber + 1;
}

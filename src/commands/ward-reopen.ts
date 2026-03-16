import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.js";

export async function reopenWard(
  projectDir: string,
  wardId: number,
  reason: string
): Promise<string> {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const padded = String(wardId).padStart(3, "0");
  const originalPath = path.join(wardsDir, `ward-${padded}.md`);

  if (!fs.existsSync(originalPath)) {
    throw new Error(`Ward file not found: ward-${padded}.md`);
  }

  const originalContent = fs.readFileSync(originalPath, "utf-8");
  const original = parseFrontmatter(originalContent);

  if (original.frontmatter.status !== "complete") {
    throw new Error(
      `Only complete Wards can be reopened. Ward ${wardId} is ${original.frontmatter.status}.`
    );
  }

  // Determine next revision letter
  const revision = getNextRevision(wardsDir, padded);
  const today = new Date().toISOString().slice(0, 10);

  // Append reopening note to original
  const updatedOriginalBody =
    original.body.trimEnd() +
    `\n\n## Reopened — ${today}\nReason: ${reason}\nFix Ward: ward-${padded}${revision}.md\n`;

  fs.writeFileSync(
    originalPath,
    serializeFrontmatter(
      original.frontmatter as Record<string, unknown>,
      updatedOriginalBody
    )
  );

  // Create fix ward
  const fixFrontmatter: Record<string, unknown> = {
    ward: wardId,
    revision,
    name: `${original.frontmatter.name} (fix ${revision})`,
    epic: original.frontmatter.epic,
    status: "planned",
    dependencies: [],
    layer: original.frontmatter.layer,
    estimated_tests: 0,
    created: today,
    completed: null,
  };

  const fixBody = `# Ward ${padded}${revision}: ${original.frontmatter.name} (fix)

## Reopened from
Original: ward-${padded}.md
Reason: ${reason}

## Scope
{Describe what needs to be fixed}

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | {test_name} | {what it proves} |

## Must NOT
- {Explicit constraint}

## Must DO
- {Explicit requirement}

## Verification
{How to prove this fix Ward is complete}
`;

  const fixPath = path.join(wardsDir, `ward-${padded}${revision}.md`);
  fs.writeFileSync(fixPath, serializeFrontmatter(fixFrontmatter, fixBody));

  console.log(`Reopened Ward ${wardId} → ward-${padded}${revision}.md`);
  console.log(`  Reason: ${reason}`);

  return fixPath;
}

function getNextRevision(wardsDir: string, padded: string): string {
  const files = fs.readdirSync(wardsDir);
  const letters = "bcdefghijklmnopqrstuvwxyz";

  for (const letter of letters) {
    const candidate = `ward-${padded}${letter}.md`;
    if (!files.includes(candidate)) {
      return letter;
    }
  }

  throw new Error(`Exhausted revision letters for ward-${padded}`);
}

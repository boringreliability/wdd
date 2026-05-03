import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.js";
import { formatWardId, wardFilename } from "../utils/ward-id.js";
import { todayIso } from "../utils/config.js";

export async function reopenWard(
  projectDir: string,
  wardId: number,
  reason: string
): Promise<string> {
  const wardsDir = path.join(projectDir, ".wdd", "wards");
  const originalFilename = wardFilename(wardId);
  const originalPath = path.join(wardsDir, originalFilename);

  if (!fs.existsSync(originalPath)) {
    throw new Error(`Ward file not found: ${originalFilename}`);
  }

  const original = parseFrontmatter(fs.readFileSync(originalPath, "utf-8"));

  if (original.frontmatter.status !== "complete") {
    throw new Error(
      `Only complete Wards can be reopened. Ward ${wardId} is ${original.frontmatter.status}.`
    );
  }

  const revision = getNextRevision(wardsDir, formatWardId(wardId));
  const fixFilename = wardFilename(wardId, revision);
  const today = todayIso();

  const updatedOriginalBody =
    original.body.trimEnd() +
    `\n\n## Reopened — ${today}\nReason: ${reason}\nFix Ward: ${fixFilename}\n`;

  fs.writeFileSync(
    originalPath,
    serializeFrontmatter(
      original.frontmatter as Record<string, unknown>,
      updatedOriginalBody
    )
  );

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

  const fixBody = `# Ward ${formatWardId(wardId, revision)}: ${original.frontmatter.name} (fix)

## Reopened from
Original: ${originalFilename}
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

  const fixPath = path.join(wardsDir, fixFilename);
  fs.writeFileSync(fixPath, serializeFrontmatter(fixFrontmatter, fixBody));

  console.log(`Reopened Ward ${wardId} → ${fixFilename}`);
  console.log(`  Reason: ${reason}`);

  return fixPath;
}

function getNextRevision(wardsDir: string, padded: string): string {
  const files = fs.readdirSync(wardsDir);
  const letters = "bcdefghijklmnopqrstuvwxyz";

  for (const letter of letters) {
    if (!files.includes(`ward-${padded}${letter}.md`)) {
      return letter;
    }
  }

  throw new Error(`Exhausted revision letters for ward-${padded}`);
}

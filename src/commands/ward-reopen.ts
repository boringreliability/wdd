import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter, serializeFrontmatter } from "../frontmatter.js";
import {
  formatFrontmatterWardId,
  formatWardId,
  listWardFiles,
  parseWardId,
  resolveWardFile,
  wardFilename,
} from "../utils/ward-id.js";
import { todayIso } from "../utils/config.js";
import { MANUAL_SMOKE_TEST_SECTION } from "../templates/ward-body.js";

export async function reopenWard(
  projectDir: string,
  wardId: number | string,
  reason: string
): Promise<string> {
  const parsed = parseWardId(wardId);
  if (!parsed) {
    throw new Error(`Invalid ward id: ${wardId}`);
  }

  const originalFilename = wardFilename(parsed.num, parsed.revision);
  const originalPath = resolveWardFile(projectDir, wardId);
  const targetDir = path.dirname(originalPath);

  const original = parseFrontmatter(fs.readFileSync(originalPath, "utf-8"));

  if (original.frontmatter.status !== "complete") {
    throw new Error(
      `Only complete Wards can be reopened. Ward ${wardId} is ${original.frontmatter.status}.`
    );
  }

  // Fix wards always extend the same num — find the next free letter
  const numPadded = formatWardId(parsed.num);
  const revision = getNextRevision(targetDir, numPadded);
  const fixFilename = wardFilename(parsed.num, revision);
  const originalEpic = parsed.epic ??
    (typeof original.frontmatter.epic === "string" ? original.frontmatter.epic : null);
  const scopedFixId = formatFrontmatterWardId(parsed.num, revision, originalEpic);
  const originalDisplayId = parsed.epic
    ? `${parsed.epic}-${formatWardId(parsed.num, parsed.revision)}`
    : originalFilename;
  const today = todayIso();

  const updatedOriginalBody =
    original.body.trimEnd() +
    `\n\n## Reopened — ${today}\nReason: ${reason}\nFix Ward: ${scopedFixId}\n`;

  fs.writeFileSync(
    originalPath,
    serializeFrontmatter(
      original.frontmatter as Record<string, unknown>,
      updatedOriginalBody
    )
  );

  const fixFrontmatter: Record<string, unknown> = {
    ward: parsed.num,
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

  const fixBody = `# Ward ${scopedFixId}: ${original.frontmatter.name} (fix)

## Reopened from
Original: ${originalDisplayId}
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

${MANUAL_SMOKE_TEST_SECTION}
## Verification
{How to prove this fix Ward is complete}
`;

  const fixPath = path.join(targetDir, fixFilename);
  fs.writeFileSync(fixPath, serializeFrontmatter(fixFrontmatter, fixBody));

  console.log(`Reopened Ward ${wardId} → ${fixFilename}`);
  console.log(`  Reason: ${reason}`);

  return fixPath;
}

function getNextRevision(wardsDir: string, padded: string): string {
  const files = listWardFiles(wardsDir).map((entry) => path.basename(entry.filePath));
  const letters = "bcdefghijklmnopqrstuvwxyz";

  for (const letter of letters) {
    if (!files.includes(`ward-${padded}${letter}.md`)) {
      return letter;
    }
  }

  throw new Error(`Exhausted revision letters for ward-${padded}`);
}

/**
 * Extract a level-2 markdown section by heading name.
 *
 * Returns text between `## {heading}` and the next `## ` (or EOF),
 * trimmed. Returns "" if heading is not found.
 *
 * Subsections (`### ...`) within the section are preserved.
 *
 * Heading lines that appear inside fenced code blocks (```) are ignored —
 * they are content, not structural markers. This matters for Ward files that
 * contain markdown examples in their Specification.
 */
export function extractSection(body: string, heading: string): string {
  const lines = body.split("\n");
  const target = `## ${heading}`;

  let inFence = false;
  let startIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (isFenceLine(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && lines[i].trimEnd() === target) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return "";

  // Reset fence tracking for the section-end scan. The opening line of the
  // section is itself a heading (not a fence), so we resume in non-fence state.
  inFence = false;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (isFenceLine(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && lines[i].startsWith("## ")) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx + 1, endIdx).join("\n").trim();
}

function isFenceLine(line: string): boolean {
  return /^```/.test(line.trimStart());
}

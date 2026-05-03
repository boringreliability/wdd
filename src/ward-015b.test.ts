import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractSection } from "./utils/section.js";

describe("Ward 015b: extractSection respects code fences", () => {
  // Test 1: ## Heading inside fenced code block must NOT be matched as section start
  it("extract_section_skips_code_fence", () => {
    const body = [
      "# Ward Title",
      "",
      "## Specification",
      "Example template:",
      "",
      "```markdown",
      "## Manual Smoke Test",
      "### Setup",
      "INSIDE_FENCE_MARKER",
      "```",
      "",
      "## Manual Smoke Test",
      "### Setup",
      "REAL_SECTION_MARKER",
      "",
      "## Verification",
      "Done.",
    ].join("\n");

    const result = extractSection(body, "Manual Smoke Test");

    assert.ok(
      result.includes("REAL_SECTION_MARKER"),
      `Should extract the real section. Got: ${result}`
    );
    assert.ok(
      !result.includes("INSIDE_FENCE_MARKER"),
      `Should NOT extract content from inside fenced code block. Got: ${result}`
    );
    assert.ok(
      !result.includes("## Verification"),
      "Should not bleed into next section"
    );
  });

  // Test 2: ## Heading inside ``` after the real section must NOT terminate it prematurely
  it("extract_section_skips_fence_in_section_end", () => {
    const body = [
      "# Ward Title",
      "",
      "## Manual Smoke Test",
      "### Setup",
      "REAL_CONTENT_BEFORE_FENCE",
      "",
      "Example of bad config:",
      "```markdown",
      "## Specification",
      "fake content",
      "```",
      "",
      "### Pass criteria",
      "- [ ] REAL_CONTENT_AFTER_FENCE",
      "",
      "## Verification",
      "Done.",
    ].join("\n");

    const result = extractSection(body, "Manual Smoke Test");

    assert.ok(
      result.includes("REAL_CONTENT_BEFORE_FENCE"),
      "Should include content before the inline fence"
    );
    assert.ok(
      result.includes("REAL_CONTENT_AFTER_FENCE"),
      "Should include content after the inline fence — fence's `## Specification` must NOT terminate the section"
    );
    assert.ok(
      result.includes("```markdown"),
      "Should preserve the fence content itself within the section"
    );
    assert.ok(
      !result.includes("## Verification"),
      "Should still terminate at the real next section"
    );
  });

  // Test 3: Real Ward 15 body pattern — Specification with code-block examples followed by real Manual Smoke Test
  it("extract_section_real_world_ward15_body", () => {
    const body = [
      "# Ward 015: Manual Smoke Test Protocol",
      "",
      "## Specification",
      "",
      "### Ward Template Addition",
      "New section:",
      "",
      "```markdown",
      "## Manual Smoke Test",
      "### Setup",
      "{Exact commands}",
      "",
      "### Pass criteria",
      "- [ ] {observable}",
      "```",
      "",
      "### Adapter Content Update",
      "Append:",
      "",
      "```",
      "## Manual Smoke Test Protocol",
      "Before requesting Gold...",
      "```",
      "",
      "## Tests",
      "Some tests.",
      "",
      "## Manual Smoke Test",
      "### Setup",
      "ACTUAL_SETUP",
      "",
      "### Steps",
      "1. ACTUAL_STEP",
      "",
      "### Pass criteria",
      "- [ ] ACTUAL_CRITERION",
      "",
      "## Verification",
      "Done.",
    ].join("\n");

    const result = extractSection(body, "Manual Smoke Test");

    assert.ok(
      result.includes("ACTUAL_SETUP"),
      `Should extract real section's Setup. Got: ${result.slice(0, 200)}`
    );
    assert.ok(
      result.includes("ACTUAL_STEP"),
      "Should extract real section's Steps"
    );
    assert.ok(
      result.includes("ACTUAL_CRITERION"),
      "Should extract real section's Pass criteria"
    );
    assert.ok(
      !result.includes("{Exact commands}"),
      "Should NOT include placeholder content from Ward Template code block"
    );
    assert.ok(
      !result.includes("Before requesting Gold"),
      "Should NOT include Adapter Content code block content"
    );
    assert.ok(
      !result.includes("## Verification"),
      "Should terminate at Verification, not bleed into it"
    );
  });
});

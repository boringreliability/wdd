---
ward: 15
revision: "b"
name: "Manual Smoke Test Protocol (fix b)"
epic: "core-cli"
status: "complete"
dependencies: [15]
layer: "typescript"
estimated_tests: 3
created: "2026-05-03"
completed: "2026-05-03"
---
# Ward 015b: Manual Smoke Test Protocol (fix)

## Reopened from
Original: ward-015.md
Reason: `extractSection()` does not respect markdown code fences — matches `## ` headings inside fenced code blocks. Discovered during Ward 15's own completion smoke test: `completeWard` recap was polluted with content from Specification's code examples.

## Scope
Make [src/utils/section.ts](src/utils/section.ts) `extractSection()` aware of fenced code blocks (\`\`\`), so heading lines (\`## ...\`) inside code blocks are not treated as section markers. Add tests that exercise the bug fixture from Ward 15's own ward file. Re-verify Ward 15 functionality end-to-end.

This Ward is necessary because the smoke-test recap feature loses practical value when ward files contain meta-examples (which they often will, especially for tooling-Wards like 15 itself).

## Specification

### Bug Repro
Given body:
```markdown
## Specification
Example template:

\`\`\`markdown
## Manual Smoke Test
### Setup
inside code block
\`\`\`

## Manual Smoke Test
### Setup
the actual section
```

Current behavior: `extractSection(body, "Manual Smoke Test")` returns content from the first match (inside code block) up to the second `## Manual Smoke Test`, polluted with code block content.

Expected behavior: `extractSection` should skip lines inside \`\`\` fences and return only the actual `## Manual Smoke Test` section content ("the actual section").

### Implementation
Track fence state while scanning lines:
- Toggle `inFence` boolean when a line is exactly \`\`\` or starts with \`\`\` followed by language tag
- Skip heading-detection logic when `inFence` is true
- Apply this to BOTH the start-of-section search AND the next-section-end search

### API unchanged
Signature stays `extractSection(body: string, heading: string): string`. No callers need updating.

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | extract_section_skips_code_fence | `## Heading` inside \`\`\` is NOT matched as a section start |
| 2 | extract_section_skips_fence_in_section_end | `## Heading` inside \`\`\` after the real section is NOT treated as the next-section boundary |
| 3 | extract_section_real_world_ward15_body | Reproduce the actual Ward 15 ward body pattern and verify clean extraction |

## Must NOT
- Do NOT change the public signature of `extractSection`
- Do NOT add a markdown library dependency — keep zero-runtime-deps
- Do NOT modify `completeWard` or callers — fix is local to `section.ts`
- Do NOT break existing extractSection tests (3-5 in ward-015.test.ts)

## Must DO
- Track fence state line-by-line during scan
- Match both opening and closing \`\`\` (with or without language tag)
- Add the 3 tests above
- Re-run all 131 existing tests to verify no regression
- Re-run Ward 15's own manual smoke test step 5 (`wdd complete`) to confirm clean recap

## Manual Smoke Test
### Setup
```bash
cd ~/kmddev/wdd
npm run build
```

### Steps
1. Run: `rm -rf /tmp/wdd-w15b && mkdir /tmp/wdd-w15b && cd /tmp/wdd-w15b && wdd init --name "w15b-smoke"`
   Expected: clean `.wdd/` initialized
2. Run: `wdd ward create "Smoke Recap Test" --epic core --layer typescript --tests 1`
   Expected: `ward-001.md` created with placeholder smoke section
3. Manually edit ward-001.md to add a code block with `## ` headings INSIDE the Specification section. For example, add to body:
   ```markdown
   ## Specification
   Example template:
   \`\`\`markdown
   ## Manual Smoke Test
   ### Setup
   This is fake nested content
   \`\`\`
   ```
4. Run: full TDD cycle: `wdd ward status 1 red && wdd ward status 1 approved && wdd ward status 1 gold && wdd complete 1`
   Expected: `📋 Manual Smoke Test` recap contains ONLY the actual placeholder Setup/Steps/Pass criteria, NOT the fake nested content from the code block

### Pass criteria
- [ ] Smoke test recap is the single, real `## Manual Smoke Test` section
- [ ] Recap does NOT contain content from inside any \`\`\` code blocks
- [ ] All 131 + 3 = 134 tests pass

## Verification
- All 3 new tests pass
- All existing 131 tests still pass (no regression)
- Manual smoke test above passes end-to-end
- TypeScript compiles with zero errors
- Re-running `wdd complete` on a Ward whose body contains nested ## inside code blocks produces clean recap

---
ward: 6
revision: null
name: "Session Command"
epic: context-memory
status: complete
dependencies: [1]
layer: typescript
estimated_tests: 7
created: 2026-03-14
completed: 2026-03-14
---
# Ward 006: Session Command

## Scope
Implement `wdd session` — the killer feature that assembles PROJECT.md + CONTEXT.md + current ward spec into a single stdout output. This gives any AI tool full project context in one command. Also wire it into cli.ts.

## Inputs
- `.wdd/PROJECT.md`, `.wdd/CONTEXT.md`, `.wdd/PROGRESS.md`
- Ward files with frontmatter (from Ward 1-2)

## Outputs
- `assembleSession(projectDir)` function returning structured context string
- `wdd session` CLI command that prints to stdout
- Can be piped: `wdd session | pbcopy`

## Specification

### Behavior
1. Read `.wdd/PROJECT.md` — project identity and principles
2. Read `.wdd/CONTEXT.md` — current state
3. Read `.wdd/PROGRESS.md` — what's done
4. Find first non-complete Ward (lowest number, status != complete)
5. Read that Ward's spec
6. Concatenate with clear section headers and output to stdout

### Output Format
```
═══ PROJECT ═══
{PROJECT.md content}

═══ CONTEXT ═══
{CONTEXT.md content}

═══ PROGRESS ═══
{PROGRESS.md content}

═══ CURRENT WARD: {N} — {Name} ═══
{Ward spec content}
```

### Edge Cases
- If no non-complete Ward exists: print "All Wards complete" instead of ward section
- If PROJECT.md or CONTEXT.md missing: skip section with note
- Clean stdout only — no "WDD initialized" noise, no console.log side effects

## Tests

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | session_includes_project | Output contains PROJECT.md content |
| 2 | session_includes_context | Output contains CONTEXT.md content |
| 3 | session_includes_progress | Output contains PROGRESS.md content |
| 4 | session_includes_current_ward | Output contains first non-complete ward spec |
| 5 | session_skips_complete_wards | Picks ward-002 when ward-001 is complete |
| 6 | session_all_complete | Shows "All Wards complete" when none pending |
| 7 | session_missing_files | Handles missing PROJECT.md gracefully |

## Must NOT
- Do NOT write to any files — this is read-only
- Do NOT modify ward status or any .wdd/ state
- Do NOT include debug output or side-effect console.log
- Do NOT implement any other commands

## Must DO
- Return clean string suitable for piping to clipboard or AI
- Use clear section delimiters
- Find current ward by scanning frontmatter status
- Wire into cli.ts switch statement

## Verification
- All 7 tests pass
- `npx tsx src/cli.ts session` outputs structured context
- Output is pipe-friendly (no ANSI codes, no prompts)
- TypeScript compiles with zero errors

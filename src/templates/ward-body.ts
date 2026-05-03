/**
 * Ward body template — the markdown content below the YAML frontmatter.
 *
 * Two consumers share this:
 *   1. `wdd init` writes it as the file at `.wdd/templates/ward.md` (with
 *      placeholder frontmatter prepended) so projects can see what a Ward
 *      looks like.
 *   2. `wdd ward create` uses it as the body for new ward files.
 *
 * Keep this as the single source of truth. The `{NNN}` and `{Name}` tokens
 * are substituted in `createWard()`; the template file copy keeps them as
 * literal placeholders.
 */
export const WARD_BODY_TEMPLATE = `# Ward {NNN}: {Name}

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

## Manual Smoke Test
### Setup
{Exact commands to spin up — npm link, dev server, build, etc.}

### Steps
1. Run: \`{exact command}\`
   Expected: \`{exact output or behavior}\`
2. Run: \`{next command}\`
   Verify: \`{what to look for}\`

### Pass criteria
- [ ] {concrete observable thing}
- [ ] {concrete observable thing}

## Verification
{How to prove this Ward is complete}
`;

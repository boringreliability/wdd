/**
 * Ward body template — the markdown content below the YAML frontmatter.
 *
 * Three consumers share this:
 *   1. `wdd init` writes WARD_BODY_TEMPLATE as the file at `.wdd/templates/ward.md`
 *      (with placeholder frontmatter prepended) so projects can see the canonical shape.
 *   2. `wdd ward create` uses WARD_BODY_TEMPLATE as the body for new ward files.
 *   3. `wdd ward reopen` uses MANUAL_SMOKE_TEST_SECTION inside its fix-ward body
 *      so reopened wards have parity with new wards.
 *
 * Keep these as the single source of truth. The `{NNN}` and `{Name}` tokens
 * are substituted in `createWard()`; the template file copy keeps them literal.
 */

export const MANUAL_SMOKE_TEST_SECTION = `## Manual Smoke Test
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
`;

export const WARD_TEMPLATE_FRONTMATTER = `---
ward: 0
revision: null
name: ""
epic: ""
status: planned
dependencies: []
layer: typescript
estimated_tests: 0
created: ""
completed: null
---
`;

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

${MANUAL_SMOKE_TEST_SECTION}
## Verification
{How to prove this Ward is complete}
`;

export const WARD_TEMPLATE = WARD_TEMPLATE_FRONTMATTER + WARD_BODY_TEMPLATE;

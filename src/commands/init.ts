import fs from "node:fs";
import path from "node:path";

export interface InitOptions {
  name: string;
  force?: boolean;
}

export async function initProject(
  projectDir: string,
  options: InitOptions
): Promise<void> {
  const wddDir = path.join(projectDir, ".wdd");

  if (fs.existsSync(wddDir) && !options.force) {
    throw new Error(
      `.wdd/ already exists in ${projectDir}. Use --force to overwrite.`
    );
  }

  if (fs.existsSync(wddDir) && options.force) {
    fs.rmSync(wddDir, { recursive: true, force: true });
  }

  // Create directory structure
  const dirs = [
    "",
    "wards",
    "epics",
    "reviews",
    "memory",
    "memory/decisions",
    "memory/learnings",
    "memory/snapshots",
    "templates",
    "adapters",
  ];

  for (const dir of dirs) {
    fs.mkdirSync(path.join(wddDir, dir), { recursive: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { name } = options;

  // PROJECT.md
  fs.writeFileSync(
    path.join(wddDir, "PROJECT.md"),
    `# ${name}

## Identity
- **Name:** ${name}
- **One-liner:** {Description}
- **License:** MIT

## Architecture Overview
{High-level architecture description}

## Principles
- {Principle 1}
- {Principle 2}

## Technology Stack
- {Language/runtime}: {Purpose}

## Non-Goals
- {What this project explicitly does NOT do}
`
  );

  // CONTEXT.md
  fs.writeFileSync(
    path.join(wddDir, "CONTEXT.md"),
    `# Context — ${name}

## Last Updated
Project initialized — ${today}

## Current State
Empty project. WDD initialized.

## Architecture Decisions Made
| Decision | Rationale | Ward |
|----------|-----------|------|

## Active Constraints
{Things the AI must remember across all future Wards}

## Key Metrics
| Metric | Value | Ward |
|--------|-------|------|

## Known Limitations
_None yet_

## What Comes Next
- Ward 1: {First ward description}
`
  );

  // BACKLOG.md
  fs.writeFileSync(
    path.join(wddDir, "BACKLOG.md"),
    `# Backlog — ${name}

## v0.1.0

### Priority 1 — Must Have

### Priority 2 — Should Have

### Priority 3 — Nice to Have

## Completed
`
  );

  // PROGRESS.md
  fs.writeFileSync(
    path.join(wddDir, "PROGRESS.md"),
    `# Progress — ${name}

## Summary
0 of 0 Wards complete · 0 tests passing · 0 open backlog items · 0 blocked

## Blockers
_None_

## Epics

## Ward Status
| Ward | Name | Tests | Status | Date |
|------|------|-------|--------|------|

## Test Summary
- Total: 0
`
  );

  // config.json
  fs.writeFileSync(
    path.join(wddDir, "config.json"),
    JSON.stringify(
      {
        project: name,
        version: "0.1.0",
        methodology: "wdd",
        wdd_version: "1.0",
        ai_tools: {
          primary: "claude-code",
          review: [],
        },
        conventions: {
          test_framework: "",
          lint: "",
          format: "",
        },
        ward_prefix: "ward",
        ward_digits: 3,
      },
      null,
      2
    )
  );

  // Templates
  const templates: Record<string, string> = {
    "ward.md": WARD_TEMPLATE,
    "epic.md": EPIC_TEMPLATE,
    "review.md": REVIEW_TEMPLATE,
    "integration.md": INTEGRATION_TEMPLATE,
    "decision.md": DECISION_TEMPLATE,
    "learning.md": LEARNING_TEMPLATE,
  };

  for (const [filename, content] of Object.entries(templates)) {
    fs.writeFileSync(path.join(wddDir, "templates", filename), content);
  }

  // Print summary
  const created = dirs.length + Object.keys(templates).length + 4; // dirs + templates + core files
  console.log(`WDD initialized in ${projectDir}`);
  console.log(`  Project: ${name}`);
  console.log(`  Created: ${created} files and directories`);
  console.log(`\n  .wdd/`);
  console.log(`  ├── PROJECT.md`);
  console.log(`  ├── CONTEXT.md`);
  console.log(`  ├── BACKLOG.md`);
  console.log(`  ├── PROGRESS.md`);
  console.log(`  ├── config.json`);
  console.log(`  ├── wards/`);
  console.log(`  ├── epics/`);
  console.log(`  ├── reviews/`);
  console.log(`  ├── memory/`);
  console.log(`  ├── templates/`);
  console.log(`  └── adapters/`);
}

const WARD_TEMPLATE = `---
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
# Ward {NNN}: {Name}

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

const EPIC_TEMPLATE = `# Epic {NN}: {Name}

## Goal
{What this epic achieves as a whole}

## Wards
| Ward | Name | Status |
|------|------|--------|
| {N} | {Name} | {Status} |

## Integration Points
{How this epic connects to other epics}

## Completion Criteria
{When is this epic done?}
`;

const REVIEW_TEMPLATE = `# Review: Ward {NNN}

## Reviewer
{AI model name and version, or human name}

## Date
{date}

## Verdict
{Approved / Approved with notes / Changes requested}

## Findings

### Architecture
{Does this Ward respect the architecture defined in PROJECT.md?}

### Correctness
{Do the tests cover the spec? Does the implementation match the tests?}

### Constraints
{Were the must-not rules followed?}

### Performance
{Any performance concerns?}

### Notes for Future Wards
{Observations that should influence future work}
`;

const INTEGRATION_TEMPLATE = `# Integration Spec: {Name}

## Scope
{What layers/components are being connected}

## Responsibility Matrix
| Concern | Owner | Where |
|---------|-------|-------|
| {concern} | {module} | {file/module} |

## Data Flow
{How data moves between layers, with direction arrows}

## API Contract
{Exact methods/functions that cross boundaries}

## Must NOT Cross Boundaries
- {constraint}

## Verification
{How to prove the integration works}
`;

const DECISION_TEMPLATE = `---
type: decision
date: ""
ward: null
tags: []
---
# {Decision Title}

## Decision
{What was decided}

## Rationale
{Why this option was chosen}

## Consequences
{What this means for the project going forward}
`;

const LEARNING_TEMPLATE = `---
type: learning
date: ""
ward: null
tags: []
---
# {Learning Title}

## What happened
{Description of the event or discovery}

## Root cause
{Why it happened}

## Prevention
{How to avoid this in the future}
`;

# WDD CLI

## Identity
- **Name:** wdd
- **One-liner:** CLI tool for Ward-Driven Development — a control system for AI-assisted software construction
- **License:** MIT

## Architecture Overview
Single TypeScript CLI application published as `npx wdd`. All state lives in `.wdd/` directory as markdown and JSON files. Zero runtime dependencies beyond Node.js built-ins + a YAML frontmatter parser.

### Layers
- **CLI layer** — Command parsing, user interaction, stdout output
- **Core layer** — Ward management, state transitions, file operations
- **Template layer** — Markdown templates with YAML frontmatter

## Principles
- File-based methodology — all state in markdown and JSON
- Zero runtime dependencies beyond Node built-ins + YAML frontmatter parser
- Convention over configuration
- Human-readable protocol, machine-checkable invariants
- Git native — every state change is a file change

## Technology Stack
- TypeScript (strict mode, ES2022, NodeNext modules)
- Node.js built-in test runner
- YAML frontmatter parser (single runtime dependency)

## Non-Goals
- No database, no SaaS, no cloud services
- No TUI/dashboard beyond terminal output
- No AI integration or agent orchestration
- No editor plugins or IDE integration

# Changelog

All notable changes to `@boringreliability/wdd` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-06-03

### Added
- **GitHub Copilot adapter** via `wdd bootstrap copilot`. Emits five files
  under `.github/`:
  - `copilot-instructions.md` — auto-loaded on every Copilot chat
  - `prompts/wdd.prompt.md`, `prompts/ward.prompt.md`, `prompts/ward-new.prompt.md`
    — `/wdd`, `/ward`, `/ward-new` slash commands
  - `agents/wdd.agent.md` — selectable persona emphasizing halt-at-gates
    discipline
- `getCopilotAdapter(projectName)` pure emitter in `src/templates/adapter-content.ts`
  for testable file generation.
- Shared content reuse across adapters via `stripClaudeFrontmatter()` — Claude,
  Cursor, and Copilot all serve the same `getSharedContent()` brief.

### Changed
- `wdd bootstrap` now accepts `copilot` as a third adapter alongside `claude`
  and `cursor`. Help text and error messages updated accordingly.
- README adds an npx safety note: use `npx @boringreliability/wdd`, **not**
  `npx wdd` (the bare name `wdd` is a squatted package on the npm registry).

## [0.2.0] — 2026-06-03

### Added
- First npm publish under the scoped name `@boringreliability/wdd`.
- Global binary `wdd` (after `npm install -g @boringreliability/wdd`).
- 22 Wards delivered across the orchestration epic — including:
  - `wdd init` / `wdd ward create` / `wdd ward status` / `wdd complete`
  - `wdd session` — assembles AI context bundle from `.wdd/` files
  - `wdd validate` — checks structure and invariants
  - `wdd graph` / `wdd ready` — dependency DAG and ready-queue
  - `wdd search` — searches CONTEXT, BACKLOG, Wards, and memory snapshots
  - `wdd api` — lists exports from `src/` to prevent reinvention
  - `wdd upgrade` — migrates `.wdd/` schema between versions
  - `wdd configure` — detects scan paths/extensions
- Claude Code adapter (`wdd bootstrap claude`) — three skills (`wdd`, `ward`,
  `ward-new`) with eval JSON for skill-quality validation.
- Cursor adapter (`wdd bootstrap cursor`) — `.cursor/rules/wdd.mdc`.
- Zero runtime dependencies beyond Node.js built-ins.

### Notes
- The bare name `wdd` on npm was already taken by an unrelated package; we
  chose the scoped form matching the GitHub org. Always install via the scoped
  name.

[Unreleased]: https://github.com/boringreliability/wdd/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/boringreliability/wdd/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/boringreliability/wdd/releases/tag/v0.2.0

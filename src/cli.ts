#!/usr/bin/env node

import { initProject } from "./commands/init.js";
import { createWard } from "./commands/ward-create.js";
import { updateWardStatus } from "./commands/ward-status.js";
import { reopenWard } from "./commands/ward-reopen.js";
import { completeWard } from "./commands/ward-complete.js";
import { assembleSession } from "./commands/session.js";
import { validateProject } from "./commands/validate.js";
import { printStatus, runProgress } from "./commands/status-progress.js";
import { searchMemory } from "./commands/search.js";
import { createEpic } from "./commands/epic-create.js";
import { bootstrapAdapter } from "./commands/bootstrap.js";

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

/** Get positional args (non-flag values) after a given index. */
function getPositional(startIndex: number): string[] {
  const result: string[] = [];
  for (let i = startIndex; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      i++; // skip flag value
      continue;
    }
    result.push(args[i]);
  }
  return result;
}

function printHelp(): void {
  console.log(`wdd — Ward-Driven Development CLI

Usage: wdd <command> [options]

Commands:
  init                Initialize WDD in a project
  ward create         Create a new Ward
  ward status         Update Ward status
  ward reopen         Reopen a completed Ward
  complete            Complete a Ward (step-by-step)
  session             Assemble context for AI consumption
  status              Show progress dashboard
  progress            Regenerate PROGRESS.md
  validate            Check structure and invariants
  search              Search project memory

Options:
  --help              Show this help message
`);
}

async function handleWard(): Promise<void> {
  const sub = args[1];

  switch (sub) {
    case "create": {
      const positional = getPositional(2);
      const name = positional[0];
      if (!name) {
        throw new Error("Usage: wdd ward create <name> --epic <slug> [--layer <layer>] [--tests <N>]");
      }
      const epic = getFlag("epic");
      if (!epic) {
        throw new Error("--epic is required for ward create");
      }
      const layer = getFlag("layer");
      const tests = getFlag("tests");
      await createWard(process.cwd(), {
        name,
        epic,
        layer: layer ?? undefined,
        tests: tests ? parseInt(tests, 10) : undefined,
      });
      break;
    }
    case "status": {
      const positional = getPositional(2);
      const wardId = positional[0];
      const newStatus = positional[1];
      if (!wardId || !newStatus) {
        throw new Error("Usage: wdd ward status <id> <new-status> [--feedback <text>]");
      }
      const feedback = getFlag("feedback");
      await updateWardStatus(process.cwd(), parseInt(wardId, 10), newStatus, feedback);
      break;
    }
    case "reopen": {
      const positional = getPositional(2);
      const wardId = positional[0];
      if (!wardId) {
        throw new Error("Usage: wdd ward reopen <id> --reason <text>");
      }
      const reason = getFlag("reason");
      if (!reason) {
        throw new Error("--reason is required for ward reopen");
      }
      await reopenWard(process.cwd(), parseInt(wardId, 10), reason);
      break;
    }
    default:
      console.error(`Unknown ward subcommand: ${sub}`);
      console.error('Run "wdd --help" for usage.');
      process.exit(1);
  }
}

async function main(): Promise<void> {
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "init": {
      const name = getFlag("name") ?? "my-project";
      const force = hasFlag("force");
      await initProject(process.cwd(), { name, force });
      break;
    }
    case "ward": {
      await handleWard();
      break;
    }
    case "epic": {
      const sub = args[1];
      switch (sub) {
        case "create": {
          const positional = getPositional(2);
          const name = positional[0];
          if (!name) {
            throw new Error("Usage: wdd epic create <name> --slug <slug>");
          }
          const slug = getFlag("slug");
          if (!slug) {
            throw new Error("--slug is required for epic create");
          }
          await createEpic(process.cwd(), { name, slug });
          break;
        }
        default:
          console.error(`Unknown epic subcommand: ${sub}`);
          console.error('Run "wdd --help" for usage.');
          process.exit(1);
      }
      break;
    }
    case "bootstrap": {
      const adapter = args[1];
      if (!adapter) {
        throw new Error("Usage: wdd bootstrap <claude|cursor>");
      }
      await bootstrapAdapter(process.cwd(), adapter);
      break;
    }
    case "session": {
      const output = assembleSession(process.cwd());
      process.stdout.write(output);
      break;
    }
    case "validate": {
      const result = validateProject(process.cwd());
      for (const err of result.errors) console.error(`  ERROR: ${err}`);
      for (const warn of result.warnings) console.log(`  WARN: ${warn}`);
      if (result.valid) {
        console.log("Validation passed.");
      } else {
        console.error(`Validation failed: ${result.errors.length} error(s).`);
        process.exit(1);
      }
      break;
    }
    case "status": {
      const output = printStatus(process.cwd());
      process.stdout.write(output);
      break;
    }
    case "progress": {
      runProgress(process.cwd());
      break;
    }
    case "search": {
      const positional = getPositional(1);
      const query = positional[0] ?? "";
      const tag = getFlag("tag");
      if (!query && !tag) {
        throw new Error("Usage: wdd search <query> [--tag <tag>]");
      }
      const results = searchMemory(process.cwd(), query, tag ? { tag } : undefined);
      if (results.length === 0) {
        console.log("No results found.");
      } else {
        for (const r of results) {
          console.log(`  ${r.type}: ${r.file}`);
          if (r.matchLine) console.log(`    → ${r.matchLine}`);
        }
        console.log(`\n${results.length} result(s) found.`);
      }
      break;
    }
    case "complete": {
      const positional = getPositional(1);
      const wardId = positional[0];
      if (!wardId) {
        throw new Error("Usage: wdd complete <ward-id>");
      }
      await completeWard(process.cwd(), parseInt(wardId, 10));
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "wdd --help" for usage.');
      process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

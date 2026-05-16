import fs from "node:fs";
import path from "node:path";
import { readConfig, DEFAULT_SCAN, type ScanConfig } from "../utils/config.js";
import { matchesGlob, expandGlobRoots } from "../utils/glob.js";

export interface ExportEntry {
  name: string;
  kind: "function" | "interface" | "type" | "const" | "class";
  signature?: string;
}

export interface FileExports {
  file: string;
  exports: ExportEntry[];
}

export type ExportInventory = FileExports[];

export interface InventoryFilter {
  file?: string;
  kind?: ExportEntry["kind"];
}

interface LanguageParser {
  name: string;
  extensions: string[];
  scanLine(line: string): Omit<ExportEntry, "name"> & { name: string } | null;
}

const TS_EXPORT_PATTERNS: Array<{ regex: RegExp; kind: ExportEntry["kind"] }> = [
  { regex: /^export\s+(?:async\s+)?function\s+(\w+)/, kind: "function" },
  { regex: /^export\s+interface\s+(\w+)/, kind: "interface" },
  { regex: /^export\s+type\s+(\w+)/, kind: "type" },
  { regex: /^export\s+const\s+(\w+)/, kind: "const" },
  { regex: /^export\s+class\s+(\w+)/, kind: "class" },
];

const TS_PARSER: LanguageParser = {
  name: "typescript",
  extensions: [".ts", ".tsx"],
  scanLine(line) {
    for (const { regex, kind } of TS_EXPORT_PATTERNS) {
      const match = line.match(regex);
      if (!match) continue;
      const entry: ExportEntry = { name: match[1], kind };
      if (kind === "function" || kind === "type" || kind === "interface") {
        entry.signature = line.replace(/\s*\{?\s*$/, "").trim();
      }
      return entry;
    }
    return null;
  },
};

const PYTHON_PARSER: LanguageParser = {
  name: "python",
  extensions: [".py"],
  scanLine(line) {
    // Only top-level (column 0) lines count as exports
    if (line.startsWith(" ") || line.startsWith("\t")) return null;

    let match = line.match(/^(?:async\s+)?def\s+(\w+)/);
    if (match) {
      const name = match[1];
      if (name.startsWith("_")) return null;
      return {
        name,
        kind: "function",
        signature: line.replace(/:\s*$/, "").trim(),
      };
    }

    match = line.match(/^class\s+(\w+)/);
    if (match) {
      const name = match[1];
      if (name.startsWith("_")) return null;
      return { name, kind: "class" };
    }

    // UPPER_SNAKE_CASE module-level constant. Must start with uppercase letter
    // (not underscore) so `_internal` is naturally excluded.
    match = line.match(/^([A-Z][A-Z0-9_]*)\s*=/);
    if (match) {
      return { name: match[1], kind: "const" };
    }

    return null;
  },
};

const PARSERS: LanguageParser[] = [TS_PARSER, PYTHON_PARSER];

function findParser(filePath: string): LanguageParser | null {
  return (
    PARSERS.find((p) => p.extensions.some((ext) => filePath.endsWith(ext))) ?? null
  );
}

function resolveScanConfig(projectDir: string): ScanConfig {
  const config = readConfig(projectDir);
  return config?.scan ?? DEFAULT_SCAN;
}

export function inventoryExports(
  projectDir: string,
  filter?: InventoryFilter
): ExportInventory {
  const scan = resolveScanConfig(projectDir);

  const resolvedRoots = scan.roots.flatMap((root) =>
    expandGlobRoots(projectDir, root)
  );

  const allFiles: string[] = [];
  for (const root of resolvedRoots) {
    const absRoot = path.join(projectDir, root);
    allFiles.push(...collectFiles(absRoot, scan.extensions));
  }

  const result: FileExports[] = [];
  for (const filePath of allFiles) {
    const rel = path.relative(projectDir, filePath);

    if (scan.exclude.some((pattern) => matchesGlob(rel, pattern))) continue;
    if (filter?.file && !rel.includes(filter.file)) continue;

    const parser = findParser(filePath);
    if (!parser) continue;

    const exports = scanContent(
      fs.readFileSync(filePath, "utf-8"),
      parser,
      filter?.kind
    );
    if (exports.length === 0) continue;

    result.push({ file: rel, exports });
  }

  result.sort((a, b) => a.file.localeCompare(b.file));
  return result;
}

function collectFiles(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) return [];

  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function scanContent(
  content: string,
  parser: LanguageParser,
  kindFilter?: ExportEntry["kind"]
): ExportEntry[] {
  const out: ExportEntry[] = [];
  for (const line of content.split("\n")) {
    const result = parser.scanLine(line);
    if (!result) continue;
    if (kindFilter && result.kind !== kindFilter) continue;
    out.push(result);
  }
  return out;
}

export function formatInventory(inventory: ExportInventory): string {
  if (inventory.length === 0) return "(no exports found)";

  const lines: string[] = [];
  let total = 0;

  for (const fileExports of inventory) {
    lines.push(fileExports.file);
    for (const entry of fileExports.exports) {
      const display = entry.signature ?? entry.name;
      lines.push(`  ${entry.kind.padEnd(9)} ${display}`);
      total++;
    }
    lines.push("");
  }

  lines.push(
    `${total} export${total === 1 ? "" : "s"} across ${inventory.length} file${inventory.length === 1 ? "" : "s"}`
  );
  return lines.join("\n");
}

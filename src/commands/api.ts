import fs from "node:fs";
import path from "node:path";

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

const EXPORT_PATTERNS: Array<{ regex: RegExp; kind: ExportEntry["kind"] }> = [
  { regex: /^export\s+(?:async\s+)?function\s+(\w+)/, kind: "function" },
  { regex: /^export\s+interface\s+(\w+)/, kind: "interface" },
  { regex: /^export\s+type\s+(\w+)/, kind: "type" },
  { regex: /^export\s+const\s+(\w+)/, kind: "const" },
  { regex: /^export\s+class\s+(\w+)/, kind: "class" },
];

export function inventoryExports(
  projectDir: string,
  filter?: InventoryFilter
): ExportInventory {
  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return [];

  const result: FileExports[] = [];

  for (const filePath of collectTsFiles(srcDir)) {
    const relPath = path.relative(projectDir, filePath);
    if (filter?.file && !relPath.includes(filter.file)) continue;

    const content = fs.readFileSync(filePath, "utf-8");
    const exports = scanExports(content, filter?.kind);
    if (exports.length === 0) continue;

    result.push({ file: relPath, exports });
  }

  result.sort((a, b) => a.file.localeCompare(b.file));
  return result;
}

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      out.push(full);
    }
  }
  return out;
}

function scanExports(
  content: string,
  kindFilter?: ExportEntry["kind"]
): ExportEntry[] {
  const out: ExportEntry[] = [];

  for (const line of content.split("\n")) {
    for (const { regex, kind } of EXPORT_PATTERNS) {
      const match = line.match(regex);
      if (!match) continue;
      if (kindFilter && kind !== kindFilter) break;

      const entry: ExportEntry = { name: match[1], kind };
      if (kind === "function" || kind === "type" || kind === "interface") {
        entry.signature = line.replace(/\s*\{?\s*$/, "").trim();
      }
      out.push(entry);
      break;
    }
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

  lines.push(`${total} export${total === 1 ? "" : "s"} across ${inventory.length} file${inventory.length === 1 ? "" : "s"}`);
  return lines.join("\n");
}

import fs from "node:fs";
import path from "node:path";
import {
  readConfig,
  configPath,
  type ScanConfig,
} from "../utils/config.js";
import { expandGlobRoots } from "../utils/glob.js";

const STANDARD_ROOT_CANDIDATES = ["src", "lib", "app"];
const MONOREPO_PARENTS = ["apps", "packages"];

const KNOWN_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".rb",
]);

const EXT_DEFAULT_EXCLUDES: Record<string, string[]> = {
  ".ts": ["**/*.test.ts", "**/*.spec.ts", "**/*.d.ts"],
  ".tsx": ["**/*.test.tsx", "**/*.spec.tsx"],
  ".js": ["**/*.test.js", "**/*.spec.js"],
  ".jsx": ["**/*.test.jsx", "**/*.spec.jsx"],
  ".py": ["**/test_*.py", "**/*_test.py", "**/conftest.py"],
  ".go": ["**/*_test.go"],
  ".rs": [],
  ".java": ["**/*Test.java"],
};

const BASE_EXCLUDES = [
  "**/dist/**",
  "**/build/**",
  "**/node_modules/**",
  "**/target/**",
  "**/__pycache__/**",
  "**/.venv/**",
  "**/venv/**",
];

export function detectScanConfig(projectDir: string): ScanConfig {
  const roots = detectRoots(projectDir);
  const extensions = detectExtensions(projectDir, roots);
  const exclude = buildExcludes(extensions);

  return { roots, extensions, exclude };
}

function detectRoots(projectDir: string): string[] {
  const roots: string[] = [];

  for (const candidate of STANDARD_ROOT_CANDIDATES) {
    const abs = path.join(projectDir, candidate);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      roots.push(`${candidate}/`);
    }
  }

  for (const parent of MONOREPO_PARENTS) {
    const abs = path.join(projectDir, parent);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;

    const childrenWithSrc = fs
      .readdirSync(abs, { withFileTypes: true })
      .filter(
        (e) =>
          e.isDirectory() &&
          fs.existsSync(path.join(abs, e.name, "src"))
      );

    if (childrenWithSrc.length > 0) {
      roots.push(`${parent}/*/src/`);
    }
  }

  if (roots.length === 0 && hasSourceFiles(projectDir)) {
    roots.push("./");
  }

  return roots;
}

function hasSourceFiles(dir: string): boolean {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      KNOWN_SOURCE_EXTENSIONS.has(path.extname(entry.name))
    ) {
      return true;
    }
  }
  return false;
}

function detectExtensions(projectDir: string, roots: string[]): string[] {
  const found = new Set<string>();

  for (const root of roots) {
    const resolved = root.includes("*")
      ? expandGlobRoots(projectDir, root)
      : [root];
    for (const resolvedRoot of resolved) {
      const abs = path.join(projectDir, resolvedRoot);
      walkForExtensions(abs, found, 3);
    }
  }

  return [...found].sort();
}

function walkForExtensions(
  dir: string,
  found: Set<string>,
  maxDepth: number
): void {
  if (maxDepth < 0 || !fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (KNOWN_SOURCE_EXTENSIONS.has(ext)) {
        found.add(ext);
      }
    } else if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "node_modules" &&
      entry.name !== "dist"
    ) {
      walkForExtensions(path.join(dir, entry.name), found, maxDepth - 1);
    }
  }
}

function buildExcludes(extensions: string[]): string[] {
  const exclude = new Set<string>(BASE_EXCLUDES);
  for (const ext of extensions) {
    for (const pattern of EXT_DEFAULT_EXCLUDES[ext] ?? []) {
      exclude.add(pattern);
    }
  }
  return [...exclude];
}

export function writeScanConfig(projectDir: string, scan: ScanConfig): void {
  const cfgPath = configPath(projectDir);
  const config: Record<string, unknown> = readConfig(projectDir) ?? {};
  config.scan = scan;
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2));
}

export function formatScanConfig(scan: ScanConfig): string {
  const lines = [
    "Detected scan configuration:",
    `  roots:      ${JSON.stringify(scan.roots)}`,
    `  extensions: ${JSON.stringify(scan.extensions)}`,
    `  exclude:    ${JSON.stringify(scan.exclude)}`,
  ];
  return lines.join("\n");
}

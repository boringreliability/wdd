import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../frontmatter.js";

export interface SearchResult {
  file: string;
  type: string;
  matchLine: string;
}

export interface SearchOptions {
  tag?: string;
}

export function searchMemory(
  projectDir: string,
  query: string,
  options?: SearchOptions
): SearchResult[] {
  const memoryDir = path.join(projectDir, ".wdd", "memory");
  if (!fs.existsSync(memoryDir)) return [];

  const files = collectMarkdownFiles(memoryDir);
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    // Tag filter
    if (options?.tag) {
      const tags = frontmatter.tags as string[] | undefined;
      if (!Array.isArray(tags) || !tags.includes(options.tag)) {
        continue;
      }
    }

    // Content match (skip if query is empty — tag-only search)
    if (query) {
      const contentLower = content.toLowerCase();
      if (!contentLower.includes(queryLower)) {
        continue;
      }
    }

    // Find first matching line for context
    let matchLine = "";
    if (query) {
      const lines = body.split("\n");
      for (const line of lines) {
        if (line.toLowerCase().includes(queryLower)) {
          matchLine = line.trim();
          break;
        }
      }
    }

    results.push({
      file: path.relative(path.join(projectDir, ".wdd", "memory"), filePath),
      type: (frontmatter.type as string) ?? "unknown",
      matchLine,
    });
  }

  return results;
}

function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }

  return results;
}

import fs from "node:fs";
import path from "node:path";
import { getClaudeSkill, getCursorRule } from "../templates/adapter-content.js";

const ADAPTERS: Record<string, { dir: string; file: string; generator: (name: string) => string }> = {
  claude: {
    dir: path.join(".claude", "skills"),
    file: "wdd.md",
    generator: getClaudeSkill,
  },
  cursor: {
    dir: path.join(".cursor", "rules"),
    file: "wdd.mdc",
    generator: getCursorRule,
  },
};

export async function bootstrapAdapter(
  projectDir: string,
  adapter: string
): Promise<string> {
  const config = ADAPTERS[adapter];
  if (!config) {
    throw new Error(`Unknown adapter: ${adapter}. Available: ${Object.keys(ADAPTERS).join(", ")}`);
  }

  const projectName = readProjectName(projectDir);
  const content = config.generator(projectName);

  const targetDir = path.join(projectDir, config.dir);
  fs.mkdirSync(targetDir, { recursive: true });

  const filePath = path.join(targetDir, config.file);
  fs.writeFileSync(filePath, content);

  console.log(`Installed WDD ${adapter} adapter: ${config.dir}/${config.file}`);
  return filePath;
}

function readProjectName(projectDir: string): string {
  const configPath = path.join(projectDir, ".wdd", "config.json");
  if (fs.existsSync(configPath)) {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return raw.project ?? "my-project";
  }
  return "my-project";
}

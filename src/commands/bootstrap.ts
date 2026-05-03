import fs from "node:fs";
import path from "node:path";
import { getClaudeSkills, getCursorRule } from "../templates/adapter-content.js";
import { readProjectName } from "../utils/config.js";

export async function bootstrapAdapter(
  projectDir: string,
  adapter: string
): Promise<string[]> {
  const projectName = readProjectName(projectDir);

  switch (adapter) {
    case "claude": {
      return bootstrapClaude(projectDir, projectName);
    }
    case "cursor": {
      return bootstrapCursor(projectDir, projectName);
    }
    default:
      throw new Error(`Unknown adapter: ${adapter}. Available: claude, cursor`);
  }
}

function bootstrapClaude(projectDir: string, projectName: string): string[] {
  const skillsDir = path.join(projectDir, ".claude", "skills");
  const skills = getClaudeSkills(projectName);
  const created: string[] = [];

  // Remove old flat file format if it exists
  const oldFile = path.join(skillsDir, "wdd.md");
  if (fs.existsSync(oldFile)) {
    fs.unlinkSync(oldFile);
  }

  for (const skill of skills) {
    const dir = path.join(skillsDir, skill.dir);
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, "SKILL.md");
    fs.writeFileSync(filePath, skill.content);
    created.push(`${skill.dir}/SKILL.md`);
    console.log(`  /${skill.dir} → .claude/skills/${skill.dir}/SKILL.md`);

    if (skill.evals) {
      const evalsDir = path.join(dir, "evals");
      fs.mkdirSync(evalsDir, { recursive: true });
      fs.writeFileSync(
        path.join(evalsDir, "evals.json"),
        JSON.stringify(skill.evals, null, 2)
      );
    }
  }

  console.log(`\nInstalled ${created.length} WDD skills with evals for Claude Code.`);
  return created;
}

function bootstrapCursor(projectDir: string, projectName: string): string[] {
  const rulesDir = path.join(projectDir, ".cursor", "rules");
  fs.mkdirSync(rulesDir, { recursive: true });

  const filePath = path.join(rulesDir, "wdd.mdc");
  fs.writeFileSync(filePath, getCursorRule(projectName));

  console.log(`Installed WDD rule: .cursor/rules/wdd.mdc`);
  return [filePath];
}


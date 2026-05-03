import fs from "node:fs";
import path from "node:path";

export interface EvalValidationResult {
  valid: boolean;
  skills: string[];
  errors: string[];
}

export function validateEvals(projectDir: string): EvalValidationResult {
  const skillsDir = path.join(projectDir, ".claude", "skills");
  const errors: string[] = [];
  const skills: string[] = [];

  if (!fs.existsSync(skillsDir)) {
    return { valid: false, skills: [], errors: ["No .claude/skills/ directory found"] };
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillName = entry.name;
    const evalsPath = path.join(skillsDir, skillName, "evals", "evals.json");

    if (!fs.existsSync(evalsPath)) {
      errors.push(`${skillName}: missing evals/evals.json`);
      continue;
    }

    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(evalsPath, "utf-8"));
    } catch {
      errors.push(`${skillName}: evals/evals.json is not valid JSON`);
      continue;
    }

    const obj = data as Record<string, unknown>;

    if (obj.skill_name !== skillName) {
      errors.push(`${skillName}: skill_name "${obj.skill_name}" does not match directory "${skillName}"`);
    }

    if (!Array.isArray(obj.evals)) {
      errors.push(`${skillName}: evals must be an array`);
      continue;
    }

    if (obj.evals.length === 0) {
      errors.push(`${skillName}: evals array is empty`);
      continue;
    }

    for (const eval_ of obj.evals as Array<Record<string, unknown>>) {
      const prefix = `${skillName} eval ${eval_.id ?? "?"}`;

      if (typeof eval_.id !== "number") {
        errors.push(`${prefix}: id must be a number`);
      }
      if (typeof eval_.prompt !== "string" || !eval_.prompt) {
        errors.push(`${prefix}: prompt is required`);
      }
      if (typeof eval_.expected_output !== "string" || !eval_.expected_output) {
        errors.push(`${prefix}: expected_output is required`);
      }
      if (!Array.isArray(eval_.assertions) || eval_.assertions.length === 0) {
        errors.push(`${prefix}: must have at least one assertion`);
      }
    }

    skills.push(skillName);
  }

  return {
    valid: errors.length === 0,
    skills,
    errors,
  };
}

export interface SkillEval {
  id: number;
  prompt: string;
  expected_output: string;
  assertions: string[];
}

export interface SkillEvalsJson {
  skill_name: string;
  evals: SkillEval[];
}

export function getWddEvals(): SkillEvalsJson {
  return {
    skill_name: "wdd",
    evals: [
      {
        id: 1,
        prompt: "I just opened this project, what's the status?",
        expected_output:
          "Agent runs wdd session, reads output, and summarizes: project identity, current state, active ward and its status, any blockers or warnings from wdd validate.",
        assertions: [
          "Agent runs wdd session before answering",
          "Response includes project name from PROJECT.md",
          "Response identifies the current active ward and its status",
          "Agent runs wdd validate to check project health",
        ],
      },
      {
        id: 2,
        prompt: "Help me with this codebase, I want to add a new feature",
        expected_output:
          "Agent runs wdd session first to understand context before suggesting any implementation. Summarizes WDD state and asks what the user wants to build, suggesting /ward-new to create a ward.",
        assertions: [
          "Agent runs wdd session before doing any code work",
          "Agent does NOT start writing code immediately",
          "Response mentions the current WDD state",
          "Agent suggests creating a ward for the new feature",
        ],
      },
    ],
  };
}

export function getWardEvals(): SkillEvalsJson {
  return {
    skill_name: "ward",
    evals: [
      {
        id: 1,
        prompt: "Continue working on the current ward",
        expected_output:
          "Agent checks ward status via wdd session. If ward is in planned status, transitions to red, writes tests, presents them, and STOPs for approval.",
        assertions: [
          "Agent runs wdd session to find current ward",
          "Agent checks the ward's current status before acting",
          "Agent writes tests BEFORE implementation code",
          "Agent STOPs and presents tests to user for approval",
          "Agent does NOT proceed to implementation without explicit approval",
        ],
      },
      {
        id: 2,
        prompt:
          "The tests look good, approved. Go ahead.",
        expected_output:
          "Agent transitions ward from red to approved to gold, then implements until tests pass. Presents implementation and STOPs for approval.",
        assertions: [
          "Agent runs wdd ward status <id> approved",
          "Agent runs wdd ward status <id> gold",
          "Agent implements code to make tests pass",
          "Agent STOPs and presents implementation for approval",
          "Agent does NOT run wdd complete without explicit approval",
        ],
      },
      {
        id: 3,
        prompt:
          "Implement the caching feature from the ward spec",
        expected_output:
          "If ward is in planned status, agent does NOT jump to implementation. Instead starts Red phase: writes tests first, presents them, and STOPs.",
        assertions: [
          "Agent checks ward status before implementing",
          "If ward is planned, agent writes tests FIRST, not implementation",
          "Agent does NOT skip the Red phase even when asked to implement",
          "Agent STOPs for approval after writing tests",
        ],
      },
    ],
  };
}

export function getWardNewEvals(): SkillEvalsJson {
  return {
    skill_name: "ward-new",
    evals: [
      {
        id: 1,
        prompt: "Create a new ward for user authentication",
        expected_output:
          "Agent asks for epic (or suggests existing ones), runs wdd ward create, writes full spec in the ward file, sets status to red, writes test file, presents tests, and STOPs.",
        assertions: [
          "Agent asks about or suggests an epic before creating",
          "Agent runs wdd ward create with name and epic",
          "Agent writes a full spec with Scope, Tests table, Must NOT, Must DO sections",
          "Agent writes test file matching the Tests table",
          "Agent runs wdd ward status <id> red",
          "Agent STOPs and presents tests for approval before implementing",
        ],
      },
      {
        id: 2,
        prompt: "Add a feature for response caching",
        expected_output:
          "Agent treats this as ward creation, not direct implementation. Asks for details, creates ward, writes spec and tests, STOPs for approval.",
        assertions: [
          "Agent does NOT start writing implementation code directly",
          "Agent creates a ward for the feature",
          "Agent writes tests before any implementation",
          "Agent STOPs for human approval",
        ],
      },
    ],
  };
}

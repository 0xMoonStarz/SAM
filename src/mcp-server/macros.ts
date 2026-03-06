/**
 * SAM v1.0 - Built-in macro definitions
 * Predefined operation sequences for reducing round trips
 */

export interface MacroStep {
  type: "bash" | "read" | "tree";
  cmd?: string;     // for bash
  path?: string;    // for read (relative to cwd)
  label?: string;   // section header in output
}

export interface MacroDef {
  description: string;
  steps: MacroStep[];
}

export const BUILTIN_MACROS: Record<string, MacroDef> = {
  "project-overview": {
    description: "Tree + package.json + README",
    steps: [
      { type: "tree", label: "Structure" },
      { type: "read", path: "package.json", label: "Package" },
      { type: "read", path: "README.md", label: "README" },
    ],
  },
  "git-status": {
    description: "Status + diff stat + recent commits",
    steps: [
      { type: "bash", cmd: "git status -sb", label: "Status" },
      { type: "bash", cmd: "git diff --stat", label: "Changes" },
      { type: "bash", cmd: "git log --oneline -5", label: "Recent" },
    ],
  },
  "test-run": {
    description: "Run tests",
    steps: [
      { type: "bash", cmd: "npm test 2>&1", label: "Test Results" },
    ],
  },
  "dep-check": {
    description: "Check outdated deps + audit",
    steps: [
      { type: "bash", cmd: "npm outdated 2>&1 || true", label: "Outdated" },
      { type: "bash", cmd: "npm audit --production 2>&1 || true", label: "Audit" },
    ],
  },
};

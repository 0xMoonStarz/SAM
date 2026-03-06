/**
 * SAM Protocol Specification v1.0
 * Serialized Abstraction Machine for Claude Code
 */

export interface ProtocolSpec {
  version: string;
  operations: Record<string, string>;
  statusCodes: Record<string, string>;
  pathPrefixes: Record<string, string>;
  codeSnippets: Record<string, string>;
}

export const PROTOCOL_VERSION = "1.0";

// Single-char operation codes
export const OPERATIONS: Record<string, string> = {
  r: "Read",
  e: "Edit",
  w: "Write",
  g: "Glob",
  s: "Grep",
  b: "Bash",
  a: "Agent",
  k: "Skill",
  n: "NotebookEdit",
  f: "WebFetch",
  ws: "WebSearch",
  t: "ToolSearch",
  q: "AskUserQuestion",
};

// Reverse lookup
export const OPERATIONS_REV: Record<string, string> = Object.fromEntries(
  Object.entries(OPERATIONS).map(([k, v]) => [v, k])
);

// Status codes for compressed responses
export const STATUS_CODES: Record<string, string> = {
  "+": "success/created",
  "-": "deleted/removed",
  "~": "modified/updated",
  "!": "error",
  "?": "need info",
  "#": "count prefix (e.g. #15 = 15 items)",
  ok: "success with no notable output",
  d: "done",
};

// Common path prefixes
export const PATH_PREFIXES: Record<string, string> = {
  "~": "$HOME",
  ".": "$CWD",
  "^": "$CWD/..",
  "~n": "node_modules",
  "~p": "package.json",
  "~t": "tsconfig.json",
  "~g": ".gitignore",
  "~c": ".claude",
  "~s": "src",
  "~d": "dist",
};

// Common code snippets
export const CODE_SNIPPETS: Record<string, string> = {
  ".log": "console.log",
  ".fn": "function",
  ".af": "async function",
  ".aw": "await",
  ".ex": "export default",
  ".im": "import",
  ".rt": "return",
  ".cl": "class",
  ".ct": "const",
  ".lt": "let",
  ".if": "interface",
  ".tp": "type",
};

// Bash command shortcuts
export const BASH_SHORTCUTS: Record<string, string> = {
  gi: "git init",
  gs: "git status",
  gd: "git diff",
  gc: "git commit",
  gp: "git push",
  gl: "git log --oneline",
  ga: "git add",
  gb: "git branch",
  gco: "git checkout",
  ni: "npm install",
  nr: "npm run",
  nb: "npm run build",
  nt: "npm run test",
  nd: "npm run dev",
  yi: "yarn install",
  yr: "yarn run",
  pi: "pip install",
  ct: "curl -s",
  mk: "mkdir -p",
  ch: "chmod",
  tf: "touch",
  dc: "docker compose",
  dr: "docker run",
  db: "docker build",
  pv: "python -m venv",
  pa: "pip install -r requirements.txt",
  py: "python",
  bn: "bun",
  br: "bun run",
  pn: "pnpm",
  pr: "pnpm run",
};

export const FULL_SPEC: ProtocolSpec = {
  version: PROTOCOL_VERSION,
  operations: OPERATIONS,
  statusCodes: STATUS_CODES,
  pathPrefixes: PATH_PREFIXES,
  codeSnippets: CODE_SNIPPETS,
};

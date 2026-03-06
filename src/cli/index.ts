#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { homedir, platform } from "os";
import { execSync } from "child_process";
import { detectPresets, ALL_PRESETS } from "../presets/index.js";
import { loadPersisted, getDictPath } from "../mcp-server/persistence.js";

// Resolve and validate MCP server path
function getServerPath(): string {
  return resolve(join(__dirname, "..", "mcp-server", "index.js"));
}

function validateServerPath(): boolean {
  const serverPath = getServerPath();
  if (!existsSync(serverPath)) {
    console.error(`\n  [!!] MCP server file not found: ${serverPath}`);
    console.error(`  TypeScript may not have compiled.`);
    console.error(`  Fix: cd ${resolve(join(__dirname, "..", ".."))} && npm run build`);
    return false;
  }
  return true;
}

function getSamMcpConfig() {
  return {
    command: "node",
    args: [getServerPath()],
  };
}

// Detect Claude Code version
function getClaudeVersion(): string | null {
  try {
    const out = execSync("claude --version 2>/dev/null || echo ''", { encoding: "utf-8", timeout: 5000 }).trim();
    // Output is like "2.1.70 (Claude Code)" or empty
    const match = out.match(/^(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// All possible Claude Code MCP config locations
function getClaudeSettingsPaths(): string[] {
  const home = homedir();
  const paths: string[] = [];
  const os = platform();

  // Standard: ~/.claude/settings.json (all platforms)
  paths.push(join(home, ".claude", "settings.json"));

  // Global .mcp.json in home (works as fallback for newer versions)
  paths.push(join(home, ".mcp.json"));

  // XDG config on Linux: ~/.config/claude/settings.json
  if (os === "linux") {
    const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, ".config");
    paths.push(join(xdgConfig, "claude", "settings.json"));
  }

  // macOS: ~/Library/Application Support/Claude/settings.json
  if (os === "darwin") {
    paths.push(join(home, "Library", "Application Support", "Claude", "settings.json"));
  }

  // Windows: %APPDATA%/Claude/settings.json
  if (os === "win32" && process.env.APPDATA) {
    paths.push(join(process.env.APPDATA, "Claude", "settings.json"));
  }

  return paths;
}

// Find existing settings file, or return default path
function findClaudeSettings(): { path: string; exists: boolean } {
  const candidates = getClaudeSettingsPaths();

  for (const p of candidates) {
    if (existsSync(p)) {
      return { path: p, exists: true };
    }
  }

  return { path: candidates[0], exists: false };
}

function registerMcpInFile(settingsPath: string, quiet: boolean = false): boolean {
  const dir = resolve(settingsPath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let config: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      config = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      if (!quiet) console.error("  [!!] Could not parse " + settingsPath + " — using defaults");
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }
  const servers = config.mcpServers as Record<string, unknown>;

  if (servers["sam"]) {
    if (!quiet) console.log("  ~ SAM already registered in " + settingsPath);
    return true;
  }

  servers["sam"] = getSamMcpConfig();

  try {
    writeFileSync(settingsPath, JSON.stringify(config, null, 2));
  } catch (e: any) {
    if (e.code === "EACCES") {
      if (!quiet) {
        console.error(`  [!!] Permission denied writing to ${settingsPath}`);
        console.error(`  Try: chmod 644 ${settingsPath}`);
      }
      return false;
    }
    if (!quiet) console.error(`  [!!] Failed to write ${settingsPath}: ${e.message}`);
    return false;
  }

  // Verify write
  try {
    const written = JSON.parse(readFileSync(settingsPath, "utf-8"));
    if (!written.mcpServers?.sam) {
      if (!quiet) console.error("  [!!] Registration failed — sam not found after write");
      return false;
    }
  } catch {
    if (!quiet) console.error("  [!!] Could not verify registration");
    return false;
  }

  if (!quiet) console.log("  + Registered in " + settingsPath);
  return true;
}

// SAM instructions for global CLAUDE.md
const SAM_GLOBAL_INSTRUCTIONS = `
# SAM (Super Access Memory)

SAM is installed globally as an MCP server for Claude Code.

## If SAM tools (sl_spec, sl_read, etc.) are NOT available

Run these commands to fix:
\`\`\`bash
sam doctor                    # diagnose the issue
sam install                   # re-register MCP server
\`\`\`

If \`sam\` command is not found:
\`\`\`bash
npm install -g github:0xMoonStarz/SAM
\`\`\`

## If SAM tools ARE available

Your FIRST action in every conversation MUST be \`sl_spec\`. This loads the protocol, restores memory, and registers project files.

## MCP Server Locations

SAM registers in both \`~/.claude/settings.json\` and \`~/.mcp.json\`.
If Claude Code doesn't load SAM, copy \`~/.mcp.json\` to the project directory:
\`\`\`bash
cp ~/.mcp.json ./.mcp.json
\`\`\`

## Quick Reference

- \`sl_spec\` — load protocol + restore memory (ALWAYS FIRST)
- \`sl_read\` — read files compressed (instead of Read)
- \`sl_bash\` — run commands compressed (instead of Bash)
- \`sl_file\` — register file path as $N alias
- \`sl_context add "note"\` — save to persistent journal
- \`sl_snapshot "label"\` — save full session state
- \`sam doctor\` — diagnose issues
- \`sam update\` — update to latest version
`.trim();

const SAM_MARKER = "# SAM (Super Access Memory)";

function installGlobalClaudeMd(quiet: boolean = false): void {
  try {
    const claudeMdPath = join(homedir(), ".claude", "CLAUDE.md");
    const claudeDir = join(homedir(), ".claude");
    if (!existsSync(claudeDir)) mkdirSync(claudeDir, { recursive: true });

    if (existsSync(claudeMdPath)) {
      const existing = readFileSync(claudeMdPath, "utf-8");
      if (existing.includes(SAM_MARKER)) {
        // Replace existing SAM section
        const before = existing.split(SAM_MARKER)[0].trimEnd();
        // Find end of SAM section (next # heading at same level or EOF)
        const afterMarker = existing.substring(existing.indexOf(SAM_MARKER) + SAM_MARKER.length);
        const nextHeadingMatch = afterMarker.match(/\n# [^#]/);
        const after = nextHeadingMatch
          ? afterMarker.substring(nextHeadingMatch.index!)
          : "";
        writeFileSync(claudeMdPath, (before ? before + "\n\n" : "") + SAM_GLOBAL_INSTRUCTIONS + after);
        if (!quiet) console.log("  ~ Updated SAM section in ~/.claude/CLAUDE.md");
      } else {
        writeFileSync(claudeMdPath, existing.trimEnd() + "\n\n" + SAM_GLOBAL_INSTRUCTIONS + "\n");
        if (!quiet) console.log("  + Appended SAM instructions to ~/.claude/CLAUDE.md");
      }
    } else {
      writeFileSync(claudeMdPath, SAM_GLOBAL_INSTRUCTIONS + "\n");
      if (!quiet) console.log("  + Created ~/.claude/CLAUDE.md with SAM instructions");
    }
  } catch {
    if (!quiet) console.error("  [!!] Could not write to ~/.claude/CLAUDE.md");
  }
}

// === COMMANDS ===

function postinstallCmd(): void {
  // Called automatically by npm postinstall
  // Must NEVER throw or exit non-zero — would break npm install
  try {
    if (!existsSync(getServerPath())) return; // dist not ready yet, skip silently

    // Register in settings.json (primary)
    const { path } = findClaudeSettings();
    registerMcpInFile(path, true);

    // Also register in ~/.mcp.json (fallback for versions that use it)
    const mcpJsonPath = join(homedir(), ".mcp.json");
    registerMcpInFile(mcpJsonPath, true);

    // Add SAM instructions to global CLAUDE.md
    installGlobalClaudeMd(true);
  } catch {
    // Silently ignore all errors — postinstall must not fail
  }
}

function installCmd(): void {
  console.log("\nSAM Install");
  console.log("===========\n");

  // Validate server exists
  if (!validateServerPath()) {
    process.exit(1);
  }

  // Detect Claude Code
  const claudeVersion = getClaudeVersion();
  if (claudeVersion) {
    console.log("  Claude Code: v" + claudeVersion);
  } else {
    console.log("  Claude Code: not found in PATH (install from https://docs.anthropic.com/en/docs/claude-code)");
  }
  console.log("  MCP Server:  " + getServerPath());
  console.log("");

  // Register in primary settings location
  const { path, exists } = findClaudeSettings();
  let registered = false;

  if (exists) {
    console.log("  Found: " + path);
    registered = registerMcpInFile(path);
  } else {
    console.log("  Creating: " + path);
    registered = registerMcpInFile(path);
  }

  // Also register in ~/.mcp.json as fallback
  const mcpJsonPath = join(homedir(), ".mcp.json");
  registerMcpInFile(mcpJsonPath);

  if (!registered) {
    console.log("");
    console.log("  [!!] Could not register in primary location.");
    console.log("  SAM was registered in ~/.mcp.json as fallback.");
    console.log("  Check these locations manually:");
    for (const c of getClaudeSettingsPaths()) {
      console.log("    " + c);
    }
  }

  // Global CLAUDE.md with SAM instructions
  installGlobalClaudeMd();

  // CLAUDE.md in current project
  installClaudeMd();
  detectAndReport();
  console.log("\n  Restart Claude Code to activate SAM.");
}

function installClaudeMd(): void {
  const cwd = process.cwd();
  const claudeMdPath = join(cwd, "CLAUDE.md");
  const templatePath = resolve(join(__dirname, "..", "..", "templates", "CLAUDE.md.template"));

  if (!existsSync(templatePath)) {
    console.error("\n  [!!] Template not found: " + templatePath);
    console.error("  __dirname: " + __dirname);
    return;
  }

  const template = readFileSync(templatePath, "utf-8");

  if (existsSync(claudeMdPath)) {
    const existing = readFileSync(claudeMdPath, "utf-8");
    if (existing.includes("SAM Token Compression") || existing.includes("SAMlang") || existing.includes("sl_spec")) {
      console.log("  ~ CLAUDE.md already has SAM protocol");
      return;
    }
    writeFileSync(claudeMdPath, existing + "\n\n" + template);
    console.log("  ~ Appended SAM protocol to CLAUDE.md");
  } else {
    writeFileSync(claudeMdPath, template);
    console.log("  + Created CLAUDE.md with SAM protocol");
  }
}

function detectAndReport(): void {
  const cwd = process.cwd();
  const presets = detectPresets(cwd);
  if (presets.length > 0) {
    console.log("  Detected: " + presets.map((p) => p.name).join(", "));
  }
}

function uninstallCmd(): void {
  console.log("\nSAM Uninstall");
  console.log("=============\n");

  const candidates = getClaudeSettingsPaths();
  let removed = false;

  for (const settingsPath of candidates) {
    if (!existsSync(settingsPath)) continue;
    try {
      const config = JSON.parse(readFileSync(settingsPath, "utf-8"));
      let changed = false;
      if (config.mcpServers?.sam) { delete config.mcpServers.sam; changed = true; }
      if (config.mcpServers?.samlang) { delete config.mcpServers.samlang; changed = true; }
      if (changed) {
        writeFileSync(settingsPath, JSON.stringify(config, null, 2));
        console.log("  - Removed from " + settingsPath);
        removed = true;
      }
    } catch { /* skip */ }
  }

  const legacyPath = join(homedir(), ".claude.json");
  if (existsSync(legacyPath)) {
    try {
      const config = JSON.parse(readFileSync(legacyPath, "utf-8"));
      let changed = false;
      if (config.projects) {
        for (const proj of Object.values(config.projects) as Record<string, unknown>[]) {
          const servers = proj.mcpServers as Record<string, unknown> | undefined;
          if (servers?.samlang) { delete servers.samlang; changed = true; }
          if (servers?.sam) { delete servers.sam; changed = true; }
        }
      }
      if (changed) {
        writeFileSync(legacyPath, JSON.stringify(config, null, 2));
        console.log("  - Cleaned legacy entries from ~/.claude.json");
        removed = true;
      }
    } catch { /* skip */ }
  }

  if (!removed) console.log("  No SAM registration found to remove.");
}

function updateCmd(): void {
  console.log("\nSAM Update");
  console.log("==========\n");

  const os = platform();
  const cmd = os === "win32"
    ? "npm install -g github:0xMoonStarz/SAM"
    : "npm install -g github:0xMoonStarz/SAM";

  console.log("  Running: " + cmd);
  try {
    // Try without sudo first
    execSync(cmd, { stdio: "inherit", timeout: 60000 });
    console.log("\n  Updated! Restart Claude Code to use the new version.");
  } catch {
    if (os !== "win32") {
      console.log("  Retrying with sudo...");
      try {
        execSync("sudo " + cmd, { stdio: "inherit", timeout: 60000 });
        console.log("\n  Updated! Restart Claude Code to use the new version.");
        return;
      } catch { /* fall through */ }
    }
    console.log("\n  [!!] Update failed.");
    if (os === "win32") {
      console.log("  Try running as Administrator.");
    } else {
      console.log("  Try: curl -fsSL https://raw.githubusercontent.com/0xMoonStarz/SAM/main/install.sh | bash");
    }
  }
}

function statusCmd(): void {
  console.log("\nSAM Status");
  console.log("==========\n");

  const candidates = getClaudeSettingsPaths();
  let found = false;

  for (const settingsPath of candidates) {
    if (!existsSync(settingsPath)) continue;
    try {
      const config = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (config.mcpServers?.sam) {
        const serverPath = config.mcpServers.sam.args?.[0] || "unknown";
        const serverExists = existsSync(serverPath);
        console.log("  MCP Server: REGISTERED");
        console.log("  Settings:   " + settingsPath);
        console.log("  Server:     " + serverPath + (serverExists ? "" : " [MISSING]"));
        found = true;
        break;
      }
    } catch { /* skip */ }
  }

  if (!found) {
    console.log("  MCP Server: NOT REGISTERED");
    console.log("  Run: sam install");
  }

  const persisted = loadPersisted();
  console.log(`  Dictionary: ${Object.keys(persisted.files).length} files, ${Object.keys(persisted.custom).length} custom`);
  console.log(`  Presets:    ${persisted.presets.length ? persisted.presets.join(", ") : "none"}`);
  console.log(`  Version:    1.0.0`);
}

function doctorCmd(): void {
  console.log("\nSAM Doctor");
  console.log("==========\n");
  let issues = 0;

  // Node version
  const nodeVer = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeVer >= 18) {
    console.log("  [OK] Node.js " + process.versions.node);
  } else {
    console.log("  [!!] Node.js " + process.versions.node + " — need >= 18");
    issues++;
  }

  // Claude Code version
  const claudeVer = getClaudeVersion();
  if (claudeVer) {
    console.log("  [OK] Claude Code " + claudeVer);
  } else {
    console.log("  [--] Claude Code not found in PATH");
  }

  // Server file
  const serverPath = getServerPath();
  if (existsSync(serverPath)) {
    console.log("  [OK] Server: " + serverPath);
  } else {
    console.log("  [!!] Server missing: " + serverPath);
    console.log("       Fix: npm run build");
    issues++;
  }

  // Settings
  console.log("");
  const candidates = getClaudeSettingsPaths();
  let foundSettings = false;
  let serverRegistered = false;
  let registeredPath = "";

  for (const p of candidates) {
    const exists = existsSync(p);
    let hasSam = false;
    if (exists) {
      try {
        const config = JSON.parse(readFileSync(p, "utf-8"));
        hasSam = !!config.mcpServers?.sam;
        if (hasSam) registeredPath = config.mcpServers.sam.args?.[0] || "";
      } catch { /* skip */ }
    }
    const status = !exists ? "--" : hasSam ? "OK" : "..";
    const label = !exists ? "not found" : hasSam ? "SAM registered" : "exists, no SAM";
    console.log(`  [${status}] ${p} (${label})`);
    if (exists) foundSettings = true;
    if (hasSam) serverRegistered = true;
  }

  if (!foundSettings) {
    console.log("  [!!] No Claude settings found");
    issues++;
  } else if (!serverRegistered) {
    console.log("  [!!] SAM not registered. Run: sam install");
    issues++;
  }

  // Validate registered path points to existing file
  if (serverRegistered && registeredPath) {
    if (!existsSync(registeredPath)) {
      console.log(`\n  [!!] Registered server path doesn't exist: ${registeredPath}`);
      console.log("       Fix: sam install (to re-register with correct path)");
      issues++;
    }
  }

  // Dictionary
  const dictPath = getDictPath();
  if (existsSync(dictPath)) {
    try {
      JSON.parse(readFileSync(dictPath, "utf-8"));
      console.log("  [OK] Dictionary: " + dictPath);
    } catch {
      console.log("  [!!] Dictionary corrupted: " + dictPath);
      issues++;
    }
  } else {
    console.log("  [--] Dictionary: not yet created (normal)");
  }

  console.log(`\n${issues === 0 ? "  All good! Restart Claude Code if SAM isn't active yet." : "  " + issues + " issue(s) found."}`);
}

function showPresets(): void {
  console.log("Available presets:\n");
  for (const p of ALL_PRESETS) {
    console.log(`  ${p.name}`);
    console.log(`    Detects: ${p.detect.join(", ")}`);
    console.log(`    Paths: ${Object.keys(p.paths).join(", ")}`);
    console.log(`    Snippets: ${Object.keys(p.snippets).join(", ")}`);
    console.log();
  }
}

function showDict(): void {
  const persisted = loadPersisted();
  console.log(`Dictionary: ${getDictPath()}\n`);
  console.log(`Files (${Object.keys(persisted.files).length}):`);
  for (const [alias, path] of Object.entries(persisted.files)) {
    console.log(`  ${alias} = ${path}`);
  }
  console.log(`\nCustom (${Object.keys(persisted.custom).length}):`);
  for (const [alias, value] of Object.entries(persisted.custom)) {
    console.log(`  ${alias} = ${value}`);
  }
  console.log(`\nPresets: ${persisted.presets.length ? persisted.presets.join(", ") : "none"}`);
}

function showHelp(): void {
  console.log(`
SAM v1.0 - Serialized Abstraction Machine for Claude Code

Install:
  npm install -g github:0xMoonStarz/SAM    # auto-registers MCP server

Commands:
  install    Register MCP server + create CLAUDE.md in current project
  uninstall  Remove SAM from Claude settings
  update     Update SAM to latest version from GitHub
  status     Show registration status
  doctor     Diagnose issues
  presets    Show framework presets
  dict       Show persisted dictionary
  help       Show this message
`);
}

// === MAIN ===

const command = process.argv[2];

switch (command) {
  case "postinstall":
    postinstallCmd();
    break;
  case "install":
    installCmd();
    break;
  case "uninstall":
    uninstallCmd();
    break;
  case "update":
    updateCmd();
    break;
  case "status":
    statusCmd();
    break;
  case "doctor":
    doctorCmd();
    break;
  case "presets":
    showPresets();
    break;
  case "dict":
    showDict();
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    showHelp();
    break;
  default:
    console.error(`! Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}

#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const child_process_1 = require("child_process");
const index_js_1 = require("../presets/index.js");
const persistence_js_1 = require("../mcp-server/persistence.js");
const SAM_MCP_CONFIG = {
    command: "node",
    args: [(0, path_1.resolve)((0, path_1.join)(__dirname, "..", "mcp-server", "index.js"))],
};
function getClaudeSettingsPath() {
    const dir = (0, path_1.join)((0, os_1.homedir)(), ".claude");
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    return (0, path_1.join)(dir, "settings.json");
}
function installMcpServer() {
    const settingsPath = getClaudeSettingsPath();
    let config = {};
    if ((0, fs_1.existsSync)(settingsPath)) {
        try {
            config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
        }
        catch {
            console.error("! Could not parse " + settingsPath + " — using defaults");
        }
    }
    // Install globally in ~/.claude/settings.json
    if (!config.mcpServers || typeof config.mcpServers !== "object") {
        config.mcpServers = {};
    }
    const servers = config.mcpServers;
    if (servers["sam"]) {
        console.log("~ SAM already registered globally");
        return;
    }
    servers["sam"] = SAM_MCP_CONFIG;
    (0, fs_1.writeFileSync)(settingsPath, JSON.stringify(config, null, 2));
    console.log("+ SAM MCP server registered globally in ~/.claude/settings.json");
}
function installClaudeMd() {
    const cwd = process.cwd();
    const claudeMdPath = (0, path_1.join)(cwd, "CLAUDE.md");
    const templatePath = (0, path_1.resolve)((0, path_1.join)(__dirname, "..", "..", "templates", "CLAUDE.md.template"));
    if (!(0, fs_1.existsSync)(templatePath)) {
        console.error("! Template not found:", templatePath);
        process.exit(1);
    }
    const template = (0, fs_1.readFileSync)(templatePath, "utf-8");
    if ((0, fs_1.existsSync)(claudeMdPath)) {
        const existing = (0, fs_1.readFileSync)(claudeMdPath, "utf-8");
        if (existing.includes("SAM Token Compression") || existing.includes("SAMlang")) {
            console.log("~ CLAUDE.md already has SAM protocol");
            return;
        }
        (0, fs_1.writeFileSync)(claudeMdPath, existing + "\n\n" + template);
        console.log("~ Appended SAM protocol to CLAUDE.md");
    }
    else {
        (0, fs_1.writeFileSync)(claudeMdPath, template);
        console.log("+ Created CLAUDE.md with SAM protocol");
    }
}
function detectAndReport() {
    const cwd = process.cwd();
    const presets = (0, index_js_1.detectPresets)(cwd);
    if (presets.length > 0) {
        console.log(`Detected frameworks: ${presets.map((p) => p.name).join(", ")}`);
        console.log("Presets will be auto-loaded when SAM MCP server starts.");
    }
    else {
        console.log("No framework presets detected. Base protocol active.");
    }
}
function showPresets() {
    console.log("Available presets:\n");
    for (const p of index_js_1.ALL_PRESETS) {
        console.log(`  ${p.name}`);
        console.log(`    Detects: ${p.detect.join(", ")}`);
        console.log(`    Paths: ${Object.keys(p.paths).join(", ")}`);
        console.log(`    Snippets: ${Object.keys(p.snippets).join(", ")}`);
        console.log();
    }
}
function showDict() {
    const persisted = (0, persistence_js_1.loadPersisted)();
    console.log(`Dictionary: ${(0, persistence_js_1.getDictPath)()}\n`);
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
function showHelp() {
    console.log(`
SAM v1.0 - Serialized Abstraction Machine for Claude Code

Commands:
  install    Install SAM MCP server globally + CLAUDE.md protocol in current project
  uninstall  Remove SAM from Claude settings
  status     Show SAM registration status and dictionary info
  doctor     Diagnose configuration issues
  presets    Show available framework presets
  dict       Show persisted dictionary
  help       Show this message

Usage:
  npm install -g sam-cc
  sam install           # global MCP + CLAUDE.md in current dir
  sam status            # check if SAM is active
  sam doctor            # diagnose issues
`);
}
function uninstall() {
    // Remove from global settings
    const settingsPath = getClaudeSettingsPath();
    if ((0, fs_1.existsSync)(settingsPath)) {
        let config;
        try {
            config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
        }
        catch {
            return;
        }
        if (config.mcpServers?.sam) {
            delete config.mcpServers.sam;
            (0, fs_1.writeFileSync)(settingsPath, JSON.stringify(config, null, 2));
            console.log("- Removed SAM MCP server from global settings");
        }
        // Also clean legacy "samlang" entries
        if (config.mcpServers?.samlang) {
            delete config.mcpServers.samlang;
            (0, fs_1.writeFileSync)(settingsPath, JSON.stringify(config, null, 2));
            console.log("- Removed legacy samlang entry");
        }
    }
    // Also clean legacy per-project entries in ~/.claude.json
    const legacyPath = (0, path_1.join)((0, os_1.homedir)(), ".claude.json");
    if ((0, fs_1.existsSync)(legacyPath)) {
        let config;
        try {
            config = JSON.parse((0, fs_1.readFileSync)(legacyPath, "utf-8"));
        }
        catch {
            return;
        }
        let changed = false;
        if (config.projects) {
            for (const proj of Object.values(config.projects)) {
                const servers = proj.mcpServers;
                if (servers?.samlang) {
                    delete servers.samlang;
                    changed = true;
                }
                if (servers?.sam) {
                    delete servers.sam;
                    changed = true;
                }
            }
        }
        if (changed) {
            (0, fs_1.writeFileSync)(legacyPath, JSON.stringify(config, null, 2));
            console.log("- Cleaned legacy per-project entries from ~/.claude.json");
        }
    }
}
function update() {
    const repoDir = (0, path_1.resolve)((0, path_1.join)(__dirname, "..", ".."));
    const gitDir = (0, path_1.join)(repoDir, ".git");
    if (!(0, fs_1.existsSync)(gitDir)) {
        console.log("! Not a git repository. If you installed via npm, run:");
        console.log("  npm install -g sam-cc@latest");
        return;
    }
    console.log("SAM Update");
    console.log("==========");
    try {
        console.log("  Fetching from origin...");
        (0, child_process_1.execSync)("git fetch origin main --quiet", { cwd: repoDir, timeout: 10000, stdio: ["pipe", "pipe", "pipe"] });
        const local = (0, child_process_1.execSync)("git rev-parse HEAD", { cwd: repoDir, encoding: "utf-8" }).trim();
        const remote = (0, child_process_1.execSync)("git rev-parse origin/main", { cwd: repoDir, encoding: "utf-8" }).trim();
        if (local === remote) {
            console.log("  Already up to date. (" + local.slice(0, 7) + ")");
            return;
        }
        const behind = (0, child_process_1.execSync)("git rev-list HEAD..origin/main --count", { cwd: repoDir, encoding: "utf-8" }).trim();
        console.log(`  ${behind} new commit(s) available`);
        console.log("  Pulling changes...");
        (0, child_process_1.execSync)("git pull origin main --quiet", { cwd: repoDir, timeout: 15000, stdio: ["pipe", "pipe", "pipe"] });
        console.log("  Building...");
        (0, child_process_1.execSync)("npm run build", { cwd: repoDir, timeout: 30000, stdio: ["pipe", "pipe", "pipe"] });
        const newHead = (0, child_process_1.execSync)("git rev-parse HEAD", { cwd: repoDir, encoding: "utf-8" }).trim();
        console.log(`  Updated: ${local.slice(0, 7)} -> ${newHead.slice(0, 7)}`);
        // Show what changed
        try {
            const log = (0, child_process_1.execSync)(`git log --oneline ${local}..${newHead}`, { cwd: repoDir, encoding: "utf-8" }).trim();
            console.log("\n  Changes:");
            for (const line of log.split("\n")) {
                console.log("    " + line);
            }
        }
        catch { /* ignore */ }
        console.log("\n+ SAM updated. Restart Claude Code to use the new version.");
    }
    catch (e) {
        const err = e;
        console.error("! Update failed: " + (err.message || "unknown error"));
    }
}
function showStatus() {
    const settingsPath = getClaudeSettingsPath();
    console.log("SAM Status");
    console.log("==========");
    // Check global registration
    if ((0, fs_1.existsSync)(settingsPath)) {
        try {
            const config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
            if (config.mcpServers?.sam) {
                console.log("  MCP Server: REGISTERED (global)");
                console.log("  Server path: " + (config.mcpServers.sam.args?.[0] || "unknown"));
            }
            else {
                console.log("  MCP Server: NOT REGISTERED");
                console.log("  Run: sam install");
            }
        }
        catch {
            console.log("  MCP Server: ERROR reading settings.json");
        }
    }
    else {
        console.log("  MCP Server: NOT REGISTERED (no settings.json)");
    }
    // Check dictionary
    const persisted = (0, persistence_js_1.loadPersisted)();
    const fileCount = Object.keys(persisted.files).length;
    const customCount = Object.keys(persisted.custom).length;
    console.log(`  Dictionary: ${fileCount} files, ${customCount} custom aliases`);
    console.log(`  Presets: ${persisted.presets.length ? persisted.presets.join(", ") : "none"}`);
    console.log(`  Version: 1.0.0`);
}
function doctor() {
    console.log("SAM Doctor");
    console.log("==========");
    let issues = 0;
    // Node version
    const nodeVer = parseInt(process.versions.node.split('.')[0], 10);
    if (nodeVer >= 18) {
        console.log("  [OK] Node.js " + process.versions.node);
    }
    else {
        console.log("  [!!] Node.js " + process.versions.node + " — need >= 18");
        issues++;
    }
    // Settings.json
    const settingsPath = getClaudeSettingsPath();
    if ((0, fs_1.existsSync)(settingsPath)) {
        try {
            const config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
            if (config.mcpServers?.sam) {
                const serverPath = config.mcpServers.sam.args?.[0];
                if (serverPath && (0, fs_1.existsSync)(serverPath)) {
                    console.log("  [OK] MCP server registered and file exists");
                }
                else {
                    console.log("  [!!] MCP server registered but file missing: " + serverPath);
                    issues++;
                }
            }
            else {
                console.log("  [!!] MCP server not registered. Run: sam install");
                issues++;
            }
        }
        catch {
            console.log("  [!!] settings.json is corrupted");
            issues++;
        }
    }
    else {
        console.log("  [!!] No ~/.claude/settings.json found");
        issues++;
    }
    // Dictionary
    const dictPath = (0, persistence_js_1.getDictPath)();
    if ((0, fs_1.existsSync)(dictPath)) {
        try {
            JSON.parse((0, fs_1.readFileSync)(dictPath, "utf-8"));
            console.log("  [OK] Dictionary file valid");
        }
        catch {
            console.log("  [!!] Dictionary file corrupted: " + dictPath);
            issues++;
        }
    }
    else {
        console.log("  [--] No dictionary file yet (created on first use)");
    }
    // dist/ check
    const distPath = (0, path_1.join)(__dirname, "..", "mcp-server", "index.js");
    if ((0, fs_1.existsSync)(distPath)) {
        console.log("  [OK] Compiled server exists");
    }
    else {
        console.log("  [!!] dist/mcp-server/index.js missing. Run: npm run build");
        issues++;
    }
    console.log(`\n${issues === 0 ? "All good!" : issues + " issue(s) found."}`);
}
const command = process.argv[2];
switch (command) {
    case "install":
        installMcpServer();
        installClaudeMd();
        detectAndReport();
        console.log("\nd SAM installed globally. Restart Claude Code to activate.");
        break;
    case "uninstall":
        uninstall();
        break;
    case "status":
        showStatus();
        break;
    case "doctor":
        doctor();
        break;
    case "update":
        update();
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
//# sourceMappingURL=index.js.map
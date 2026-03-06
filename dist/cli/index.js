#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const index_js_1 = require("../presets/index.js");
const persistence_js_1 = require("../mcp-server/persistence.js");
const SAM_MCP_CONFIG = {
    command: "node",
    args: [(0, path_1.resolve)((0, path_1.join)(__dirname, "..", "mcp-server", "index.js"))],
};
// All possible Claude Code settings locations
function getClaudeSettingsPaths() {
    const home = (0, os_1.homedir)();
    const paths = [];
    const os = (0, os_1.platform)();
    // Standard: ~/.claude/settings.json (all platforms)
    paths.push((0, path_1.join)(home, ".claude", "settings.json"));
    // XDG config on Linux: ~/.config/claude/settings.json
    if (os === "linux") {
        const xdgConfig = process.env.XDG_CONFIG_HOME || (0, path_1.join)(home, ".config");
        paths.push((0, path_1.join)(xdgConfig, "claude", "settings.json"));
    }
    // macOS: ~/Library/Application Support/Claude/settings.json
    if (os === "darwin") {
        paths.push((0, path_1.join)(home, "Library", "Application Support", "Claude", "settings.json"));
    }
    // Windows: %APPDATA%/Claude/settings.json
    if (os === "win32" && process.env.APPDATA) {
        paths.push((0, path_1.join)(process.env.APPDATA, "Claude", "settings.json"));
    }
    return paths;
}
// Find existing settings file, or return default path
function findClaudeSettings() {
    const candidates = getClaudeSettingsPaths();
    // First check which ones already exist
    for (const p of candidates) {
        if ((0, fs_1.existsSync)(p)) {
            return { path: p, exists: true };
        }
    }
    // None exist — use the standard path
    return { path: candidates[0], exists: false };
}
function registerMcpInFile(settingsPath) {
    const dir = (0, path_1.resolve)(settingsPath, "..");
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    let config = {};
    if ((0, fs_1.existsSync)(settingsPath)) {
        try {
            config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
        }
        catch {
            console.error("  ! Could not parse " + settingsPath + " — using defaults");
        }
    }
    if (!config.mcpServers || typeof config.mcpServers !== "object") {
        config.mcpServers = {};
    }
    const servers = config.mcpServers;
    if (servers["sam"]) {
        console.log("  ~ SAM already registered in " + settingsPath);
        return true;
    }
    servers["sam"] = SAM_MCP_CONFIG;
    (0, fs_1.writeFileSync)(settingsPath, JSON.stringify(config, null, 2));
    console.log("  + Registered in " + settingsPath);
    return true;
}
function installMcpServer() {
    console.log("\nSAM Install");
    console.log("===========\n");
    console.log("MCP Server path: " + SAM_MCP_CONFIG.args[0]);
    console.log("");
    const { path, exists } = findClaudeSettings();
    if (exists) {
        console.log("Found Claude settings: " + path);
        registerMcpInFile(path);
    }
    else {
        // No settings found — register in default + warn
        console.log("No existing Claude settings found.");
        console.log("Creating default: " + path);
        registerMcpInFile(path);
        console.log("");
        console.log("  If Claude Code doesn't detect SAM after restart,");
        console.log("  check where your Claude stores settings:");
        const candidates = getClaudeSettingsPaths();
        for (const c of candidates) {
            console.log("    " + c);
        }
    }
}
function installClaudeMd() {
    const cwd = process.cwd();
    const claudeMdPath = (0, path_1.join)(cwd, "CLAUDE.md");
    const templatePath = (0, path_1.resolve)((0, path_1.join)(__dirname, "..", "..", "templates", "CLAUDE.md.template"));
    if (!(0, fs_1.existsSync)(templatePath)) {
        console.error("\n  ! Template not found: " + templatePath);
        return;
    }
    const template = (0, fs_1.readFileSync)(templatePath, "utf-8");
    if ((0, fs_1.existsSync)(claudeMdPath)) {
        const existing = (0, fs_1.readFileSync)(claudeMdPath, "utf-8");
        if (existing.includes("SAM Token Compression") || existing.includes("SAMlang") || existing.includes("sl_spec")) {
            console.log("  ~ CLAUDE.md already has SAM protocol");
            return;
        }
        (0, fs_1.writeFileSync)(claudeMdPath, existing + "\n\n" + template);
        console.log("  ~ Appended SAM protocol to CLAUDE.md");
    }
    else {
        (0, fs_1.writeFileSync)(claudeMdPath, template);
        console.log("  + Created CLAUDE.md with SAM protocol");
    }
}
function detectAndReport() {
    const cwd = process.cwd();
    const presets = (0, index_js_1.detectPresets)(cwd);
    if (presets.length > 0) {
        console.log("  Detected: " + presets.map((p) => p.name).join(", "));
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
  Linux/macOS:  sudo npm install -g github:0xMoonStarz/SAM
  Windows:      npm install -g github:0xMoonStarz/SAM  (as Administrator)

  sam install           # register MCP + create CLAUDE.md in current dir
  sam status            # check if SAM is active
  sam doctor            # diagnose issues
`);
}
function uninstall() {
    console.log("\nSAM Uninstall");
    console.log("=============\n");
    // Remove from all possible settings locations
    const candidates = getClaudeSettingsPaths();
    let removed = false;
    for (const settingsPath of candidates) {
        if (!(0, fs_1.existsSync)(settingsPath))
            continue;
        try {
            const config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
            let changed = false;
            if (config.mcpServers?.sam) {
                delete config.mcpServers.sam;
                changed = true;
            }
            if (config.mcpServers?.samlang) {
                delete config.mcpServers.samlang;
                changed = true;
            }
            if (changed) {
                (0, fs_1.writeFileSync)(settingsPath, JSON.stringify(config, null, 2));
                console.log("  - Removed from " + settingsPath);
                removed = true;
            }
        }
        catch { /* skip corrupted files */ }
    }
    // Also clean legacy ~/.claude.json
    const legacyPath = (0, path_1.join)((0, os_1.homedir)(), ".claude.json");
    if ((0, fs_1.existsSync)(legacyPath)) {
        try {
            const config = JSON.parse((0, fs_1.readFileSync)(legacyPath, "utf-8"));
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
                console.log("  - Cleaned legacy entries from ~/.claude.json");
                removed = true;
            }
        }
        catch { /* skip */ }
    }
    if (!removed) {
        console.log("  No SAM registration found to remove.");
    }
}
function showStatus() {
    console.log("\nSAM Status");
    console.log("==========\n");
    // Check all possible locations
    const candidates = getClaudeSettingsPaths();
    let found = false;
    for (const settingsPath of candidates) {
        if (!(0, fs_1.existsSync)(settingsPath))
            continue;
        try {
            const config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
            if (config.mcpServers?.sam) {
                console.log("  MCP Server: REGISTERED");
                console.log("  Settings:   " + settingsPath);
                console.log("  Server:     " + (config.mcpServers.sam.args?.[0] || "unknown"));
                found = true;
                break;
            }
        }
        catch { /* skip */ }
    }
    if (!found) {
        console.log("  MCP Server: NOT REGISTERED");
        console.log("  Run: sam install");
    }
    const persisted = (0, persistence_js_1.loadPersisted)();
    const fileCount = Object.keys(persisted.files).length;
    const customCount = Object.keys(persisted.custom).length;
    console.log(`  Dictionary: ${fileCount} files, ${customCount} custom aliases`);
    console.log(`  Presets:    ${persisted.presets.length ? persisted.presets.join(", ") : "none"}`);
    console.log(`  Version:    1.0.0`);
}
function doctor() {
    console.log("\nSAM Doctor");
    console.log("==========\n");
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
    // Check all settings locations
    const candidates = getClaudeSettingsPaths();
    let foundSettings = false;
    let serverRegistered = false;
    console.log("");
    console.log("  Settings locations checked:");
    for (const p of candidates) {
        const exists = (0, fs_1.existsSync)(p);
        let hasSam = false;
        if (exists) {
            try {
                const config = JSON.parse((0, fs_1.readFileSync)(p, "utf-8"));
                hasSam = !!config.mcpServers?.sam;
            }
            catch { /* skip */ }
        }
        const status = !exists ? "--" : hasSam ? "OK" : "..";
        const label = !exists ? "not found" : hasSam ? "SAM registered" : "exists, no SAM";
        console.log(`  [${status}] ${p} (${label})`);
        if (exists)
            foundSettings = true;
        if (hasSam)
            serverRegistered = true;
    }
    if (!foundSettings) {
        console.log("  [!!] No Claude settings file found anywhere");
        issues++;
    }
    else if (!serverRegistered) {
        console.log("  [!!] Settings found but SAM not registered. Run: sam install");
        issues++;
    }
    // Server file exists
    console.log("");
    const distPath = SAM_MCP_CONFIG.args[0];
    if ((0, fs_1.existsSync)(distPath)) {
        console.log("  [OK] Server file: " + distPath);
    }
    else {
        console.log("  [!!] Server file missing: " + distPath);
        issues++;
    }
    // Dictionary
    const dictPath = (0, persistence_js_1.getDictPath)();
    if ((0, fs_1.existsSync)(dictPath)) {
        try {
            JSON.parse((0, fs_1.readFileSync)(dictPath, "utf-8"));
            console.log("  [OK] Dictionary: " + dictPath);
        }
        catch {
            console.log("  [!!] Dictionary corrupted: " + dictPath);
            issues++;
        }
    }
    else {
        console.log("  [--] Dictionary: not created yet (normal on first run)");
    }
    console.log(`\n${issues === 0 ? "All good! Restart Claude Code if SAM isn't active yet." : issues + " issue(s) found."}`);
}
const command = process.argv[2];
switch (command) {
    case "install":
        installMcpServer();
        installClaudeMd();
        detectAndReport();
        console.log("\nRestart Claude Code to activate SAM.");
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
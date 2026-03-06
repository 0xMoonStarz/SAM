#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const child_process_1 = require("child_process");
const index_js_1 = require("../presets/index.js");
const persistence_js_1 = require("../mcp-server/persistence.js");
// Resolve and validate MCP server path
function getServerPath() {
    return (0, path_1.resolve)((0, path_1.join)(__dirname, "..", "mcp-server", "index.js"));
}
function validateServerPath() {
    const serverPath = getServerPath();
    if (!(0, fs_1.existsSync)(serverPath)) {
        console.error(`\n  [!!] MCP server file not found: ${serverPath}`);
        console.error(`  TypeScript may not have compiled.`);
        console.error(`  Fix: cd ${(0, path_1.resolve)((0, path_1.join)(__dirname, "..", ".."))} && npm run build`);
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
    for (const p of candidates) {
        if ((0, fs_1.existsSync)(p)) {
            return { path: p, exists: true };
        }
    }
    return { path: candidates[0], exists: false };
}
function registerMcpInFile(settingsPath, quiet = false) {
    const dir = (0, path_1.resolve)(settingsPath, "..");
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    let config = {};
    if ((0, fs_1.existsSync)(settingsPath)) {
        try {
            config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
        }
        catch {
            if (!quiet)
                console.error("  [!!] Could not parse " + settingsPath + " — using defaults");
        }
    }
    if (!config.mcpServers || typeof config.mcpServers !== "object") {
        config.mcpServers = {};
    }
    const servers = config.mcpServers;
    if (servers["sam"]) {
        if (!quiet)
            console.log("  ~ SAM already registered in " + settingsPath);
        return true;
    }
    servers["sam"] = getSamMcpConfig();
    try {
        (0, fs_1.writeFileSync)(settingsPath, JSON.stringify(config, null, 2));
    }
    catch (e) {
        if (e.code === "EACCES") {
            if (!quiet) {
                console.error(`  [!!] Permission denied writing to ${settingsPath}`);
                console.error(`  Try: chmod 644 ${settingsPath}`);
            }
            return false;
        }
        if (!quiet)
            console.error(`  [!!] Failed to write ${settingsPath}: ${e.message}`);
        return false;
    }
    // Verify write
    try {
        const written = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
        if (!written.mcpServers?.sam) {
            if (!quiet)
                console.error("  [!!] Registration failed — sam not found after write");
            return false;
        }
    }
    catch {
        if (!quiet)
            console.error("  [!!] Could not verify registration");
        return false;
    }
    if (!quiet)
        console.log("  + Registered in " + settingsPath);
    return true;
}
// === COMMANDS ===
function postinstallCmd() {
    // Called automatically by npm postinstall
    // Must NEVER throw or exit non-zero — would break npm install
    try {
        if (!(0, fs_1.existsSync)(getServerPath()))
            return; // dist not ready yet, skip silently
        const { path } = findClaudeSettings();
        registerMcpInFile(path, true); // quiet mode
    }
    catch {
        // Silently ignore all errors — postinstall must not fail
    }
}
function installCmd() {
    console.log("\nSAM Install");
    console.log("===========\n");
    // Validate server exists
    if (!validateServerPath()) {
        process.exit(1);
    }
    console.log("  MCP Server: " + getServerPath());
    console.log("");
    const { path, exists } = findClaudeSettings();
    if (exists) {
        console.log("  Found Claude settings: " + path);
        registerMcpInFile(path);
    }
    else {
        console.log("  No existing Claude settings found.");
        console.log("  Creating: " + path);
        registerMcpInFile(path);
        console.log("");
        console.log("  If Claude Code doesn't detect SAM after restart,");
        console.log("  check where your Claude stores settings:");
        for (const c of getClaudeSettingsPaths()) {
            console.log("    " + c);
        }
    }
    // CLAUDE.md in current project
    installClaudeMd();
    detectAndReport();
    console.log("\n  Restart Claude Code to activate SAM.");
}
function installClaudeMd() {
    const cwd = process.cwd();
    const claudeMdPath = (0, path_1.join)(cwd, "CLAUDE.md");
    const templatePath = (0, path_1.resolve)((0, path_1.join)(__dirname, "..", "..", "templates", "CLAUDE.md.template"));
    if (!(0, fs_1.existsSync)(templatePath)) {
        console.error("\n  [!!] Template not found: " + templatePath);
        console.error("  __dirname: " + __dirname);
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
function uninstallCmd() {
    console.log("\nSAM Uninstall");
    console.log("=============\n");
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
        catch { /* skip */ }
    }
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
    if (!removed)
        console.log("  No SAM registration found to remove.");
}
function updateCmd() {
    console.log("\nSAM Update");
    console.log("==========\n");
    const os = (0, os_1.platform)();
    const cmd = os === "win32"
        ? "npm install -g github:0xMoonStarz/SAM"
        : "npm install -g github:0xMoonStarz/SAM";
    console.log("  Running: " + cmd);
    try {
        // Try without sudo first
        (0, child_process_1.execSync)(cmd, { stdio: "inherit", timeout: 60000 });
        console.log("\n  Updated! Restart Claude Code to use the new version.");
    }
    catch {
        if (os !== "win32") {
            console.log("  Retrying with sudo...");
            try {
                (0, child_process_1.execSync)("sudo " + cmd, { stdio: "inherit", timeout: 60000 });
                console.log("\n  Updated! Restart Claude Code to use the new version.");
                return;
            }
            catch { /* fall through */ }
        }
        console.log("\n  [!!] Update failed.");
        if (os === "win32") {
            console.log("  Try running as Administrator.");
        }
        else {
            console.log("  Try: curl -fsSL https://raw.githubusercontent.com/0xMoonStarz/SAM/main/install.sh | bash");
        }
    }
}
function statusCmd() {
    console.log("\nSAM Status");
    console.log("==========\n");
    const candidates = getClaudeSettingsPaths();
    let found = false;
    for (const settingsPath of candidates) {
        if (!(0, fs_1.existsSync)(settingsPath))
            continue;
        try {
            const config = JSON.parse((0, fs_1.readFileSync)(settingsPath, "utf-8"));
            if (config.mcpServers?.sam) {
                const serverPath = config.mcpServers.sam.args?.[0] || "unknown";
                const serverExists = (0, fs_1.existsSync)(serverPath);
                console.log("  MCP Server: REGISTERED");
                console.log("  Settings:   " + settingsPath);
                console.log("  Server:     " + serverPath + (serverExists ? "" : " [MISSING]"));
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
    console.log(`  Dictionary: ${Object.keys(persisted.files).length} files, ${Object.keys(persisted.custom).length} custom`);
    console.log(`  Presets:    ${persisted.presets.length ? persisted.presets.join(", ") : "none"}`);
    console.log(`  Version:    1.0.0`);
}
function doctorCmd() {
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
    // Server file
    const serverPath = getServerPath();
    if ((0, fs_1.existsSync)(serverPath)) {
        console.log("  [OK] Server: " + serverPath);
    }
    else {
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
        const exists = (0, fs_1.existsSync)(p);
        let hasSam = false;
        if (exists) {
            try {
                const config = JSON.parse((0, fs_1.readFileSync)(p, "utf-8"));
                hasSam = !!config.mcpServers?.sam;
                if (hasSam)
                    registeredPath = config.mcpServers.sam.args?.[0] || "";
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
        console.log("  [!!] No Claude settings found");
        issues++;
    }
    else if (!serverRegistered) {
        console.log("  [!!] SAM not registered. Run: sam install");
        issues++;
    }
    // Validate registered path points to existing file
    if (serverRegistered && registeredPath) {
        if (!(0, fs_1.existsSync)(registeredPath)) {
            console.log(`\n  [!!] Registered server path doesn't exist: ${registeredPath}`);
            console.log("       Fix: sam install (to re-register with correct path)");
            issues++;
        }
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
        console.log("  [--] Dictionary: not yet created (normal)");
    }
    console.log(`\n${issues === 0 ? "  All good! Restart Claude Code if SAM isn't active yet." : "  " + issues + " issue(s) found."}`);
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
//# sourceMappingURL=index.js.map
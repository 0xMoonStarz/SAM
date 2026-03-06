"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPersisted = loadPersisted;
exports.savePersisted = savePersisted;
exports.validateFiles = validateFiles;
exports.getDictPath = getDictPath;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const CURRENT_VERSION = "0.2";
const SAM_DIR = (0, path_1.join)((0, os_1.homedir)(), ".sam");
const LEGACY_DIR = (0, path_1.join)((0, os_1.homedir)(), ".samlang");
const DICT_FILE = (0, path_1.join)(SAM_DIR, "dictionary.json");
function ensureDir() {
    if (!(0, fs_1.existsSync)(SAM_DIR)) {
        (0, fs_1.mkdirSync)(SAM_DIR, { recursive: true });
    }
}
function migrateFromLegacy() {
    const legacyDict = (0, path_1.join)(LEGACY_DIR, "dictionary.json");
    if ((0, fs_1.existsSync)(LEGACY_DIR) && (0, fs_1.existsSync)(legacyDict) && !(0, fs_1.existsSync)(DICT_FILE)) {
        ensureDir();
        try {
            (0, fs_1.cpSync)(legacyDict, DICT_FILE);
            (0, fs_1.rmSync)(LEGACY_DIR, { recursive: true, force: true });
        }
        catch { /* migration is best-effort */ }
    }
}
const DEFAULT_DICT = { version: CURRENT_VERSION, files: {}, custom: {}, presets: [] };
function loadPersisted() {
    migrateFromLegacy();
    ensureDir();
    if (!(0, fs_1.existsSync)(DICT_FILE)) {
        return { ...DEFAULT_DICT };
    }
    try {
        const data = JSON.parse((0, fs_1.readFileSync)(DICT_FILE, "utf-8"));
        // Version migration: ensure all expected fields exist
        return {
            version: data.version || CURRENT_VERSION,
            files: data.files || {},
            custom: data.custom || {},
            presets: data.presets || [],
            macros: data.macros || {},
        };
    }
    catch {
        return { ...DEFAULT_DICT };
    }
}
function savePersisted(dict) {
    ensureDir();
    (0, fs_1.writeFileSync)(DICT_FILE, JSON.stringify(dict, null, 2));
}
function validateFiles(files) {
    const valid = {};
    for (const [alias, path] of Object.entries(files)) {
        if ((0, fs_1.existsSync)(path)) {
            valid[alias] = path;
        }
    }
    return valid;
}
function getDictPath() {
    return DICT_FILE;
}
//# sourceMappingURL=persistence.js.map
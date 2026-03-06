"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dictionary = void 0;
const spec_js_1 = require("../protocol/spec.js");
const persistence_js_1 = require("./persistence.js");
const macros_js_1 = require("./macros.js");
class Dictionary {
    operations = spec_js_1.OPERATIONS;
    operationsRev = spec_js_1.OPERATIONS_REV;
    pathPrefixes = spec_js_1.PATH_PREFIXES;
    bashShortcuts = spec_js_1.BASH_SHORTCUTS;
    statusCodes = spec_js_1.STATUS_CODES;
    fileAliases = new Map();
    fileAliasCounter = 0;
    urlAliases = new Map();
    urlAliasRev = new Map();
    customAliases = new Map();
    // Preset-loaded snippets and paths
    presetSnippets = new Map();
    presetPaths = new Map();
    activePresets = [];
    // Custom macros
    customMacros = new Map();
    // Combined code snippets (base + preset)
    get codeSnippets() {
        return { ...spec_js_1.CODE_SNIPPETS, ...Object.fromEntries(this.presetSnippets) };
    }
    constructor() {
        this.loadFromDisk();
    }
    loadFromDisk() {
        const persisted = (0, persistence_js_1.loadPersisted)();
        const validFiles = (0, persistence_js_1.validateFiles)(persisted.files);
        for (const [alias, path] of Object.entries(validFiles)) {
            const num = parseInt(alias.replace("$", ""), 10);
            if (!isNaN(num)) {
                this.fileAliases.set(alias, path);
                if (num >= this.fileAliasCounter)
                    this.fileAliasCounter = num + 1;
            }
        }
        for (const [alias, value] of Object.entries(persisted.custom)) {
            this.customAliases.set(alias, value);
        }
        this.activePresets = persisted.presets || [];
        // Load custom macros
        if (persisted.macros) {
            for (const [name, def] of Object.entries(persisted.macros)) {
                this.customMacros.set(name, {
                    description: def.description || name,
                    steps: def.steps,
                });
            }
        }
    }
    saveToDisk() {
        const macros = {};
        for (const [name, def] of this.customMacros) {
            macros[name] = { description: def.description, steps: def.steps };
        }
        const data = {
            version: "1.0",
            files: Object.fromEntries(this.fileAliases),
            custom: Object.fromEntries(this.customAliases),
            presets: this.activePresets,
            macros,
        };
        (0, persistence_js_1.savePersisted)(data);
    }
    loadPreset(preset) {
        for (const [alias, path] of Object.entries(preset.paths)) {
            this.presetPaths.set(alias, path);
        }
        for (const [alias, snippet] of Object.entries(preset.snippets)) {
            this.presetSnippets.set(alias, snippet);
        }
        if (!this.activePresets.includes(preset.name)) {
            this.activePresets.push(preset.name);
        }
    }
    registerFile(path) {
        for (const [alias, p] of this.fileAliases) {
            if (p === path)
                return alias;
        }
        const alias = `$${this.fileAliasCounter++}`;
        this.fileAliases.set(alias, path);
        return alias;
    }
    registerUrl(url) {
        if (this.urlAliasRev.has(url)) {
            return this.urlAliasRev.get(url);
        }
        let hash = this.shortHash(url);
        let alias = `&${hash}`;
        // Handle collisions: if alias exists with a different URL, add suffix
        let suffix = 1;
        while (this.urlAliases.has(alias) && this.urlAliases.get(alias) !== url) {
            alias = `&${hash}${suffix}`;
            suffix++;
        }
        this.urlAliases.set(alias, url);
        this.urlAliasRev.set(url, alias);
        return alias;
    }
    registerCustom(alias, value) {
        this.customAliases.set(alias, value);
    }
    resolve(token) {
        if (this.fileAliases.has(token))
            return this.fileAliases.get(token);
        if (this.urlAliases.has(token))
            return this.urlAliases.get(token);
        if (this.customAliases.has(token))
            return this.customAliases.get(token);
        if (this.presetPaths.has(token))
            return this.presetPaths.get(token);
        if (this.presetSnippets.has(token))
            return this.presetSnippets.get(token);
        if (spec_js_1.PATH_PREFIXES[token])
            return spec_js_1.PATH_PREFIXES[token];
        if (spec_js_1.OPERATIONS[token])
            return spec_js_1.OPERATIONS[token];
        if (spec_js_1.BASH_SHORTCUTS[token])
            return spec_js_1.BASH_SHORTCUTS[token];
        if (spec_js_1.CODE_SNIPPETS[token])
            return spec_js_1.CODE_SNIPPETS[token];
        return null;
    }
    getAll() {
        return {
            files: Object.fromEntries(this.fileAliases),
            urls: Object.fromEntries(this.urlAliases),
            custom: Object.fromEntries(this.customAliases),
            presets: this.activePresets,
            presetPaths: Object.fromEntries(this.presetPaths),
            presetSnippets: Object.fromEntries(this.presetSnippets),
            operations: spec_js_1.OPERATIONS,
            pathPrefixes: spec_js_1.PATH_PREFIXES,
            bashShortcuts: spec_js_1.BASH_SHORTCUTS,
            codeSnippets: this.codeSnippets,
        };
    }
    reset() {
        this.fileAliases.clear();
        this.fileAliasCounter = 0;
        this.urlAliases.clear();
        this.urlAliasRev.clear();
        this.customAliases.clear();
        // Don't clear presets on session reset
    }
    resetAll() {
        this.reset();
        this.presetSnippets.clear();
        this.presetPaths.clear();
        this.activePresets = [];
        (0, persistence_js_1.savePersisted)({ version: "0.2", files: {}, custom: {}, presets: [] });
    }
    // --- Macro methods ---
    registerMacro(name, def) {
        this.customMacros.set(name, def);
    }
    getMacro(name) {
        return this.customMacros.get(name) || macros_js_1.BUILTIN_MACROS[name] || null;
    }
    getAllMacros() {
        return { ...macros_js_1.BUILTIN_MACROS, ...Object.fromEntries(this.customMacros) };
    }
    // --- State export/import for snapshots ---
    exportState() {
        return {
            files: Object.fromEntries(this.fileAliases),
            custom: Object.fromEntries(this.customAliases),
            urls: Object.fromEntries(this.urlAliases),
            presets: [...this.activePresets],
        };
    }
    importState(state) {
        this.fileAliases.clear();
        this.fileAliasCounter = 0;
        for (const [alias, path] of Object.entries(state.files)) {
            this.fileAliases.set(alias, path);
            const num = parseInt(alias.replace("$", ""), 10);
            if (!isNaN(num) && num >= this.fileAliasCounter) {
                this.fileAliasCounter = num + 1;
            }
        }
        this.customAliases.clear();
        for (const [alias, value] of Object.entries(state.custom)) {
            this.customAliases.set(alias, value);
        }
        this.urlAliases.clear();
        this.urlAliasRev.clear();
        for (const [alias, url] of Object.entries(state.urls)) {
            this.urlAliases.set(alias, url);
            this.urlAliasRev.set(url, alias);
        }
        this.activePresets = state.presets;
    }
    shortHash(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
        }
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const abs = (hash < 0 ? -hash : hash) >>> 0;
        let result = "";
        let num = abs;
        for (let i = 0; i < 3; i++) {
            result += chars[num % 62];
            num = Math.floor(num / 62);
        }
        return result;
    }
}
exports.Dictionary = Dictionary;
//# sourceMappingURL=dictionary.js.map
import {
  OPERATIONS,
  OPERATIONS_REV,
  PATH_PREFIXES,
  BASH_SHORTCUTS,
  CODE_SNIPPETS,
  STATUS_CODES,
} from "../protocol/spec.js";
import { loadPersisted, savePersisted, validateFiles, type PersistedDictionary, type PersistedMacroStep } from "./persistence.js";
import { type Preset } from "../presets/index.js";
import { type MacroStep, type MacroDef, BUILTIN_MACROS } from "./macros.js";

export class Dictionary {
  readonly operations = OPERATIONS;
  readonly operationsRev = OPERATIONS_REV;
  readonly pathPrefixes = PATH_PREFIXES;
  readonly bashShortcuts = BASH_SHORTCUTS;
  readonly statusCodes = STATUS_CODES;

  private fileAliases: Map<string, string> = new Map();
  private fileAliasCounter = 0;
  private urlAliases: Map<string, string> = new Map();
  private urlAliasRev: Map<string, string> = new Map();
  private customAliases: Map<string, string> = new Map();

  // Preset-loaded snippets and paths
  private presetSnippets: Map<string, string> = new Map();
  private presetPaths: Map<string, string> = new Map();
  private activePresets: string[] = [];

  // Custom macros
  private customMacros: Map<string, MacroDef> = new Map();

  // Combined code snippets (base + preset)
  get codeSnippets(): Record<string, string> {
    return { ...CODE_SNIPPETS, ...Object.fromEntries(this.presetSnippets) };
  }

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    const persisted = loadPersisted();
    const validFiles = validateFiles(persisted.files);
    for (const [alias, path] of Object.entries(validFiles)) {
      const num = parseInt(alias.replace("$", ""), 10);
      if (!isNaN(num)) {
        this.fileAliases.set(alias, path);
        if (num >= this.fileAliasCounter) this.fileAliasCounter = num + 1;
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
          steps: def.steps as MacroStep[],
        });
      }
    }
  }

  saveToDisk(): void {
    const macros: Record<string, { description?: string; steps: PersistedMacroStep[] }> = {};
    for (const [name, def] of this.customMacros) {
      macros[name] = { description: def.description, steps: def.steps };
    }
    const data: PersistedDictionary = {
      version: "1.0",
      files: Object.fromEntries(this.fileAliases),
      custom: Object.fromEntries(this.customAliases),
      presets: this.activePresets,
      macros,
    };
    savePersisted(data);
  }

  loadPreset(preset: Preset): void {
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

  registerFile(path: string): string {
    for (const [alias, p] of this.fileAliases) {
      if (p === path) return alias;
    }
    const alias = `$${this.fileAliasCounter++}`;
    this.fileAliases.set(alias, path);
    return alias;
  }

  registerUrl(url: string): string {
    if (this.urlAliasRev.has(url)) {
      return this.urlAliasRev.get(url)!;
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

  registerCustom(alias: string, value: string): void {
    this.customAliases.set(alias, value);
  }

  resolve(token: string): string | null {
    if (this.fileAliases.has(token)) return this.fileAliases.get(token)!;
    if (this.urlAliases.has(token)) return this.urlAliases.get(token)!;
    if (this.customAliases.has(token)) return this.customAliases.get(token)!;
    if (this.presetPaths.has(token)) return this.presetPaths.get(token)!;
    if (this.presetSnippets.has(token)) return this.presetSnippets.get(token)!;
    if (PATH_PREFIXES[token]) return PATH_PREFIXES[token];
    if (OPERATIONS[token]) return OPERATIONS[token];
    if (BASH_SHORTCUTS[token]) return BASH_SHORTCUTS[token];
    if (CODE_SNIPPETS[token]) return CODE_SNIPPETS[token];
    return null;
  }

  getAll(): Record<string, unknown> {
    return {
      files: Object.fromEntries(this.fileAliases),
      urls: Object.fromEntries(this.urlAliases),
      custom: Object.fromEntries(this.customAliases),
      presets: this.activePresets,
      presetPaths: Object.fromEntries(this.presetPaths),
      presetSnippets: Object.fromEntries(this.presetSnippets),
      operations: OPERATIONS,
      pathPrefixes: PATH_PREFIXES,
      bashShortcuts: BASH_SHORTCUTS,
      codeSnippets: this.codeSnippets,
    };
  }

  reset(): void {
    this.fileAliases.clear();
    this.fileAliasCounter = 0;
    this.urlAliases.clear();
    this.urlAliasRev.clear();
    this.customAliases.clear();
    // Don't clear presets on session reset
  }

  resetAll(): void {
    this.reset();
    this.presetSnippets.clear();
    this.presetPaths.clear();
    this.activePresets = [];
    savePersisted({ version: "0.2", files: {}, custom: {}, presets: [] });
  }

  // --- Macro methods ---

  registerMacro(name: string, def: MacroDef): void {
    this.customMacros.set(name, def);
  }

  getMacro(name: string): MacroDef | null {
    return this.customMacros.get(name) || BUILTIN_MACROS[name] || null;
  }

  getAllMacros(): Record<string, MacroDef> {
    return { ...BUILTIN_MACROS, ...Object.fromEntries(this.customMacros) };
  }

  // --- State export/import for snapshots ---

  exportState(): { files: Record<string, string>; custom: Record<string, string>; urls: Record<string, string>; presets: string[] } {
    return {
      files: Object.fromEntries(this.fileAliases),
      custom: Object.fromEntries(this.customAliases),
      urls: Object.fromEntries(this.urlAliases),
      presets: [...this.activePresets],
    };
  }

  importState(state: { files: Record<string, string>; custom: Record<string, string>; urls: Record<string, string>; presets: string[] }): void {
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

  private shortHash(input: string): string {
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

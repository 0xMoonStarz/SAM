import { type Preset } from "../presets/index.js";
import { type MacroDef } from "./macros.js";
export declare class Dictionary {
    readonly operations: Record<string, string>;
    readonly operationsRev: Record<string, string>;
    readonly pathPrefixes: Record<string, string>;
    readonly bashShortcuts: Record<string, string>;
    readonly statusCodes: Record<string, string>;
    private fileAliases;
    private fileAliasCounter;
    private urlAliases;
    private urlAliasRev;
    private customAliases;
    private presetSnippets;
    private presetPaths;
    private activePresets;
    private customMacros;
    get codeSnippets(): Record<string, string>;
    constructor();
    private loadFromDisk;
    saveToDisk(): void;
    loadPreset(preset: Preset): void;
    registerFile(path: string): string;
    registerUrl(url: string): string;
    registerCustom(alias: string, value: string): void;
    resolve(token: string): string | null;
    getAll(): Record<string, unknown>;
    reset(): void;
    resetAll(): void;
    registerMacro(name: string, def: MacroDef): void;
    getMacro(name: string): MacroDef | null;
    getAllMacros(): Record<string, MacroDef>;
    exportState(): {
        files: Record<string, string>;
        custom: Record<string, string>;
        urls: Record<string, string>;
        presets: string[];
    };
    importState(state: {
        files: Record<string, string>;
        custom: Record<string, string>;
        urls: Record<string, string>;
        presets: string[];
    }): void;
    private shortHash;
}

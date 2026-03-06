export interface PersistedMacroStep {
    type: string;
    cmd?: string;
    path?: string;
    label?: string;
}
export interface PersistedDictionary {
    version: string;
    files: Record<string, string>;
    custom: Record<string, string>;
    presets: string[];
    macros?: Record<string, {
        description?: string;
        steps: PersistedMacroStep[];
    }>;
}
export declare function loadPersisted(): PersistedDictionary;
export declare function savePersisted(dict: PersistedDictionary): void;
export declare function validateFiles(files: Record<string, string>): Record<string, string>;
export declare function getDictPath(): string;

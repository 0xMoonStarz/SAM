export interface Preset {
    name: string;
    detect: string[];
    paths: Record<string, string>;
    snippets: Record<string, string>;
}
export declare const ALL_PRESETS: Preset[];
export declare function detectPresets(projectDir: string): Preset[];
export declare function getPresetByName(name: string): Preset | undefined;

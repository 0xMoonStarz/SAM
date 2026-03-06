/**
 * SAM v1.0 - Built-in macro definitions
 * Predefined operation sequences for reducing round trips
 */
export interface MacroStep {
    type: "bash" | "read" | "tree";
    cmd?: string;
    path?: string;
    label?: string;
}
export interface MacroDef {
    description: string;
    steps: MacroStep[];
}
export declare const BUILTIN_MACROS: Record<string, MacroDef>;

import { Dictionary } from "./dictionary.js";
export declare class Encoder {
    private dict;
    constructor(dict: Dictionary);
    /**
     * Compress a Claude Code message/command into SAM notation.
     * Returns compressed string + estimated token savings.
     */
    compress(input: string): {
        compressed: string;
        originalTokens: number;
        compressedTokens: number;
    };
    /**
     * Decompress SAM notation back to full text.
     */
    decompress(input: string): string;
    /**
     * Rough token estimation (~4 chars per token for English, ~3 for code)
     */
    estimateTokens(text: string): number;
}

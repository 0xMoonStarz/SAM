/**
 * SAM Protocol Specification v1.0
 * Serialized Abstraction Machine for Claude Code
 */
export interface ProtocolSpec {
    version: string;
    operations: Record<string, string>;
    statusCodes: Record<string, string>;
    pathPrefixes: Record<string, string>;
    codeSnippets: Record<string, string>;
}
export declare const PROTOCOL_VERSION = "1.0";
export declare const OPERATIONS: Record<string, string>;
export declare const OPERATIONS_REV: Record<string, string>;
export declare const STATUS_CODES: Record<string, string>;
export declare const PATH_PREFIXES: Record<string, string>;
export declare const CODE_SNIPPETS: Record<string, string>;
export declare const BASH_SHORTCUTS: Record<string, string>;
export declare const FULL_SPEC: ProtocolSpec;

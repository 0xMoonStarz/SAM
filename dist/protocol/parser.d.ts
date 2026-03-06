/**
 * SAM v1.0 - Formal Grammar & Parser
 *
 * BNF:
 *   program     := statement ("\n" statement)*
 *   statement   := declaration | pipe | response
 *   declaration := "$" ID "=" value | "&" ID "=" value | "@" ID "=" value
 *   pipe        := operation ("|" operation)*
 *   operation   := VERB target? modifier?
 *   VERB        := "r" | "e" | "w" | "g" | "s" | "b" | "a" | "k" | "n" | "f" | "ws" | "t" | "q"
 *   target      := alias | path | quoted_string
 *   alias       := "$" DIGITS | "&" ALNUM+ | "@" ALNUM+
 *   modifier    := ":" range | "{" content "}" | quoted_string
 *   range       := DIGITS ("-" DIGITS)?
 *   response    := STATUS alias? message?
 *   STATUS      := "+" | "-" | "~" | "!" | "?" | "#" DIGITS | "ok" | "d"
 */
export type NodeType = "program" | "declaration" | "pipe" | "operation" | "response" | "alias" | "path" | "range" | "content" | "string";
export interface ASTNode {
    type: NodeType;
    value?: string;
    children?: ASTNode[];
    verb?: string;
    target?: ASTNode;
    modifier?: ASTNode;
    status?: string;
    alias?: string;
    from?: number;
    to?: number;
}
export declare class Parser {
    parse(input: string): ASTNode;
    validate(input: string): {
        valid: boolean;
        errors: string[];
    };
    format(ast: ASTNode): string;
    private parseLine;
    private looksLikeDeclaration;
    private parseDeclaration;
    private parsePipe;
    private parseOperation;
    private parseTarget;
    private parseRange;
    private parseResponse;
}

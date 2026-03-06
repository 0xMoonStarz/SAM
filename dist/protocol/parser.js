"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const VERBS = new Set(["r", "e", "w", "g", "s", "b", "a", "k", "n", "f", "ws", "t", "q"]);
const STATUS_SINGLE = new Set(["+", "-", "~", "!", "?"]);
const STATUS_WORDS = new Set(["ok", "d"]);
class Lexer {
    input;
    pos = 0;
    constructor(input) {
        this.input = input;
    }
    peek() {
        this.skipSpaces();
        return this.input[this.pos] || "";
    }
    advance() {
        return this.input[this.pos++] || "";
    }
    skipSpaces() {
        while (this.pos < this.input.length && this.input[this.pos] === " ")
            this.pos++;
    }
    isEOL() {
        this.skipSpaces();
        return this.pos >= this.input.length || this.input[this.pos] === "\n";
    }
    readUntil(stop) {
        let result = "";
        while (this.pos < this.input.length && this.input[this.pos] !== stop) {
            result += this.input[this.pos++];
        }
        return result;
    }
    readWhile(predicate) {
        let result = "";
        while (this.pos < this.input.length && predicate(this.input[this.pos])) {
            result += this.input[this.pos++];
        }
        return result;
    }
    readQuoted() {
        const quote = this.advance(); // consume " or '
        let result = "";
        while (this.pos < this.input.length && this.input[this.pos] !== quote) {
            if (this.input[this.pos] === "\\")
                this.pos++;
            result += this.input[this.pos++];
        }
        this.pos++; // consume closing quote
        return result;
    }
    remaining() {
        this.skipSpaces();
        return this.input.slice(this.pos);
    }
    get position() {
        return this.pos;
    }
}
class Parser {
    parse(input) {
        const lines = input.split("\n").filter((l) => l.trim().length > 0);
        const children = [];
        for (const line of lines) {
            const node = this.parseLine(line.trim());
            if (node)
                children.push(node);
        }
        return { type: "program", children };
    }
    validate(input) {
        const errors = [];
        const lines = input.split("\n").filter((l) => l.trim().length > 0);
        for (let i = 0; i < lines.length; i++) {
            try {
                const node = this.parseLine(lines[i].trim());
                if (!node)
                    errors.push(`L${i + 1}: empty or unparseable`);
            }
            catch (e) {
                errors.push(`L${i + 1}: ${e.message}`);
            }
        }
        return { valid: errors.length === 0, errors };
    }
    format(ast) {
        switch (ast.type) {
            case "program":
                return (ast.children || []).map((c) => this.format(c)).join("\n");
            case "declaration":
                return `${ast.alias} = ${ast.value}`;
            case "pipe":
                return (ast.children || []).map((c) => this.format(c)).join(" | ");
            case "operation": {
                let s = ast.verb || "";
                if (ast.target)
                    s += " " + this.format(ast.target);
                if (ast.modifier)
                    s += this.format(ast.modifier);
                return s;
            }
            case "alias":
                return ast.value || "";
            case "path":
                return ast.value || "";
            case "range":
                return ast.to ? `:${ast.from}-${ast.to}` : `:${ast.from}`;
            case "content":
                return ` {${ast.value}}`;
            case "string":
                return ` "${ast.value}"`;
            case "response": {
                let s = ast.status || "";
                if (ast.target)
                    s += " " + this.format(ast.target);
                if (ast.value)
                    s += " " + ast.value;
                return s;
            }
            default:
                return "";
        }
    }
    parseLine(line) {
        if (!line)
            return null;
        const lex = new Lexer(line);
        const ch = lex.peek();
        // Declaration: $id = value | &id = value | @id = value
        if ((ch === "$" || ch === "&" || ch === "@") && this.looksLikeDeclaration(line)) {
            return this.parseDeclaration(lex);
        }
        // Response: starts with status code
        if (STATUS_SINGLE.has(ch)) {
            return this.parseResponse(lex);
        }
        if (ch === "#") {
            return this.parseResponse(lex);
        }
        const word = line.split(/\s/)[0];
        if (STATUS_WORDS.has(word)) {
            return this.parseResponse(lex);
        }
        // Operation or pipe
        if (VERBS.has(ch)) {
            return this.parsePipe(lex);
        }
        // Fallback: treat as raw text
        return { type: "content", value: line };
    }
    looksLikeDeclaration(line) {
        return /^[$&@]\w+\s*=/.test(line);
    }
    parseDeclaration(lex) {
        const prefix = lex.advance(); // $ & @
        const id = lex.readWhile((c) => /\w/.test(c));
        lex.skipSpaces();
        if (lex.advance() !== "=")
            throw new Error("Expected '=' in declaration");
        lex.skipSpaces();
        const value = lex.remaining();
        return { type: "declaration", alias: `${prefix}${id}`, value };
    }
    parsePipe(lex) {
        const ops = [];
        ops.push(this.parseOperation(lex));
        while (!lex.isEOL()) {
            lex.skipSpaces();
            if (lex.peek() === "|") {
                lex.advance(); // consume |
                lex.skipSpaces();
                ops.push(this.parseOperation(lex));
            }
            else {
                break;
            }
        }
        if (ops.length === 1)
            return ops[0];
        return { type: "pipe", children: ops };
    }
    parseOperation(lex) {
        // Support multi-char verbs (ws, q, t) by peeking ahead
        let verb = lex.advance();
        const peekNext = lex.peek();
        if (verb === "w" && peekNext === "s") {
            lex.advance(); // consume 's'
            verb = "ws";
        }
        if (!VERBS.has(verb))
            throw new Error(`Unknown verb: '${verb}'`);
        lex.skipSpaces();
        const node = { type: "operation", verb };
        // Parse target if present
        const next = lex.peek();
        if (next && next !== "|" && next !== ":" && next !== "{") {
            node.target = this.parseTarget(lex);
        }
        // Parse modifier(s) if present
        lex.skipSpaces();
        const mod = lex.peek();
        if (mod === ":") {
            lex.advance();
            node.modifier = this.parseRange(lex);
        }
        // Check for a second modifier after range (e.g. :15 {content})
        lex.skipSpaces();
        const mod2 = lex.peek();
        if (mod2 === "{") {
            lex.advance();
            const content = lex.readUntil("}");
            lex.advance(); // consume }
            node.modifier = { type: "content", value: content };
        }
        else if (!node.modifier && (mod2 === '"' || mod2 === "'")) {
            node.modifier = { type: "string", value: lex.readQuoted() };
        }
        return node;
    }
    parseTarget(lex) {
        const ch = lex.peek();
        // Alias: $N, &id, @id
        if (ch === "$" || ch === "&" || ch === "@") {
            lex.advance();
            const id = lex.readWhile((c) => /[\w]/.test(c));
            return { type: "alias", value: `${ch}${id}` };
        }
        // Quoted string
        if (ch === '"' || ch === "'") {
            return { type: "string", value: lex.readQuoted() };
        }
        // Path or pattern
        const value = lex.readWhile((c) => !/[\s|:{}"']/.test(c));
        return { type: "path", value };
    }
    parseRange(lex) {
        const from = parseInt(lex.readWhile((c) => /\d/.test(c)), 10);
        if (lex.peek() === "-") {
            lex.advance();
            const to = parseInt(lex.readWhile((c) => /\d/.test(c)), 10);
            return { type: "range", from, to };
        }
        return { type: "range", from };
    }
    parseResponse(lex) {
        const ch = lex.peek();
        let status;
        if (ch === "#") {
            lex.advance();
            const num = lex.readWhile((c) => /\d/.test(c));
            status = `#${num}`;
        }
        else if (STATUS_SINGLE.has(ch)) {
            status = lex.advance();
        }
        else {
            status = lex.readWhile((c) => /\w/.test(c));
        }
        lex.skipSpaces();
        const node = { type: "response", status };
        // Optional target alias
        const next = lex.peek();
        if (next === "$" || next === "&" || next === "@") {
            node.target = this.parseTarget(lex);
        }
        // Rest is message
        lex.skipSpaces();
        const rest = lex.remaining();
        if (rest)
            node.value = rest;
        return node;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map
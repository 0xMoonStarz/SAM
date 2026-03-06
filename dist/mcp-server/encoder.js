"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Encoder = void 0;
const spec_js_1 = require("../protocol/spec.js");
class Encoder {
    dict;
    constructor(dict) {
        this.dict = dict;
    }
    /**
     * Compress a Claude Code message/command into SAM notation.
     * Returns compressed string + estimated token savings.
     */
    compress(input) {
        const originalTokens = this.estimateTokens(input);
        let result = input;
        // 1. Compress tool/operation names
        for (const [full, short] of Object.entries(spec_js_1.OPERATIONS_REV)) {
            result = result.replaceAll(full, short);
        }
        // 2. Compress bash commands (with word boundaries to avoid corrupting content)
        const bashEntries = Object.entries(spec_js_1.BASH_SHORTCUTS).sort((a, b) => b[1].length - a[1].length // longest first to avoid partial matches
        );
        for (const [short, full] of bashEntries) {
            const escaped = full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            result = result.replace(new RegExp(`(?<=^|\\s|[\`"'])${escaped}(?=\\s|$|[\`"'])`, "g"), short);
        }
        // 3. Compress code snippets
        const snippetEntries = Object.entries(spec_js_1.CODE_SNIPPETS).sort((a, b) => b[1].length - a[1].length);
        for (const [short, full] of snippetEntries) {
            result = result.replaceAll(full, short);
        }
        // 4. Compress known path prefixes (only at path boundaries)
        const home = process.env.HOME || process.env.USERPROFILE || "";
        if (home) {
            // Only replace when followed by / or at end of string/word boundary
            const homeEscaped = home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            result = result.replace(new RegExp(homeEscaped + "(?=/|\\s|$|[\"'`])", "g"), "~");
        }
        const cwd = process.cwd();
        const cwdEscaped = cwd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        result = result.replace(new RegExp(cwdEscaped + "/", "g"), "./");
        result = result.replace(new RegExp(cwdEscaped + "(?=\\s|$|[\"'`])", "g"), ".");
        // 4b. Compress known directory/file prefixes in paths
        const pathPrefixEntries = [
            ["~s", "src"],
            ["~d", "dist"],
            ["~n", "node_modules"],
            ["~p", "package.json"],
            ["~t", "tsconfig.json"],
            ["~g", ".gitignore"],
            ["~c", ".claude"],
        ];
        for (const [short, full] of pathPrefixEntries) {
            // Only replace as complete path segments: /src/ or /src end-of-path
            result = result.replace(new RegExp(`(?<=/)${full}(?=/|\\s|$|[:"'"\`])`, "g"), short);
        }
        // 5. Register and compress URLs
        const urlRegex = /https?:\/\/[^\s"'<>]+/g;
        const urls = result.match(urlRegex) || [];
        for (const url of urls) {
            const alias = this.dict.registerUrl(url);
            result = result.replaceAll(url, alias);
        }
        // 6. Register and compress file paths (long ones)
        const pathRegex = /(?:\.\/|~\/)[^\s"'<>:]+\.[a-zA-Z]{1,5}/g;
        const paths = result.match(pathRegex) || [];
        for (const p of paths) {
            if (p.length > 15) {
                const alias = this.dict.registerFile(p);
                result = result.replaceAll(p, alias);
            }
        }
        // 7. Strip filler phrases
        const fillerPatterns = [
            /(?:Voy a|Let me|I'll|I will|Déjame|Going to)\s+\w+\s+/gi,
            /(?:Ok,?\s*)?(?:ya|now|already)\s+(?:vi|leí|found|see|read)\s+/gi,
            /(?:Listo|Done|Ready|Completado)[.,!]?\s*/gi,
            /(?:Encontré|Found|I found)\s+/gi,
            /(?:Ahora voy a|Now I'll|Next I'll)\s+/gi,
        ];
        for (const pattern of fillerPatterns) {
            result = result.replace(pattern, "");
        }
        // Clean up multiple spaces/newlines
        result = result.replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").trim();
        const compressedTokens = this.estimateTokens(result);
        return { compressed: result, originalTokens, compressedTokens };
    }
    /**
     * Decompress SAM notation back to full text.
     */
    decompress(input) {
        let result = input;
        // 1. Expand file aliases ($0, $1, etc) — sort longest first to avoid $1 corrupting $10
        const fileAliasRegex = /\$\d+/g;
        const fileAliases = [...new Set(result.match(fileAliasRegex) || [])].sort((a, b) => b.length - a.length || b.localeCompare(a));
        for (const alias of fileAliases) {
            const resolved = this.dict.resolve(alias);
            if (resolved)
                result = result.replaceAll(alias, resolved);
        }
        // 2. Expand URL aliases (&xxx, &xxx1 for collisions)
        const urlAliasRegex = /&[a-zA-Z0-9]{2,6}/g;
        const urlAliases = result.match(urlAliasRegex) || [];
        for (const alias of urlAliases) {
            const resolved = this.dict.resolve(alias);
            if (resolved)
                result = result.replaceAll(alias, resolved);
        }
        // 3. Expand operation codes (single chars at start of line)
        const lines = result.split("\n");
        const expanded = lines.map((line) => {
            const trimmed = line.trim();
            if (trimmed.length > 0 && spec_js_1.OPERATIONS[trimmed[0]]) {
                const rest = trimmed.slice(1).trim();
                return `[${spec_js_1.OPERATIONS[trimmed[0]]}] ${rest}`;
            }
            return line;
        });
        result = expanded.join("\n");
        // 4. Expand code snippets (use word boundaries to avoid corrupting filenames like debug.log)
        for (const [short, full] of Object.entries(spec_js_1.CODE_SNIPPETS)) {
            const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(?<![a-zA-Z0-9/\\\\-])${escaped}(?=\\(|\\s|$|;|,|\\)|\\])`, "g");
            result = result.replace(regex, full);
        }
        // 5. Expand bash shortcuts
        for (const [short, full] of Object.entries(spec_js_1.BASH_SHORTCUTS)) {
            // Only expand if it looks like a bash context
            const bashRegex = new RegExp(`\\bb ${short}\\b`, "g");
            result = result.replace(bashRegex, `[Bash] ${full}`);
        }
        // 6. Expand known path prefixes back to full names
        const pathPrefixEntries = [
            ["~s", "src"],
            ["~d", "dist"],
            ["~n", "node_modules"],
            ["~p", "package.json"],
            ["~t", "tsconfig.json"],
            ["~g", ".gitignore"],
            ["~c", ".claude"],
        ];
        for (const [short, full] of pathPrefixEntries) {
            result = result.replace(new RegExp(`(?<=/)${short.replace("~", "\\~")}(?=/|\\s|$|[:"'"\`])`, "g"), full);
        }
        // 7. Expand home path prefix
        const home = process.env.HOME || process.env.USERPROFILE || "";
        if (home) {
            result = result.replace(/~\//g, home + "/");
        }
        return result;
    }
    /**
     * Rough token estimation (~4 chars per token for English, ~3 for code)
     */
    estimateTokens(text) {
        // Simple heuristic: ~4 chars per token average
        return Math.ceil(text.length / 4);
    }
}
exports.Encoder = Encoder;
//# sourceMappingURL=encoder.js.map
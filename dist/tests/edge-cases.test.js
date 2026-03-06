"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const dictionary_js_1 = require("../mcp-server/dictionary.js");
const encoder_js_1 = require("../mcp-server/encoder.js");
const parser_js_1 = require("../protocol/parser.js");
(0, node_test_1.describe)("Edge Cases - Encoder", () => {
    (0, node_test_1.it)("handles empty input without NaN", () => {
        const dict = new dictionary_js_1.Dictionary();
        const enc = new encoder_js_1.Encoder(dict);
        const result = enc.compress("");
        assert.strictEqual(result.originalTokens, 0);
        assert.strictEqual(result.compressedTokens, 0);
        assert.strictEqual(result.compressed, "");
    });
    (0, node_test_1.it)("does not corrupt paths with similar prefixes", () => {
        const dict = new dictionary_js_1.Dictionary();
        const enc = new encoder_js_1.Encoder(dict);
        const home = process.env.HOME || "";
        if (!home)
            return; // skip if no HOME
        const input = `${home}-data/file.txt and ${home}/real/file.txt`;
        const result = enc.compress(input);
        // The home-data path should NOT be corrupted
        assert.ok(!result.compressed.includes("~-data"), "Should not corrupt paths with similar prefix");
        // The real home path SHOULD be compressed
        assert.ok(result.compressed.includes("~/real"), "Should compress real home paths");
    });
    (0, node_test_1.it)("handles multiple filler phrases in one text", () => {
        const dict = new dictionary_js_1.Dictionary();
        const enc = new encoder_js_1.Encoder(dict);
        const input = "Let me read the file. Found the issue. Let me fix it now.";
        const result = enc.compress(input);
        assert.ok(!result.compressed.includes("Let me"), "Should strip all filler occurrences");
        assert.ok(!result.compressed.includes("Found"), "Should strip Found");
    });
});
(0, node_test_1.describe)("Edge Cases - Dictionary", () => {
    (0, node_test_1.it)("handles URL hash collisions gracefully", () => {
        const dict = new dictionary_js_1.Dictionary();
        // Register many URLs to increase collision chance
        const aliases = new Set();
        for (let i = 0; i < 100; i++) {
            const alias = dict.registerUrl(`https://example.com/path/${i}`);
            aliases.add(alias);
        }
        // All aliases should be unique
        assert.strictEqual(aliases.size, 100, "All URL aliases should be unique");
    });
    (0, node_test_1.it)("deduplicates URLs", () => {
        const dict = new dictionary_js_1.Dictionary();
        const a1 = dict.registerUrl("https://example.com/api");
        const a2 = dict.registerUrl("https://example.com/api");
        assert.strictEqual(a1, a2, "Same URL should return same alias");
    });
    (0, node_test_1.it)("resetAll clears everything including presets", () => {
        const dict = new dictionary_js_1.Dictionary();
        dict.registerFile("/test/file.ts");
        dict.registerCustom("@test", "value");
        dict.resetAll();
        assert.strictEqual(dict.resolve("$0"), null);
        assert.strictEqual(dict.resolve("@test"), null);
    });
    (0, node_test_1.it)("reset preserves presets", () => {
        const dict = new dictionary_js_1.Dictionary();
        dict.registerFile("/test/file.ts");
        dict.reset();
        assert.strictEqual(dict.resolve("$0"), null);
    });
});
(0, node_test_1.describe)("Edge Cases - Parser", () => {
    (0, node_test_1.it)("parses multi-char verb ws (WebSearch)", () => {
        const parser = new parser_js_1.Parser();
        const ast = parser.parse('ws "search query"');
        assert.ok(ast.children);
        assert.strictEqual(ast.children.length, 1);
        const op = ast.children[0];
        assert.strictEqual(op.verb, "ws");
    });
    (0, node_test_1.it)("parses single-char verbs t and q", () => {
        const parser = new parser_js_1.Parser();
        const ast1 = parser.parse("t something");
        assert.ok(ast1.children);
        assert.strictEqual(ast1.children[0].verb, "t");
        const ast2 = parser.parse('q "question?"');
        assert.ok(ast2.children);
        assert.strictEqual(ast2.children[0].verb, "q");
    });
    (0, node_test_1.it)("validates correctly formed declarations", () => {
        const parser = new parser_js_1.Parser();
        const result = parser.validate("$myVar = some value\n&url = https://test.com");
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
    });
    (0, node_test_1.it)("parses pipe operations", () => {
        const parser = new parser_js_1.Parser();
        const ast = parser.parse('r $0 | s "pattern"');
        assert.ok(ast.children);
        const pipe = ast.children[0];
        assert.strictEqual(pipe.type, "pipe");
        assert.ok(pipe.children);
        assert.strictEqual(pipe.children.length, 2);
    });
    (0, node_test_1.it)("distinguishes w (Write) from ws (WebSearch)", () => {
        const parser = new parser_js_1.Parser();
        const astW = parser.parse("w /path/file.ts");
        assert.ok(astW.children);
        assert.strictEqual(astW.children[0].verb, "w");
        const astWs = parser.parse('ws "query"');
        assert.ok(astWs.children);
        assert.strictEqual(astWs.children[0].verb, "ws");
    });
});
//# sourceMappingURL=edge-cases.test.js.map
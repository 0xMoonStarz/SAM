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
const dictionary_js_1 = require("../src/mcp-server/dictionary.js");
const encoder_js_1 = require("../src/mcp-server/encoder.js");
(0, node_test_1.describe)("Dictionary", () => {
    (0, node_test_1.it)("registers and resolves file aliases", () => {
        const dict = new dictionary_js_1.Dictionary();
        const alias1 = dict.registerFile("/home/user/project/src/index.ts");
        const alias2 = dict.registerFile("/home/user/project/src/utils.ts");
        assert.strictEqual(alias1, "$0");
        assert.strictEqual(alias2, "$1");
        assert.strictEqual(dict.resolve("$0"), "/home/user/project/src/index.ts");
        assert.strictEqual(dict.resolve("$1"), "/home/user/project/src/utils.ts");
    });
    (0, node_test_1.it)("deduplicates file aliases", () => {
        const dict = new dictionary_js_1.Dictionary();
        const a1 = dict.registerFile("/same/path.ts");
        const a2 = dict.registerFile("/same/path.ts");
        assert.strictEqual(a1, a2);
    });
    (0, node_test_1.it)("registers and resolves URL aliases", () => {
        const dict = new dictionary_js_1.Dictionary();
        const alias = dict.registerUrl("https://api.example.com/v1/users");
        assert.ok(alias.startsWith("&"));
        assert.strictEqual(dict.resolve(alias), "https://api.example.com/v1/users");
    });
    (0, node_test_1.it)("registers custom aliases", () => {
        const dict = new dictionary_js_1.Dictionary();
        dict.registerCustom("@api", "https://api.example.com");
        assert.strictEqual(dict.resolve("@api"), "https://api.example.com");
    });
    (0, node_test_1.it)("resets cleanly", () => {
        const dict = new dictionary_js_1.Dictionary();
        dict.registerFile("/some/path");
        dict.reset();
        assert.strictEqual(dict.resolve("$0"), null);
    });
});
(0, node_test_1.describe)("Encoder", () => {
    (0, node_test_1.it)("compresses tool operation names", () => {
        const dict = new dictionary_js_1.Dictionary();
        const enc = new encoder_js_1.Encoder(dict);
        const result = enc.compress("Read the file");
        assert.ok(result.compressed.includes("r"));
        assert.ok(result.compressedTokens <= result.originalTokens);
    });
    (0, node_test_1.it)("compresses URLs into aliases", () => {
        const dict = new dictionary_js_1.Dictionary();
        const enc = new encoder_js_1.Encoder(dict);
        const input = "Fetch https://api.github.com/repos/user/repo/pulls";
        const result = enc.compress(input);
        assert.ok(result.compressed.includes("&"));
        assert.ok(result.compressed.length < input.length);
    });
    (0, node_test_1.it)("strips filler phrases", () => {
        const dict = new dictionary_js_1.Dictionary();
        const enc = new encoder_js_1.Encoder(dict);
        const result = enc.compress("Voy a leer el archivo para entender la estructura");
        assert.ok(!result.compressed.includes("Voy a"));
    });
    (0, node_test_1.it)("shows positive token savings", () => {
        const dict = new dictionary_js_1.Dictionary();
        const enc = new encoder_js_1.Encoder(dict);
        const verbose = `Let me read the file /home/user/project/src/components/Header.tsx to understand its structure.
I'll then search for all imports of this component across the codebase.
Found 3 files that import Header. Going to update the first one.
Done! Successfully updated the import in Home.tsx.`;
        const result = enc.compress(verbose);
        assert.ok(result.compressedTokens < result.originalTokens);
        const ratio = result.originalTokens / result.compressedTokens;
        console.log(`Compression ratio: ${ratio.toFixed(1)}x (${result.originalTokens} -> ${result.compressedTokens} tokens)`);
    });
    (0, node_test_1.it)("decompresses file aliases", () => {
        const dict = new dictionary_js_1.Dictionary();
        dict.registerFile("/home/user/src/index.ts");
        const enc = new encoder_js_1.Encoder(dict);
        const result = enc.decompress("$0:15-20");
        assert.ok(result.includes("/home/user/src/index.ts"));
    });
});

import { describe, it } from "node:test";
import * as assert from "node:assert";
import { Dictionary } from "../mcp-server/dictionary.js";
import { Encoder } from "../mcp-server/encoder.js";
import { Parser } from "../protocol/parser.js";

describe("Edge Cases - Encoder", () => {
  it("handles empty input without NaN", () => {
    const dict = new Dictionary();
    const enc = new Encoder(dict);
    const result = enc.compress("");
    assert.strictEqual(result.originalTokens, 0);
    assert.strictEqual(result.compressedTokens, 0);
    assert.strictEqual(result.compressed, "");
  });

  it("does not corrupt paths with similar prefixes", () => {
    const dict = new Dictionary();
    const enc = new Encoder(dict);
    const home = process.env.HOME || "";
    if (!home) return; // skip if no HOME
    const input = `${home}-data/file.txt and ${home}/real/file.txt`;
    const result = enc.compress(input);
    // The home-data path should NOT be corrupted
    assert.ok(!result.compressed.includes("~-data"), "Should not corrupt paths with similar prefix");
    // The real home path SHOULD be compressed
    assert.ok(result.compressed.includes("~/real"), "Should compress real home paths");
  });

  it("handles multiple filler phrases in one text", () => {
    const dict = new Dictionary();
    const enc = new Encoder(dict);
    const input = "Let me read the file. Found the issue. Let me fix it now.";
    const result = enc.compress(input);
    assert.ok(!result.compressed.includes("Let me"), "Should strip all filler occurrences");
    assert.ok(!result.compressed.includes("Found"), "Should strip Found");
  });
});

describe("Edge Cases - Dictionary", () => {
  it("handles URL hash collisions gracefully", () => {
    const dict = new Dictionary();
    // Register many URLs to increase collision chance
    const aliases = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const alias = dict.registerUrl(`https://example.com/path/${i}`);
      aliases.add(alias);
    }
    // All aliases should be unique
    assert.strictEqual(aliases.size, 100, "All URL aliases should be unique");
  });

  it("deduplicates URLs", () => {
    const dict = new Dictionary();
    const a1 = dict.registerUrl("https://example.com/api");
    const a2 = dict.registerUrl("https://example.com/api");
    assert.strictEqual(a1, a2, "Same URL should return same alias");
  });

  it("resetAll clears everything including presets", () => {
    const dict = new Dictionary();
    dict.registerFile("/test/file.ts");
    dict.registerCustom("@test", "value");
    dict.resetAll();
    assert.strictEqual(dict.resolve("$0"), null);
    assert.strictEqual(dict.resolve("@test"), null);
  });

  it("reset preserves presets", () => {
    const dict = new Dictionary();
    dict.registerFile("/test/file.ts");
    dict.reset();
    assert.strictEqual(dict.resolve("$0"), null);
  });
});

describe("Edge Cases - Parser", () => {
  it("parses multi-char verb ws (WebSearch)", () => {
    const parser = new Parser();
    const ast = parser.parse('ws "search query"');
    assert.ok(ast.children);
    assert.strictEqual(ast.children.length, 1);
    const op = ast.children[0];
    assert.strictEqual(op.verb, "ws");
  });

  it("parses single-char verbs t and q", () => {
    const parser = new Parser();
    const ast1 = parser.parse("t something");
    assert.ok(ast1.children);
    assert.strictEqual(ast1.children[0].verb, "t");

    const ast2 = parser.parse('q "question?"');
    assert.ok(ast2.children);
    assert.strictEqual(ast2.children[0].verb, "q");
  });

  it("validates correctly formed declarations", () => {
    const parser = new Parser();
    const result = parser.validate("$myVar = some value\n&url = https://test.com");
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it("parses pipe operations", () => {
    const parser = new Parser();
    const ast = parser.parse('r $0 | s "pattern"');
    assert.ok(ast.children);
    const pipe = ast.children[0];
    assert.strictEqual(pipe.type, "pipe");
    assert.ok(pipe.children);
    assert.strictEqual(pipe.children.length, 2);
  });

  it("distinguishes w (Write) from ws (WebSearch)", () => {
    const parser = new Parser();
    const astW = parser.parse("w /path/file.ts");
    assert.ok(astW.children);
    assert.strictEqual(astW.children[0].verb, "w");

    const astWs = parser.parse('ws "query"');
    assert.ok(astWs.children);
    assert.strictEqual(astWs.children[0].verb, "ws");
  });
});

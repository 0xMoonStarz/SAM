import { describe, it } from "node:test";
import * as assert from "node:assert";
import { Dictionary } from "../mcp-server/dictionary.js";
import { Encoder } from "../mcp-server/encoder.js";

describe("Dictionary", () => {
  it("registers and resolves file aliases", () => {
    const dict = new Dictionary();
    dict.reset(); // Clear any persisted state
    const alias1 = dict.registerFile("/home/user/project/src/index.ts");
    const alias2 = dict.registerFile("/home/user/project/src/utils.ts");
    assert.strictEqual(alias1, "$0");
    assert.strictEqual(alias2, "$1");
    assert.strictEqual(dict.resolve("$0"), "/home/user/project/src/index.ts");
    assert.strictEqual(dict.resolve("$1"), "/home/user/project/src/utils.ts");
  });

  it("deduplicates file aliases", () => {
    const dict = new Dictionary();
    const a1 = dict.registerFile("/same/path.ts");
    const a2 = dict.registerFile("/same/path.ts");
    assert.strictEqual(a1, a2);
  });

  it("registers and resolves URL aliases", () => {
    const dict = new Dictionary();
    const alias = dict.registerUrl("https://api.example.com/v1/users");
    assert.ok(alias.startsWith("&"));
    assert.strictEqual(dict.resolve(alias), "https://api.example.com/v1/users");
  });

  it("registers custom aliases", () => {
    const dict = new Dictionary();
    dict.registerCustom("@api", "https://api.example.com");
    assert.strictEqual(dict.resolve("@api"), "https://api.example.com");
  });

  it("resets cleanly", () => {
    const dict = new Dictionary();
    dict.registerFile("/some/path");
    dict.reset();
    assert.strictEqual(dict.resolve("$0"), null);
  });
});

describe("Encoder", () => {
  it("compresses tool operation names", () => {
    const dict = new Dictionary();
    const enc = new Encoder(dict);
    const result = enc.compress("Read the file");
    assert.ok(result.compressed.includes("r"));
    assert.ok(result.compressedTokens <= result.originalTokens);
  });

  it("compresses URLs into aliases", () => {
    const dict = new Dictionary();
    const enc = new Encoder(dict);
    const input = "Fetch https://api.github.com/repos/user/repo/pulls";
    const result = enc.compress(input);
    assert.ok(result.compressed.includes("&"));
    assert.ok(result.compressed.length < input.length);
  });

  it("strips filler phrases", () => {
    const dict = new Dictionary();
    const enc = new Encoder(dict);
    const result = enc.compress("Voy a leer el archivo para entender la estructura");
    assert.ok(!result.compressed.includes("Voy a"));
  });

  it("shows positive token savings", () => {
    const dict = new Dictionary();
    const enc = new Encoder(dict);
    const verbose = `Let me read the file /home/user/project/src/components/Header.tsx to understand its structure.
I'll then search for all imports of this component across the codebase.
Found 3 files that import Header. Going to update the first one.
Done! Successfully updated the import in Home.tsx.`;
    const result = enc.compress(verbose);
    assert.ok(result.compressedTokens < result.originalTokens);
    const ratio = result.originalTokens / result.compressedTokens;
    console.log(`Compression ratio: ${ratio.toFixed(1)}x (${result.originalTokens} -> ${result.compressedTokens} tokens)`);
  });

  it("decompresses file aliases", () => {
    const dict = new Dictionary();
    dict.registerFile("/home/user/src/index.ts");
    const enc = new Encoder(dict);
    const result = enc.decompress("$0:15-20");
    assert.ok(result.includes("/home/user/src/index.ts"));
  });
});

import { concatenationChainSanitizer } from "../../../src/llm/json-processing/sanitizers/fix-concatenation-chains";

/**
 * Tests for the simplified concatenation chain sanitizer.
 * The sanitizer now uses a conservative approach that handles only obvious cases
 * to avoid false positives and complex edge cases.
 */

describe("concatenationChainSanitizer", () => {
  it("leaves valid JSON unchanged", () => {
    const input = '{"key": "value"}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
    expect(result.diagnostics).toBeUndefined();
  });

  it("replaces identifier-only chains with empty string", () => {
    const input = '{"k": partA + partB + partC}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"k": ""}');
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([expect.stringContaining("identifier-only")]),
    );
  });

  it("keeps only literal when identifiers precede it", () => {
    const input = '{"k": someIdent + "literal"}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"k": "literal"}');
    expect(result.diagnostics).toBeDefined();
  });

  it("keeps only literal when identifiers follow it", () => {
    const input = '{"k": "hello" + someVar}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"k": "hello"}');
    expect(result.diagnostics).toBeDefined();
  });

  it("handles complex identifier chains with final literal", () => {
    const input = '{"k": someIdent + "literal" + otherIdent}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(true);
    // First pass: someIdent + "literal" -> "literal"
    // Second pass: "literal" + otherIdent -> "literal"
    expect(result.content).toBe('{"k": "literal"}');
  });

  it("provides multiple diagnostics for multiple fixes", () => {
    const input = '{"a": VAR1 + VAR2, "b": ID + "literal", "c": "text" + SUFFIX}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(true);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.length).toBeGreaterThan(1);
  });

  it("does not modify valid JSON strings containing plus signs", () => {
    const input = '{"description": "This function performs a + b"}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("merges consecutive string literals", () => {
    const input = '{"message": "Hello" + " " + "World!"}';
    const result = concatenationChainSanitizer(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"message": "Hello World!"}');
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.stringContaining("Merged")]));
  });
});

/**
 * Comprehensive tests for the simplified concatenation chain sanitizer.
 * The new implementation uses a conservative approach focusing on safety.
 */
describe("concatenationChainSanitizer - comprehensive examples", () => {
  describe("identifier-leading chains", () => {
    it("keeps only the final string literal from identifier-leading chains", () => {
      const input = '{"path": BASE_PATH + DIR + "src/main.ts"}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"path": "src/main.ts"}');
    });

    it("handles complex nested path expressions", () => {
      const input = '{"filePath": ROOT_DIR + SUBDIR + PROJECT_NAME + "index.ts"}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"filePath": "index.ts"}');
    });

    it("preserves literal even with function call identifiers", () => {
      const input = '{"path": getBasePath() + getDir() + "file.js"}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"path": "file.js"}');
    });
  });

  describe("literal-leading chains", () => {
    it("trims trailing identifiers after a string literal", () => {
      const input = '{"name": "MyClass" + SUFFIX}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name": "MyClass"}');
    });

    it("removes trailing concatenation with multiple identifiers", () => {
      const input = '{"className": "Base" + DECORATOR + MIXIN}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"className": "Base"}');
    });
  });

  describe("identifier-only chains", () => {
    it("replaces identifier-only chains with empty string", () => {
      const input = '{"path": BASE_PATH + DIRECTORY + FILE_NAME}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"path": ""}');
    });

    it("handles identifiers with dots and parentheses", () => {
      const input = '{"value": config.path + utils.getName() + CONSTANT}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"value": ""}');
    });

    it("replaces multiple identifier-only chains in the same object", () => {
      const input = '{"a": ID1 + ID2, "b": "literal", "c": VAR1 + VAR2 + VAR3}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a": "", "b": "literal", "c": ""}');
    });
  });

  describe("edge cases and safety", () => {
    it("handles nested objects with concatenation chains", () => {
      const input = '{"outer": {"inner": BASE + "value"}}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": "value"}}');
    });

    it("preserves valid JSON with spacing", () => {
      const input = '{ "key" : "value" }';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("handles concatenation chains with newlines", () => {
      const input = '{"key": ID1 + ID2\n}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": ""\n}');
    });

    it("handles very long concatenation chains", () => {
      const input = '{"path": A + B + C + D + E + F + G + H + I + J + "final.ts"}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"path": "final.ts"}');
    });

    it("safely handles concatenation with literal prefix", () => {
      const input = '{"className": "prefix_" + CLASS_NAME}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"className": "prefix_"}');
    });

    it("handles mixed literal and identifier chains", () => {
      const input = '{"path": "src/" + DIR_NAME + "file.ts"}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      // Keeps first literal
      expect(result.content).toBe('{"path": "src/"}');
    });

    it("handles alternating literals and identifiers", () => {
      const input = '{"url": "https://" + DOMAIN + "/api/" + VERSION}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(true);
      // Keeps first literal
      expect(result.content).toBe('{"url": "https://"}');
    });
  });

  describe("safety - does not modify valid strings", () => {
    it("does not modify strings containing plus signs", () => {
      const input = '{"math": "The equation is a + b = c"}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("does not modify JSON with no concatenation patterns", () => {
      const input = '{"name": "value", "count": 42, "active": true}';
      const result = concatenationChainSanitizer(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });
});

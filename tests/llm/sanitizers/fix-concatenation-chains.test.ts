import {
  lightCollapseConcatenationChains,
  normalizeConcatenationChains,
} from "../../../src/llm/json-processing/sanitizers/fix-concatenation-chains";

/**
 * These tests guard the extracted concatenation chain sanitizers to ensure
 * behavior parity with the previously inlined logic inside
 * parse-and-validate-llm-json.ts.
 */

describe("concatenation chain sanitizers", () => {
  it("lightCollapseConcatenationChains leaves content without + unchanged", () => {
    const input = '{"key": "value"}';
    expect(lightCollapseConcatenationChains(input)).toBe(input);
  });

  it("lightCollapseConcatenationChains collapses identifier-only chains to empty string literal", () => {
    const input = '{"k": partA + partB + partC}';
    const output = lightCollapseConcatenationChains(input);
    expect(output).toBe('{"k": ""}');
  });

  it("lightCollapseConcatenationChains preserves first literal in identifier-leading chain", () => {
    const input = '{"k": someIdent + "literal" + otherIdent}';
    const output = lightCollapseConcatenationChains(input);
    expect(output).toBe('{"k": "literal"}');
  });

  it("normalizeConcatenationChains merges chained string literals", () => {
    const input = '{"k": "a" + "b" + "c"}';
    const output = normalizeConcatenationChains(input);
    expect(output).toBe('{"k": "abc"}');
  });

  it("normalizeConcatenationChains reduces literal + identifier sequence to first literal", () => {
    const input = '{"k": "hello" + someVar + "world"}';
    const output = normalizeConcatenationChains(input);
    expect(output).toBe('{"k": "hello"}');
  });
});

/**
 * New comprehensive tests that verify the documented regex behavior.
 * These tests cover the specific examples provided in the documentation.
 */
describe("concatenation chain sanitizers - comprehensive documentation examples", () => {
  describe("IDENT_LEADING_WITH_LITERAL_REGEX behavior", () => {
    it("keeps only the final string literal from identifier-leading chains", () => {
      // Example from documentation: { "path": BASE_PATH + DIR + "src/main.ts" }
      const input = '{"path": BASE_PATH + DIR + "src/main.ts"}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"path": "src/main.ts"}');
    });

    it("handles complex nested path expressions", () => {
      const input = '{"filePath": ROOT_DIR + SUBDIR + PROJECT_NAME + "index.ts"}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"filePath": "index.ts"}');
    });

    it("preserves literal even with function call identifiers", () => {
      const input = '{"path": getBasePath() + getDir() + "file.js"}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"path": "file.js"}');
    });
  });

  describe("FIRST_LITERAL_WITH_TAIL_REGEX behavior", () => {
    it("trims trailing identifiers after a string literal", () => {
      // Example from documentation: { "name": "MyClass" + SUFFIX }
      const input = '{"name": "MyClass" + SUFFIX}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"name": "MyClass"}');
    });

    it("removes trailing concatenation with multiple identifiers", () => {
      const input = '{"className": "Base" + DECORATOR + MIXIN}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"className": "Base"}');
    });
  });

  describe("IDENT_ONLY_CHAIN_REGEX behavior", () => {
    it("replaces identifier-only chains with empty string", () => {
      // Example from documentation: { "path": BASE_PATH + DIRECTORY + FILE_NAME }
      const input = '{"path": BASE_PATH + DIRECTORY + FILE_NAME}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"path": ""}');
    });

    it("handles identifiers with dots and parentheses", () => {
      const input = '{"value": config.path + utils.getName() + CONSTANT}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"value": ""}');
    });

    it("replaces multiple identifier-only chains in the same object", () => {
      const input = '{"a": ID1 + ID2, "b": "literal", "c": VAR1 + VAR2 + VAR3}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"a": "", "b": "literal", "c": ""}');
    });
  });

  describe("SIMPLE_CHAIN_SEGMENT_REGEX detection", () => {
    it("merges multiple pure literal chains", () => {
      const input = '{"message": "Hello" + " " + "World"}';
      const output = normalizeConcatenationChains(input);
      expect(output).toBe('{"message": "Hello World"}');
    });

    it("handles mixed literal and identifier chains", () => {
      const input = '{"path": "src/" + DIR_NAME + "file.ts"}';
      const output = normalizeConcatenationChains(input);
      expect(output).toBe('{"path": "src/"}');
    });
  });

  describe("edge cases and complex scenarios", () => {
    it("handles nested objects with concatenation chains", () => {
      const input = '{"outer": {"inner": BASE + "value"}}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"outer": {"inner": "value"}}');
    });

    it("handles arrays with concatenated values - limited support", () => {
      // Note: The sanitizer primarily handles key:value pairs, not array elements
      const input = '{"items": ["item1", PREFIX + "item2", "item3"]}';
      const output = lightCollapseConcatenationChains(input);
      // Array context is not fully handled, so concatenation remains
      expect(output).toBe('{"items": ["item1", PREFIX + "item2", "item3"]}');
    });

    it("preserves spacing in valid JSON", () => {
      const input = '{ "key" : "value" }';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe(input);
    });

    it("handles concatenation chains with newlines", () => {
      const input = '{"key": ID1 + ID2\n}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"key": ""\n}');
    });

    it("handles very long concatenation chains", () => {
      const input = '{"path": A + B + C + D + E + F + G + H + I + J + "final.ts"}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"path": "final.ts"}');
    });

    it("handles concatenation with quoted identifiers that look like keys", () => {
      const input = '{"className": "prefix_" + CLASS_NAME}';
      const output = lightCollapseConcatenationChains(input);
      expect(output).toBe('{"className": "prefix_"}');
    });
  });

  describe("normalizeConcatenationChains advanced cases", () => {
    it("merges multiple string literals into one", () => {
      const input = '{"fullPath": "/home/" + "user/" + "documents/"}';
      const output = normalizeConcatenationChains(input);
      expect(output).toBe('{"fullPath": "/home/user/documents/"}');
    });

    it("handles alternating literals and identifiers", () => {
      const input = '{"url": "https://" + DOMAIN + "/api/" + VERSION}';
      const output = normalizeConcatenationChains(input);
      expect(output).toBe('{"url": "https://"}');
    });

    it("iteratively collapses complex chains", () => {
      // When an identifier appears in the chain, the function keeps only the first literal
      const input = '{"complex": "start" + "middle" + IDENT + "end" + "final"}';
      const output = normalizeConcatenationChains(input);
      // First two literals merge to "startmiddle", but then IDENT causes it to stop at "start"
      expect(output).toBe('{"complex": "start"}');
    });
  });
});

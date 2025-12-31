/**
 * Tests for the array element fixer strategy.
 */

import { arrayElementFixer } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/array-element-fixer";

describe("arrayElementFixer", () => {
  it("should return unchanged for empty input", () => {
    const result = arrayElementFixer.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged for valid JSON arrays", () => {
    const input = '["item1", "item2", "item3"]';
    const result = arrayElementFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  describe("Missing quotes", () => {
    it("should fix missing opening quote in array element", () => {
      const input = '[item1", "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should fix missing opening quote after comma", () => {
      const input = '["item1", item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });
  });

  describe("Original prefix word removal", () => {
    it("should remove prefix word 'from' in arrays", () => {
      const input = '["item1", from "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove prefix word 'package' in arrays", () => {
      const input = '["item1", package "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove prefix word 'import' in arrays", () => {
      const input = '["item1", import "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });
  });

  describe("Generic prefix word removal", () => {
    it("should remove prefix word 'to' in arrays", () => {
      const input = '["item1", to "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove prefix word 'of' in arrays", () => {
      const input = '["item1", of "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove prefix word 'in' in arrays", () => {
      const input = '["item1", in "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove prefix word 'for' in arrays", () => {
      const input = '["item1", for "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove prefix word 'with' in arrays", () => {
      const input = '["item1", with "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove prefix word 'by' in arrays", () => {
      const input = '["item1", by "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove short stray prefix 'e' in arrays", () => {
      const input = '["item1", e "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove short stray prefix 't' in arrays", () => {
      const input = '["item1", t "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });

    it("should remove short stray prefix 'ar' in arrays", () => {
      const input = '["item1", ar "item2"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.changed).toBe(true);
    });
  });

  describe("JSON keywords preservation", () => {
    it("should NOT remove JSON keyword 'true' in arrays", () => {
      const input = '[true, "item"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toContain("true");
    });

    it("should NOT remove JSON keyword 'false' in arrays", () => {
      const input = '[false, "item"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toContain("false");
    });

    it("should NOT remove JSON keyword 'null' in arrays", () => {
      const input = '[null, "item"]';
      const result = arrayElementFixer.apply(input);
      expect(result.content).toContain("null");
    });
  });

  it("should use package name prefix replacements from config", () => {
    const input = '[orgapache.example.Class"]';
    const config = {
      packageNamePrefixReplacements: { "orgapache.": "org.apache." },
    };
    const result = arrayElementFixer.apply(input, config);
    expect(result.content).toContain("org.apache.example.Class");
    expect(result.changed).toBe(true);
  });

  it("should add diagnostics for changes", () => {
    const input = '[item"]';
    const result = arrayElementFixer.apply(input);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

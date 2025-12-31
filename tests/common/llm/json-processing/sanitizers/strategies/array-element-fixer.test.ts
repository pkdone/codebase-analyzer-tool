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

  it("should remove prefix words like 'from' in arrays", () => {
    const input = '["item1", from "item2"]';
    const result = arrayElementFixer.apply(input);
    expect(result.content).toBe('["item1", "item2"]');
    expect(result.changed).toBe(true);
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

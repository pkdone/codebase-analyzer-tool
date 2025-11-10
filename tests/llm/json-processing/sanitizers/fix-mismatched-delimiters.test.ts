import { fixMismatchedDelimiters } from "../../../../src/llm/json-processing/sanitizers/fix-mismatched-delimiters";

describe("fixMismatchedDelimiters", () => {
  it("should fix basic mismatched delimiters", () => {
    const input = '{"key": "value"]';
    const result = fixMismatchedDelimiters(input);

    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"key": "value"}');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should fix bracket/brace mismatch", () => {
    const input = '["item1", "item2"}';
    const result = fixMismatchedDelimiters(input);

    expect(result.changed).toBe(true);
    expect(result.content).toBe('["item1", "item2"]');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should handle nested structures with mismatched delimiters", () => {
    const input = '{"outer": {"inner": ["value"}}]';
    const result = fixMismatchedDelimiters(input);

    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"outer": {"inner": ["value"]}}');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should not count delimiters in strings", () => {
    const input = '{"text": "This has { and ] inside"}';
    const result = fixMismatchedDelimiters(input);

    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("should handle already correct delimiters", () => {
    const input = '{"key": "value"}';
    const result = fixMismatchedDelimiters(input);

    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("should handle empty input", () => {
    const result = fixMismatchedDelimiters("");
    expect(result.changed).toBe(false);
  });

  it("should handle whitespace-only input", () => {
    const result = fixMismatchedDelimiters("   ");
    expect(result.changed).toBe(false);
  });
});

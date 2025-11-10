import { removeTrailingCommas } from "../../../../src/llm/json-processing/sanitizers/remove-trailing-commas";

describe("removeTrailingCommas", () => {
  it("should remove trailing comma from object", () => {
    const input = '{"a": 1, "b": 2, }';
    const result = removeTrailingCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"a": 1, "b": 2}');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should remove trailing comma from array", () => {
    const input = "[1, 2, 3, ]";
    const result = removeTrailingCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe("[1, 2, 3]");
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should handle trailing comma with whitespace", () => {
    const input = '{ "key": "value",  }';
    const result = removeTrailingCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{ "key": "value"}');
  });

  it("should handle multiple trailing commas in nested structures", () => {
    const input = '{"outer": {"inner": "value", }, }';
    const result = removeTrailingCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"outer": {"inner": "value"}}');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should not remove commas that are not trailing", () => {
    const input = '{"a": 1, "b": 2}';
    const result = removeTrailingCommas(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("should handle empty input", () => {
    const result = removeTrailingCommas("");
    expect(result.changed).toBe(false);
  });

  it("should handle whitespace-only input", () => {
    const result = removeTrailingCommas("   ");
    expect(result.changed).toBe(false);
  });
});

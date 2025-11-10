import { completeTruncatedStructures } from "../../../../src/llm/json-processing/sanitizers/complete-truncated-structures";

describe("completeTruncatedStructures", () => {
  it("should close unterminated object", () => {
    const input = '{"a":1';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"a":1}');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should close unterminated array", () => {
    const input = "[1, 2, 3";
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe("[1, 2, 3]");
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should close nested array and object", () => {
    const input = '[{"a": {';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('[{"a": {}}]');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should close unterminated string then structure", () => {
    const input = '{"a":"hello';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"a":"hello"}');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should return unchanged for already complete JSON", () => {
    const input = '{"a":1}';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("should handle complex nested structure", () => {
    const input = '{"outer": {"inner": [1, 2';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"outer": {"inner": [1, 2]}}');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should handle empty input", () => {
    const result = completeTruncatedStructures("");
    expect(result.changed).toBe(false);
  });

  it("should handle whitespace-only input", () => {
    const result = completeTruncatedStructures("   ");
    expect(result.changed).toBe(false);
  });
});

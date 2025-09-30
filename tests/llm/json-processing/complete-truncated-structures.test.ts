import { completeTruncatedStructures } from "../../../src/llm/json-processing/sanitizers/complete-truncated-structures";

describe("completeTruncatedStructures sanitizer", () => {
  it("returns unchanged result for already complete JSON", () => {
    const input = '{"a":1}';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(false);
    expect(result.content).toBe(input);
  });

  it("closes unterminated object", () => {
    const input = '{"a":1';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"a":1}');
  });

  it("closes nested array and object producing valid JSON", () => {
    const input = '[{"a": {';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('[{"a": {}}]');
  });

  it("closes unterminated string then structure", () => {
    const input = '{"a":"hello';
    const result = completeTruncatedStructures(input);
    expect(result.changed).toBe(true);
    expect(result.content).toBe('{"a":"hello"}');
  });
});

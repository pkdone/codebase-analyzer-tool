import { addMissingCommas } from "../../../../src/llm/json-processing/sanitizers/add-missing-commas";

describe("addMissingCommas", () => {
  it("should add missing comma between two string properties on separate lines", () => {
    const input = `{
  "prop1": "value1"
  "prop2": "value2"
}`;
    const result = addMissingCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('"prop1": "value1",');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should handle multiple missing commas", () => {
    const input = `{
  "a": "value1"
  "b": "value2"
  "c": "value3"
}`;
    const result = addMissingCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('"a": "value1",');
    expect(result.content).toContain('"b": "value2",');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should handle missing comma after nested object", () => {
    const input = `{
  "outer": {"inner": "value"}
  "next": "value"
}`;
    const result = addMissingCommas(input);
    expect(result.changed).toBe(true);
    expect(result.content).toContain('{"inner": "value"},');
    expect(() => JSON.parse(result.content)).not.toThrow();
  });

  it("should not add comma when property is last in object", () => {
    const input = `{
  "a": "value1",
  "b": "value2"
}`;
    const result = addMissingCommas(input);
    expect(result.changed).toBe(false);
  });

  it("should not add comma when already present", () => {
    const input = `{
  "a": "value1",
  "b": "value2"
}`;
    const result = addMissingCommas(input);
    expect(result.changed).toBe(false);
  });

  it("should handle empty input", () => {
    const result = addMissingCommas("");
    expect(result.changed).toBe(false);
  });

  it("should handle whitespace-only input", () => {
    const result = addMissingCommas("   ");
    expect(result.changed).toBe(false);
  });
});

import { collapseDuplicateJsonObject } from "../../../src/llm/json-processing/sanitizers/collapse-duplicate-json-object";

describe("collapseDuplicateJsonObject sanitizer", () => {
  it("collapses duplicated identical object", () => {
    const obj = '{"a":1}';
    const input = obj + obj;
    const { content, changed, description } = collapseDuplicateJsonObject(input);
    expect(changed).toBe(true);
    expect(description).toMatch(/collapsed/i);
    expect(content).toBe(obj);
  });

  it("leaves distinct concatenated objects unchanged", () => {
    const input = '{"a":1}{"b":2}';
    const { content, changed } = collapseDuplicateJsonObject(input);
    expect(changed).toBe(false);
    expect(content).toBe(input);
  });
});

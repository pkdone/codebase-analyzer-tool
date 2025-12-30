/**
 * Tests for the extra properties remover strategy.
 */

import { extraPropertiesRemover } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/extra-properties-remover";

describe("extraPropertiesRemover", () => {
  it("should return unchanged for empty input", () => {
    const result = extraPropertiesRemover.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged for valid JSON without extra properties", () => {
    const input = '{"name": "test", "value": 123}';
    const result = extraPropertiesRemover.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should remove quoted extra_thoughts property", () => {
    const input = '{"name": "test", "extra_thoughts": "some thoughts"}';
    const result = extraPropertiesRemover.apply(input);
    expect(result.content).not.toContain("extra_thoughts");
    expect(result.changed).toBe(true);
  });

  it("should remove quoted extra_text property", () => {
    const input = '{"name": "test", "extra_text": "some text"}';
    const result = extraPropertiesRemover.apply(input);
    expect(result.content).not.toContain("extra_text");
    expect(result.changed).toBe(true);
  });

  it("should remove unquoted extra_thoughts property", () => {
    const input = '{"name": "test", extra_thoughts: "some thoughts"}';
    const result = extraPropertiesRemover.apply(input);
    expect(result.content).not.toContain("extra_thoughts");
    expect(result.changed).toBe(true);
  });

  it("should remove extra_thoughts with object value", () => {
    const input = '{"name": "test", "extra_thoughts": {"thought": "value"}}';
    const result = extraPropertiesRemover.apply(input);
    expect(result.content).not.toContain("extra_thoughts");
    expect(result.changed).toBe(true);
  });

  it("should preserve other properties", () => {
    const input = '{"name": "test", "extra_thoughts": "remove this", "value": 123}';
    const result = extraPropertiesRemover.apply(input);
    expect(result.content).toContain('"name"');
    expect(result.content).toContain('"value"');
    expect(result.changed).toBe(true);
  });

  it("should add diagnostics when removing properties", () => {
    const input = '{"name": "test", "extra_thoughts": "thoughts"}';
    const result = extraPropertiesRemover.apply(input);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});


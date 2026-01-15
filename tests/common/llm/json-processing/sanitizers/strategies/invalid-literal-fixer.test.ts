/**
 * Tests for the invalid literal fixer strategy.
 */

import { invalidLiteralFixer } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/invalid-literal-fixer";

describe("invalidLiteralFixer", () => {
  it("should return unchanged for empty input", () => {
    const result = invalidLiteralFixer.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged for valid JSON", () => {
    const input = '{"name": "test", "value": null}';
    const result = invalidLiteralFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should convert undefined to null", () => {
    const input = '{"value": undefined}';
    const result = invalidLiteralFixer.apply(input);
    expect(result.content).toBe('{"value": null}');
    expect(result.changed).toBe(true);
  });

  it("should convert undefined to null with whitespace", () => {
    const input = '{"value":  undefined }';
    const result = invalidLiteralFixer.apply(input);
    expect(result.content).toBe('{"value":  null }');
    expect(result.changed).toBe(true);
  });

  it("should handle multiple undefined values", () => {
    const input = '{"a": undefined, "b": undefined}';
    const result = invalidLiteralFixer.apply(input);
    expect(result.content).toBe('{"a": null, "b": null}');
    expect(result.changed).toBe(true);
  });

  it("should fix corrupted numeric values like _3", () => {
    const input = '{"count": _3}';
    const result = invalidLiteralFixer.apply(input);
    expect(result.content).toBe('{"count": 3}');
    expect(result.changed).toBe(true);
  });

  it("should add diagnostics for changes", () => {
    const input = '{"value": undefined}';
    const result = invalidLiteralFixer.apply(input);
    expect(result.repairs.length).toBeGreaterThan(0);
    expect(result.repairs[0]).toContain("undefined");
  });
});

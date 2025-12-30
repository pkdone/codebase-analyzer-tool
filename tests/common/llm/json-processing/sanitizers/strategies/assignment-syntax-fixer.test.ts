/**
 * Tests for the assignment syntax fixer strategy.
 */

import { assignmentSyntaxFixer } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/assignment-syntax-fixer";

describe("assignmentSyntaxFixer", () => {
  it("should return unchanged for empty input", () => {
    const result = assignmentSyntaxFixer.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged for valid JSON", () => {
    const input = '{"name": "test", "value": 123}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should fix := to :", () => {
    const input = '{"name":= "test"}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toContain('"name":');
    expect(result.content).not.toContain(":=");
    expect(result.changed).toBe(true);
  });

  it("should fix stray minus sign before colon", () => {
    const input = '{"name":- "test"}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toBe('{"name": "test"}');
    expect(result.changed).toBe(true);
  });

  it("should fix missing opening quotes on values", () => {
    const input = '{"name": test"}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toContain('"test"');
    expect(result.changed).toBe(true);
  });

  it("should fix unquoted string values", () => {
    const input = '{"name": someValue}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toContain('"someValue"');
    expect(result.changed).toBe(true);
  });

  it("should not change boolean literals", () => {
    const input = '{"flag": true}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should not change null literals", () => {
    const input = '{"value": null}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should not change numeric values", () => {
    const input = '{"count": 42}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should add diagnostics for changes", () => {
    const input = '{"name":= "test"}';
    const result = assignmentSyntaxFixer.apply(input);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

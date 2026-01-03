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

  describe("Original patterns (extra_thoughts, extra_text)", () => {
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
  });

  describe("Generic LLM artifact patterns", () => {
    it("should remove extra_info property", () => {
      const input = '{"name": "test", "extra_info": "some info"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("extra_info");
      expect(result.changed).toBe(true);
    });

    it("should remove extra_notes property", () => {
      const input = '{"name": "test", "extra_notes": "my notes"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("extra_notes");
      expect(result.changed).toBe(true);
    });

    it("should remove extra_reasoning property", () => {
      const input = '{"name": "test", "extra_reasoning": "my reasoning"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("extra_reasoning");
      expect(result.changed).toBe(true);
    });

    it("should remove extra_analysis property", () => {
      const input = '{"name": "test", "extra_analysis": "my analysis"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("extra_analysis");
      expect(result.changed).toBe(true);
    });

    it("should remove llm_thoughts property", () => {
      const input = '{"name": "test", "llm_thoughts": "thinking..."}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("llm_thoughts");
      expect(result.changed).toBe(true);
    });

    it("should remove llm_notes property", () => {
      const input = '{"name": "test", "llm_notes": "my notes"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("llm_notes");
      expect(result.changed).toBe(true);
    });

    it("should remove ai_notes property", () => {
      const input = '{"name": "test", "ai_notes": "AI notes"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("ai_notes");
      expect(result.changed).toBe(true);
    });

    it("should remove ai_reasoning property", () => {
      const input = '{"name": "test", "ai_reasoning": "AI reasoning"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("ai_reasoning");
      expect(result.changed).toBe(true);
    });

    it("should remove _internal_metadata property", () => {
      const input = '{"name": "test", "_internal_metadata": "metadata"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("_internal_metadata");
      expect(result.changed).toBe(true);
    });

    it("should remove _private_notes property", () => {
      const input = '{"name": "test", "_private_notes": "private"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("_private_notes");
      expect(result.changed).toBe(true);
    });
  });

  describe("Unquoted generic artifact patterns", () => {
    it("should remove unquoted extra_info property", () => {
      const input = '{"name": "test", extra_info: "some info"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("extra_info");
      expect(result.changed).toBe(true);
    });

    it("should remove unquoted llm_notes property", () => {
      const input = '{"name": "test", llm_notes: "some notes"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("llm_notes");
      expect(result.changed).toBe(true);
    });

    it("should remove unquoted ai_thoughts property", () => {
      const input = '{"name": "test", ai_thoughts: "thinking"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("ai_thoughts");
      expect(result.changed).toBe(true);
    });
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

  describe("knownProperties-based removal", () => {
    const knownProperties = ["name", "value", "description", "type"];

    it("should not remove properties that are in knownProperties", () => {
      const input = '{"name": "test", "value": 123}';
      const result = extraPropertiesRemover.apply(input, { knownProperties });
      expect(result.content).toContain('"name"');
      expect(result.content).toContain('"value"');
      expect(result.changed).toBe(false);
    });

    it("should remove unknown _prefixed properties when knownProperties provided", () => {
      const input = '{"name": "test", "_internal_state": "some state"}';
      const result = extraPropertiesRemover.apply(input, { knownProperties });
      expect(result.content).not.toContain("_internal_state");
      expect(result.changed).toBe(true);
    });

    it("should remove unknown _internal_output property (underscore prefix with output suffix)", () => {
      const input = '{"name": "test", "_internal_output": "generated content"}';
      const result = extraPropertiesRemover.apply(input, { knownProperties });
      expect(result.content).not.toContain("_internal_output");
      expect(result.changed).toBe(true);
    });

    it("should remove extra_ prefixed properties", () => {
      // The extraPropertiesRemover specifically handles extra_*, llm_*, ai_*, _* prefixes
      const input = '{"name": "test", extra_data: "some data"}';
      const result = extraPropertiesRemover.apply(input, { knownProperties });
      expect(result.content).not.toContain("extra_data");
      expect(result.changed).toBe(true);
    });

    it("should not remove regular unknown properties without suspicious patterns", () => {
      // Properties like "category" or "status" shouldn't be removed even if not in knownProperties
      // because they don't look like LLM artifacts
      const input = '{"name": "test", "category": "example"}';
      const result = extraPropertiesRemover.apply(input, { knownProperties });
      // "category" should remain since it doesn't match LLM artifact patterns
      expect(result.content).toContain('"category"');
      expect(result.changed).toBe(false);
    });

    it("should work without knownProperties (default behavior)", () => {
      const input = '{"name": "test", "extra_thoughts": "thinking"}';
      const result = extraPropertiesRemover.apply(input);
      expect(result.content).not.toContain("extra_thoughts");
      expect(result.changed).toBe(true);
    });

    it("should handle knownProperties case-insensitively", () => {
      const input = '{"NAME": "test", "Value": 123}';
      const result = extraPropertiesRemover.apply(input, { knownProperties });
      expect(result.content).toContain('"NAME"');
      expect(result.content).toContain('"Value"');
      expect(result.changed).toBe(false);
    });
  });
});

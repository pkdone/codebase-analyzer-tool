import { executeRules } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/rule-executor";
import { STRUCTURAL_RULES } from "../../../../../../src/common/llm/json-processing/sanitizers/rules/structural-rules";

describe("STRUCTURAL_RULES - missingPropertyValue", () => {
  describe("missing value before closing brace", () => {
    it('should remove truncated property: "description":}', () => {
      const input = `{
  "name": "Test",
  "description":}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('"description":');
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.name).toBe("Test");
    });

    it('should remove truncated property with whitespace: "description": }', () => {
      const input = `{
  "name": "Test",
  "description": }`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('"description"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle nested object with truncated property", () => {
      const input = `{
  "outer": {
    "name": "Test",
    "value":}
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.outer.name).toBe("Test");
    });
  });

  describe("missing value before closing bracket", () => {
    it('should remove truncated property: "path":]', () => {
      const input = `{
  "items": [
    {
      "name": "item1",
      "path":]
    }
  ]
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('"path":');
      // After removing the incomplete property, the JSON should be valid
      // though it may still have structural issues that other rules handle
    });
  });

  describe("missing value before comma", () => {
    it('should remove truncated property: "method":, "next":', () => {
      const input = `{
  "name": "Test",
  "method":,
  "next": "value"
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(result.content).not.toContain('"method":');
      // The result should have the incomplete property removed
    });
  });

  describe("should NOT modify valid JSON", () => {
    it("should preserve property with string value", () => {
      const input = `{
  "name": "Test",
  "description": "A valid description"
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve property with number value", () => {
      const input = `{
  "name": "Test",
  "count": 42
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve property with null value", () => {
      const input = `{
  "name": "Test",
  "optional": null
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve property with array value", () => {
      const input = `{
  "name": "Test",
  "items": []
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve property with object value", () => {
      const input = `{
  "name": "Test",
  "nested": {}
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve property with boolean value", () => {
      const input = `{
  "name": "Test",
  "active": true
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world truncation patterns", () => {
    it("should handle truncation in endpoint array from LLM response", () => {
      const input = `{
  "endpoints": [
    {
      "path": "/api/v1/users",
      "method": "GET",
      "description": "Gets all users"
    },
    {
      "path": "/api/v1/users/{id}",
      "method": "POST",
      "description":}
  ]
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.endpoints[0].method).toBe("GET");
    });

    it("should handle multiple levels of nesting with truncation", () => {
      const input = `{
  "services": [
    {
      "name": "Service1",
      "endpoints": [
        {
          "path": "/api",
          "method":}
      ]
    }
  ]
}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      // The truncated property should be removed
      expect(result.content).not.toContain('"method":}');
    });
  });

  describe("edge cases", () => {
    it("should handle property at start of object", () => {
      const input = `{"description":}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed).toEqual({});
    });

    it("should handle truncation after comma in previous property", () => {
      const input = `{
  "name": "Test",
  "description":}`;
      const result = executeRules(input, STRUCTURAL_RULES);
      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.name).toBe("Test");
      expect(parsed).not.toHaveProperty("description");
    });
  });
});

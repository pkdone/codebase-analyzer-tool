import { fixMismatchedDelimiters } from "../../../src/llm/json-processing/sanitizers/fix-mismatched-delimiters";

describe("fixMismatchedDelimiters", () => {
  describe("basic mismatches", () => {
    it("should fix object closed with array bracket", () => {
      const input = '{"key": "value"]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value"}');
      expect(result.description).toContain("Fixed 1 mismatched delimiter");
    });

    it("should fix array closed with object brace", () => {
      const input = '["item1", "item2"}';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('["item1", "item2"]');
      expect(result.description).toContain("Fixed 1 mismatched delimiter");
    });

    it("should handle already correct JSON", () => {
      const input = '{"key": "value"}';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle already correct array", () => {
      const input = '["item1", "item2"]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("nested structures", () => {
    it("should fix nested object with mismatched delimiter", () => {
      const input = '{"outer": {"inner": "value"]]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"outer": {"inner": "value"}}');
      expect(result.description).toContain("Fixed 2 mismatched delimiter");
    });

    it("should fix nested array with mismatched delimiter", () => {
      const input = '[["nested", "array"}}';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('[["nested", "array"]]');
    });

    it("should fix mixed nested structures", () => {
      const input = '{"array": ["item1", "item2"}]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"array": ["item1", "item2"]}');
    });

    it("should fix deeply nested structures", () => {
      const input = '{"level1": {"level2": {"level3": "value"]]]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"level1": {"level2": {"level3": "value"}}}');
    });
  });

  describe("real-world case from error log", () => {
    it("should fix the parameters array object mismatch", () => {
      // Simplified version of the actual error case
      // The issue: closing bracket ] is used instead of closing brace }
      const input = `{
  "publicMethods": [
    {
      "name": "updateLinkedSavingsAccount",
      "parameters": [
        {
          "name": "savingsAccount",
          "type": "SavingsAccount"
        ]
      ],
      "returnType": "void"
    }
  ]
}`;
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      // The closing ] after SavingsAccount should be fixed to }
      expect(result.content).toContain('"type": "SavingsAccount"\n        }\n      ]');
      // Verify it's valid JSON after fix
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix multiple parameter objects with mismatched delimiters", () => {
      const input = `{
  "methods": [
    {
      "params": [
        {"name": "param1", "type": "String"],
        {"name": "param2", "type": "Integer"]
      ]
    }
  ]
}`;
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.description).toContain("Fixed 2 mismatched delimiter");
      // Verify it's valid JSON after fix
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("string handling", () => {
    it("should ignore delimiters inside strings", () => {
      const input = '{"key": "value with ] and } chars"}';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle escaped quotes in strings", () => {
      const input = '{"key": "value with \\" quote"]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key": "value with \\" quote"}');
    });

    it("should handle complex escaped content", () => {
      const input = '{"path": "C:\\\\folder\\\\file.txt", "array": [1, 2, 3}}';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"path": "C:\\\\folder\\\\file.txt", "array": [1, 2, 3]}');
    });

    it("should not be confused by bracket-like characters in strings", () => {
      const input = '{"message": "[INFO] Processing {data}", "status": "ok"]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"message": "[INFO] Processing {data}", "status": "ok"}');
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      const result = fixMismatchedDelimiters("");
      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle whitespace-only input", () => {
      const result = fixMismatchedDelimiters("   ");
      expect(result.changed).toBe(false);
    });

    it("should handle multiple mismatches in one line", () => {
      const input = '{"a": [1, 2}, "b": {"x": "y"]]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a": [1, 2], "b": {"x": "y"}}');
      // 3 fixes: array closing }, object closing ], and outer object closing ]
      expect(result.description).toContain("Fixed 3 mismatched delimiter");
    });

    it("should preserve correct delimiters when fixing others", () => {
      const input = '{"correct": [1, 2], "wrong": {"key": "val"]]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"correct": [1, 2], "wrong": {"key": "val"}}');
      // Verify the correct part wasn't touched
      expect(result.content).toContain('"correct": [1, 2]');
    });

    it("should handle extra closing delimiters gracefully", () => {
      // Extra closing delimiters should be left for other sanitizers
      const input = '{"key": "value"}}}';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("complex real-world structures", () => {
    it("should fix complex nested object with array of objects", () => {
      const input = `{
  "classname": "MyClass",
  "methods": [
    {
      "name": "method1",
      "params": [
        {"name": "p1", "type": "String"],
        {"name": "p2", "type": "Integer"]
      ],
      "return": "void"
    },
    {
      "name": "method2",
      "params": []
    ]
  ]
}`;
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      // Should fix all the mismatched delimiters
      expect(() => JSON.parse(result.content)).not.toThrow();
      const parsed = JSON.parse(result.content);
      expect(parsed.methods).toHaveLength(2);
      expect(parsed.methods[0].params).toHaveLength(2);
    });

    it("should handle alternating object/array nesting", () => {
      const input = '{"a": [{"b": [{"c": "d"]]]]]';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"a": [{"b": [{"c": "d"}]}]}');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("performance and correctness", () => {
    it("should maintain original content when no changes needed", () => {
      const input = '{"valid": [1, 2, {"nested": true}], "also": "valid"}';
      const result = fixMismatchedDelimiters(input);
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle large structures efficiently", () => {
      // Create a large but malformed structure
      const items = Array.from({ length: 100 }, (_, i) => `{"id": ${i}, "value": "item${i}"]`);
      const input = `[${items.join(", ")}`;
      
      const start = Date.now();
      const result = fixMismatchedDelimiters(input);
      const elapsed = Date.now() - start;
      
      expect(result.changed).toBe(true);
      expect(elapsed).toBeLessThan(100); // Should be fast
      expect(result.description).toContain("Fixed 100 mismatched delimiter");
    });
  });
});


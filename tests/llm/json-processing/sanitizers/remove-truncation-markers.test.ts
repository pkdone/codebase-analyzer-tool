import { removeTruncationMarkers } from "../../../../src/llm/json-processing/sanitizers/remove-truncation-markers";

describe("removeTruncationMarkers", () => {
  describe("basic functionality", () => {
    it("should remove standalone truncation marker lines", () => {
      const input = `"item1",
...
]`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("...");
      expect(result.content).toContain('"item1",');
      expect(result.content).toContain("]");
      expect(result.description).toBe("Removed truncation markers (e.g., ...)");
    });

    it("should handle the exact error case from response-error-2025-11-02T22-19-43-768Z.log", () => {
      // This reproduces the exact error where ... appears on its own line before closing bracket
      const input = `  "internalReferences": [
    "org.apache.fineract.infrastructure.accountnumberformat.api.AccountNumberFormatsApiResourceSwagger.PostAccountNumberFormatsResponse",
...
]`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("...");
      expect(result.content).toContain("PostAccountNumberFormatsResponse");
      expect(result.content).toContain("]");
      // Verify the truncation marker is removed and JSON structure is intact
      expect(result.content).toMatch(/PostAccountNumberFormatsResponse.*\]/s);
      // Verify no truncation marker remains
      const lines = result.content.split("\n");
      const hasTruncationMarker = lines.some((line) =>
        /^\s*(\.\.\.|\[\.\.\.\]|\(truncated\))/.test(line.trim()),
      );
      expect(hasTruncationMarker).toBe(false);
    });

    it("should remove truncation markers with different formats", () => {
      const testCases = [
        { input: `"item",\n...\n]`, marker: "..." },
        { input: `"item",\n[...]\n]`, marker: "[...]" },
        { input: `"item",\n(truncated)\n]`, marker: "(truncated)" },
        { input: `"item",\n... (truncated)\n]`, marker: "... (truncated)" },
      ];

      testCases.forEach(({ input, marker }) => {
        const result = removeTruncationMarkers(input);

        expect(result.changed).toBe(true);
        expect(result.content).not.toContain(marker);
        expect(result.content).toContain('"item",');
        expect(result.content).toContain("]");
      });
    });

    it("should handle truncation markers in arrays", () => {
      const input = `[
  "item1",
  "item2",
...
]`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("...");
      expect(result.content).toContain('"item1",');
      expect(result.content).toContain('"item2",');
      expect(result.content).toContain("]");
    });

    it("should handle truncation markers in objects", () => {
      const input = `{
  "prop1": "value1",
  "prop2": "value2"
...
}`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("...");
      expect(result.content).toContain('"prop1": "value1",');
      expect(result.content).toContain('"prop2": "value2"');
      expect(result.content).toContain("}");
    });

    it("should not modify valid JSON without truncation markers", () => {
      const input = `{
  "name": "value",
  "array": ["item1", "item2"]
}`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle truncation markers with whitespace", () => {
      const input = `"item",
  ...
]`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("...");
      expect(result.content).toMatch(/"item",\s*\]/);
    });

    it("should handle incomplete strings followed by truncation markers", () => {
      const input = `"incomplete string...\n]`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"incomplete string"');
      expect(result.content).toContain("]");
      // Should add comma for array closure
      expect(result.content).toMatch(/"incomplete string",\s*\]/);
    });

    it("should handle multiple truncation markers", () => {
      const input = `[
  "item1",
...
  "item2",
...
]`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("...");
      expect(result.content).toContain('"item1",');
      expect(result.content).toContain('"item2",');
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      const result = removeTruncationMarkers("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle input with only truncation marker", () => {
      const input = "...";

      const result = removeTruncationMarkers(input);

      // Pattern requires newlines, so single line ... won't match
      // This is okay - it's not a common case
      expect(result.changed).toBe(false);
    });

    it("should not modify strings containing ... as content", () => {
      const input = `{
  "description": "This has ... in the text",
  "pattern": "..."
}`;

      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("error handling", () => {
    it("should handle regex errors gracefully", () => {
      // Mock a replace that throws an error
      const originalReplace = String.prototype.replace;
      String.prototype.replace = jest.fn().mockImplementation(() => {
        throw new Error("Regex error");
      });

      const input = `"item",\n...\n]`;
      const result = removeTruncationMarkers(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.diagnostics).toContain("Sanitizer failed: Error: Regex error");

      // Restore original method
      String.prototype.replace = originalReplace;
    });
  });
});

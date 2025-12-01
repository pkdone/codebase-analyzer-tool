import { removeComments } from "../../../../src/llm/json-processing/sanitizers/index.js";

describe("removeComments", () => {
  describe("single-line comments", () => {
    it("should remove single-line comment at the end of a line", () => {
      const input = `{
  "name": "value" // This is a comment
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  "name": "value" 
}`);
      expect(result.description).toBe("Removed comments from JSON");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("single-line comment"))).toBe(true);
    });

    it("should remove single-line comment on its own line", () => {
      const input = `{
  // This is a comment
  "name": "value"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  
  "name": "value"
}`);
      expect(result.description).toBe("Removed comments from JSON");
    });

    it("should remove multiple single-line comments", () => {
      const input = `{
  // First comment
  "name": "value", // Second comment
  "property": "test" // Third comment
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  
  "name": "value", 
  "property": "test" 
}`);
    });

    it("should not remove // that appears inside a string value", () => {
      const input = `{
  "url": "https://example.com//path",
  "comment": "This is not a // comment"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle single-line comment at the start of JSON", () => {
      const input = `// This is a comment
{
  "name": "value"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  "name": "value"
}`);
    });
  });

  describe("multi-line comments", () => {
    it("should remove multi-line comment", () => {
      const input = `{
  /* This is a multi-line comment */
  "name": "value"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  
  "name": "value"
}`);
      expect(result.description).toBe("Removed comments from JSON");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("multi-line comment"))).toBe(true);
    });

    it("should remove multi-line comment spanning multiple lines", () => {
      const input = `{
  /* This is a
     multi-line comment
     spanning several lines */
  "name": "value"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  
  "name": "value"
}`);
    });

    it("should remove multiple multi-line comments", () => {
      const input = `{
  /* First comment */
  "name": "value",
  /* Second comment */
  "property": "test"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  
  "name": "value",
  
  "property": "test"
}`);
    });

    it("should not remove /* */ that appears inside a string value", () => {
      const input = `{
  "description": "This is not a /* comment */",
  "code": "/* This is code */"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle nested multi-line comments", () => {
      const input = `{
  /* Outer comment /* inner comment */ more outer */
  "name": "value"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      // The regex should handle this, though nested comments are technically invalid
      expect(result.content).not.toContain("Outer comment");
    });
  });

  describe("mixed comments", () => {
    it("should remove both single-line and multi-line comments", () => {
      const input = `{
  // Single-line comment
  /* Multi-line comment */
  "name": "value" // Another comment
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  
  
  "name": "value" 
}`);
    });

    it("should handle comments in complex JSON structure", () => {
      const input = `{
  // Top-level comment
  "name": "value",
  "array": [
    // Array comment
    "item1",
    /* Multi-line array comment */
    "item2"
  ],
  "object": {
    // Nested object comment
    "property": "value"
  }
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("//");
      expect(result.content).not.toContain("/*");
      expect(result.content).not.toContain("*/");
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      const result = removeComments("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle input with no comments", () => {
      const input = `{
  "name": "value",
  "property": "test"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle comment-like patterns in property names", () => {
      const input = `{
  "commentField": "value",
  "url": "https://example.com"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle escaped slashes in strings", () => {
      const input = `{
  "path": "C:\\\\Users\\\\Name",
  "regex": "\\/\\/.*"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle comment at the very end", () => {
      const input = `{
  "name": "value"
} // End comment`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  "name": "value"
} `);
    });
  });

  describe("diagnostics", () => {
    it("should provide diagnostics for removed comments", () => {
      const input = `{
  // Comment 1
  /* Comment 2 */
  "name": "value"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
      expect(result.diagnostics?.some((d) => d.includes("comment"))).toBe(true);
    });

    it("should limit diagnostics to prevent excessive output", () => {
      const input = `{
${Array(20)
  .fill(0)
  .map((_, i) => `  // Comment ${i}`)
  .join("\n")}
  "name": "value"
}`;

      const result = removeComments(input);

      expect(result.changed).toBe(true);
      expect(result.diagnostics).toBeDefined();
      // Should limit to 10 diagnostics
      expect(result.diagnostics?.length).toBeLessThanOrEqual(10);
    });
  });
});

import { removeStrayLinePrefixChars } from "../../../../src/llm/json-processing/sanitizers/remove-stray-line-prefix-chars";

describe("removeStrayLinePrefixChars", () => {
  describe("when input has no stray line prefix characters", () => {
    it("should return unchanged result for valid JSON", () => {
      const input = JSON.stringify({ name: "test", value: 123 }, null, 2);
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
    });

    it("should return unchanged result for properly indented multi-line JSON", () => {
      const input = `{
  "items": [
    "value1",
    "value2"
  ],
  "count": 2
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should return unchanged result for empty string", () => {
      const result = removeStrayLinePrefixChars("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should return unchanged result for JSON with valid property names starting with letters", () => {
      const input = `{
  "name": "test",
  "description": "a description"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("when input has single character stray prefixes", () => {
    it("should remove single letter prefix before quoted string (exact error case from first log)", () => {
      const input = `{
  "id",
e            "customerId",
  "street"
}`;
      const expected = `{
  "id",
            "customerId",
  "street"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
      expect(result.description).toContain("1 line");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics).toHaveLength(1);
    });

    it("should remove single letter prefix before closing bracket (exact error case from second log)", () => {
      const input = `{
  "items": [
    {
      "name": "test"
    }
s  ],
  "count": 1
}`;
      const expected = `{
  "items": [
    {
      "name": "test"
    }
  ],
  "count": 1
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
      expect(result.description).toContain("1 line");
    });

    it("should remove single letter prefix before closing brace", () => {
      const input = `{
  "nested": {
    "value": 1
t  },
  "other": 2
}`;
      const expected = `{
  "nested": {
    "value": 1
  },
  "other": 2
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove single letter prefix before comma", () => {
      const input = `{
  "field1": "value1"
x  ,
  "field2": "value2"
}`;
      const expected = `{
  "field1": "value1"
  ,
  "field2": "value2"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove single letter prefix before opening brace", () => {
      const input = `{
  "nested": 
x      {
    "value": 1
  }
}`;
      const expected = `{
  "nested": 
      {
    "value": 1
  }
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove single letter prefix before opening bracket", () => {
      const input = `{
  "items": 
a    [
    1, 2, 3
  ]
}`;
      const expected = `{
  "items": 
    [
    1, 2, 3
  ]
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove single letter prefix before number", () => {
      const input = `{
  "count": 
z    42
}`;
      const expected = `{
  "count": 
    42
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove single letter prefix before boolean true", () => {
      const input = `{
  "active": 
t    true
}`;
      const expected = `{
  "active": 
    true
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove single letter prefix before boolean false", () => {
      const input = `{
  "active": 
f    false
}`;
      const expected = `{
  "active": 
    false
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove single letter prefix before null", () => {
      const input = `{
  "value": 
n    null
}`;
      const expected = `{
  "value": 
    null
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });
  });

  describe("when input has multi-character stray prefixes", () => {
    it("should remove word fragment prefix before quoted string", () => {
      const input = `{
  "name": "test",
desc      "description": "text"
}`;
      const expected = `{
  "name": "test",
      "description": "text"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove alphanumeric prefix with underscores", () => {
      const input = `{
  "field1": "value",
test_123    "field2": "value"
}`;
      const expected = `{
  "field1": "value",
    "field2": "value"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should remove prefix with numbers", () => {
      const input = `{
  "items": [
123abc    "item1",
    "item2"
  ]
}`;
      const expected = `{
  "items": [
    "item1",
    "item2"
  ]
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });
  });

  describe("when input has multiple stray prefixes", () => {
    it("should remove stray prefixes from multiple lines", () => {
      const input = `{
  "attributes": [
    "id",
e            "customerId",
f            "firstName",
    "lastName"
  ]
}`;
      const expected = `{
  "attributes": [
    "id",
            "customerId",
            "firstName",
    "lastName"
  ]
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
      expect(result.description).toContain("2 lines");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.length).toBeLessThanOrEqual(3); // We limit diagnostics to 3
    });

    it("should handle many stray prefixes efficiently", () => {
      const lines = ["{", '  "fields": [', '    "field0",'];

      // Add 10 lines with stray prefixes
      for (let i = 1; i <= 10; i++) {
        lines.push(`x${i}    "field${i}",`);
      }

      lines.push('    "fieldLast"');
      lines.push("  ]");
      lines.push("}");

      const input = lines.join("\n");
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.description).toContain("10 lines");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.length).toBe(3); // Limited to 3 examples
    });
  });

  describe("when input has tabs instead of spaces", () => {
    it("should remove stray prefix before tab-indented content", () => {
      const input = `{
\t"id": 1,
e\t\t"name": "test"
}`;
      const expected = `{
\t"id": 1,
\t\t"name": "test"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });

    it("should handle mixed spaces and tabs", () => {
      const input = `{
  "value1": 1,
abc\t\t"value2": 2
}`;
      const expected = `{
  "value1": 1,
\t\t"value2": 2
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
    });
  });

  describe("edge cases and safety checks", () => {
    it("should not remove prefix if there is only one space after it (safety check)", () => {
      // This should not match because we require at least 2 spaces
      const input = `{
  "field": 1,
e "other": 2
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not affect valid content that looks similar but isn't a stray prefix", () => {
      // Content where the pattern doesn't match (no whitespace separation)
      const input = `{
  "e": "value",
  "desc": "description"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle JSON with actual newlines in string values", () => {
      // This shouldn't affect strings that contain the pattern
      const input = `{
  "description": "line1\\nline2",
  "field": "value"
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve valid indentation when removing stray prefixes", () => {
      const input = `{
  "outer": {
    "inner": [
x      "value1",
      "value2"
    ]
  }
}`;
      const expected = `{
  "outer": {
    "inner": [
      "value1",
      "value2"
    ]
  }
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
      // Verify the indentation is preserved correctly
      const lines = result.content.split("\n");
      expect(lines[3]).toBe('      "value1",');
      expect(lines[4]).toBe('      "value2"');
    });
  });

  describe("real-world error cases from logs", () => {
    it("should fix the exact pattern from the first error log", () => {
      // Exact excerpt from the first error log
      const input = `        {
          "name": "Address",
          "description": "Represents a physical address associated with a customer.",
          "attributes": [
            "id",
e            "customerId",
            "street",
            "city",
            "postalCode",
            "country"
          ]
        }`;

      const expected = `        {
          "name": "Address",
          "description": "Represents a physical address associated with a customer.",
          "attributes": [
            "id",
            "customerId",
            "street",
            "city",
            "postalCode",
            "country"
          ]
        }`;

      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);
      expect(JSON.parse(result.content)).toEqual(JSON.parse(expected));
    });

    it("should fix the exact pattern from the second error log", () => {
      // Exact excerpt from the second error log (around line 107)
      const input = `  "repositories": [
    {
      "name": "PersistentAuditEventRepository",
      "description": "This repository is responsible for the persistence of the AuditEvent aggregate.",
      "aggregate": "AuditEvent"
    }
s  ],
  "potentialMicroservices": []`;

      const expected = `  "repositories": [
    {
      "name": "PersistentAuditEventRepository",
      "description": "This repository is responsible for the persistence of the AuditEvent aggregate.",
      "aggregate": "AuditEvent"
    }
  ],
  "potentialMicroservices": []`;

      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(expected);

      // Should be parseable as valid JSON when wrapped
      const wrappedInput = `{${result.content}}`;
      expect(() => JSON.parse(wrappedInput)).not.toThrow();
    });

    it("should make the corrected JSON parseable", () => {
      const input = `{
  "items": [
    "id",
e    "customerId"
  ]
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.changed).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();

      const parsed = JSON.parse(result.content);
      expect(parsed.items).toEqual(["id", "customerId"]);
    });
  });

  describe("diagnostics reporting", () => {
    it("should provide diagnostic information for fixed lines", () => {
      const input = `{
  "field1": 1,
x    "field2": 2,
y    "field3": 3
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.length).toBe(2);
      expect(result.diagnostics![0]).toContain("Line 3");
      expect(result.diagnostics![1]).toContain("Line 4");
    });

    it("should limit diagnostics to 3 examples", () => {
      const input = `{
a    "f1": 1,
b    "f2": 2,
c    "f3": 3,
d    "f4": 4,
e    "f5": 5
}`;
      const result = removeStrayLinePrefixChars(input);

      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.length).toBe(3);
    });

    it("should include abbreviated content in diagnostics", () => {
      const longLine = `{
verylong    "veryLongFieldNameThatExceedsFortyCharactersInLength": "value"
}`;
      const result = removeStrayLinePrefixChars(longLine);

      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics![0]).toContain("...");
      expect(result.diagnostics![0].length).toBeLessThan(100); // Should be truncated
    });
  });

  describe("performance and large inputs", () => {
    it("should handle large JSON documents efficiently", () => {
      const lines = ["{"];

      // Create a large JSON with 1000 fields
      for (let i = 0; i < 1000; i++) {
        lines.push(`  "field${i}": ${i},`);
      }

      lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1); // Remove last comma
      lines.push("}");

      const input = lines.join("\n");
      const startTime = Date.now();
      const result = removeStrayLinePrefixChars(input);
      const endTime = Date.now();

      expect(result.changed).toBe(false);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });
});

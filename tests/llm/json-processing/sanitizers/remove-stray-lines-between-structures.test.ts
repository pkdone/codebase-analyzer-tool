import { removeStrayLinesBetweenStructures } from "../../../../src/llm/json-processing/sanitizers/remove-stray-lines-between-structures";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("removeStrayLinesBetweenStructures", () => {
  describe("basic functionality", () => {
    it("should remove file path line between array and property", () => {
      const input = `  ],
src/main/java/com/example/MyClass.java
  "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`  ],
  "publicConstants": []`);
      expect(result.description).toBe(SANITIZATION_STEP.REMOVED_STRAY_LINES_BETWEEN_STRUCTURES);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should remove stray text line between closing brace and property", () => {
      const input = `  },
This is some explanation text
  "nextProperty": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`  },
  "nextProperty": "value"`);
    });

    it("should remove stray line after comma", () => {
      const input = `    "externalReferences": [
      "java.sql.Connection",
      "java.util.Map"
    ],
src/main/java/com/example/MyClass.java
    "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('    "publicConstants": []');
      expect(result.content).not.toContain("src/main/java/com/example/MyClass.java");
    });

    it("should not modify valid JSON without stray lines", () => {
      const input = `{
  "name": "value",
  "number": 42
}`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world error cases", () => {
    it("should fix the exact error pattern from CategoryDetailsPopulator log", () => {
      const input = `    ],
src/main/java/com/sun/j2ee/blueprints/petstore/tools/populate/CategoryDetailsPopulator.java
    "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('    "publicConstants": []');
      expect(result.content).not.toContain("CategoryDetailsPopulator.java");
      // Verify the fix was applied correctly
      expect(result.content).toMatch(/\],\s*\n\s*"publicConstants"/);
    });

    it("should handle file path with forward slashes", () => {
      const input = `  ],
src/apps/petstore/src/com/sun/j2ee/blueprints/petstore/tools/populate/CategoryDetailsPopulator.java
  "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('  "publicConstants": []');
      expect(result.content).not.toContain("CategoryDetailsPopulator.java");
    });

    it("should handle file path with backslashes", () => {
      const input = `  },
src\\apps\\petstore\\MyClass.java
  "nextProperty": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('  "nextProperty": "value"');
      expect(result.content).not.toContain("MyClass.java");
    });
  });

  describe("various stray line patterns", () => {
    it("should handle different stray line content", () => {
      const testCases = [
        {
          input: `  ],
some text here
  "property": "value"`,
          expectedNotContain: "some text here",
        },
        {
          input: `  },
This is a comment explaining something
  "next": "value"`,
          expectedNotContain: "This is a comment",
        },
        {
          input: `  ],
file:///path/to/file.java
  "prop": []`,
          expectedNotContain: "file:///path/to/file.java",
        },
      ];

      testCases.forEach(({ input, expectedNotContain }) => {
        const result = removeStrayLinesBetweenStructures(input);
        expect(result.changed).toBe(true);
        expect(result.content).not.toContain(expectedNotContain);
        expect(
          result.content.includes('"property"') ||
            result.content.includes('"next"') ||
            result.content.includes('"prop"'),
        ).toBe(true);
      });
    });

    it("should handle long stray lines", () => {
      const longLine =
        "src/very/long/path/to/a/file/that/is/really/really/long/and/goes/on/for/many/characters/MyClass.java";
      const input = `  ],
${longLine}
  "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain(longLine);
      expect(result.diagnostics).toBeDefined();
      // Diagnostics should abbreviate very long lines
      const diagnosticsStr = result.diagnostics?.join(" ") ?? "";
      if (longLine.length > 60) {
        expect(diagnosticsStr).toContain("...");
      }
    });
  });

  describe("delimiter contexts", () => {
    it("should fix after closing bracket", () => {
      const input = `    ],
stray line
    "property": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('    "property": "value"');
      expect(result.content).not.toContain("stray line");
    });

    it("should fix after closing brace", () => {
      const input = `    },
stray line
    "property": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('    "property": "value"');
      expect(result.content).not.toContain("stray line");
    });

    it("should fix after comma", () => {
      const input = `    "items": [1, 2, 3],
stray line
    "next": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('    "next": "value"');
      expect(result.content).not.toContain("stray line");
    });

    it("should preserve whitespace correctly", () => {
      const input = `    ],
stray line
      "property": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('      "property": "value"');
      expect(result.content).not.toContain("stray line");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = removeStrayLinesBetweenStructures("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle strings without stray lines", () => {
      const input = `{
  "name": "value"
}`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not remove valid indented JSON lines", () => {
      const input = `  ],
    "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      // Should not change - this is valid JSON
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not remove lines that start with valid JSON tokens", () => {
      const input = `  ],
  "thisIsValid": "json"
  "next": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      // Should not change valid JSON structure
      expect(result.content).toContain('"thisIsValid"');
    });

    it("should not remove whitespace-only lines", () => {
      const input = `  ],
    
  "property": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      // Whitespace lines are valid between structures
      expect(result.content).toContain("\n    \n");
    });
  });

  describe("nested structures", () => {
    it("should handle stray lines in nested objects", () => {
      const input = `    "outer": {
      "inner": []
    },
stray line
    "next": "value"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('    "next": "value"');
      expect(result.content).not.toContain("stray line");
    });

    it("should handle stray lines between array elements", () => {
      const input = `    ],
stray line
    "another": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('    "another": []');
      expect(result.content).not.toContain("stray line");
    });
  });

  describe("multiple fixes", () => {
    it("should fix multiple instances of stray lines", () => {
      const input = `    ],
first stray line
    "property1": "value1",
second stray line
    "property2": "value2"`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("first stray line");
      expect(result.content).not.toContain("second stray line");
      expect(result.content).toContain('"property1": "value1"');
      expect(result.content).toContain('"property2": "value2"');
    });
  });

  describe("valid JSON preservation", () => {
    it("should not modify content that is valid JSON structure", () => {
      const input = `{
  "items": [1, 2, 3],
  "name": "test"
}`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve valid JSON with proper indentation", () => {
      const input = `    "externalReferences": [
      "java.sql.Connection"
    ],
    "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not remove lines starting with opening braces", () => {
      const input = `    ],
    {
      "name": "value"
    }`;

      const result = removeStrayLinesBetweenStructures(input);

      // Should not change - opening brace is valid JSON
      expect(result.changed).toBe(false);
    });

    it("should not remove lines starting with opening brackets", () => {
      const input = `    },
    [
      "item1",
      "item2"
    ]`;

      const result = removeStrayLinesBetweenStructures(input);

      // Should not change - opening bracket is valid JSON
      expect(result.changed).toBe(false);
    });
  });

  describe("complex JSON structures", () => {
    it("should handle the exact error from the log file", () => {
      const input = `  "externalReferences": [
    "java.sql.Connection",
    "java.util.Map"
  ],
src/main/java/com/sun/j2ee/blueprints/petstore/tools/populate/CategoryDetailsPopulator.java
  "publicConstants": []`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      // Verify the file path is removed
      expect(result.content).not.toContain("CategoryDetailsPopulator.java");
      // Verify the JSON structure is preserved
      expect(result.content).toMatch(/\],\s*\n\s*"publicConstants"/);
      // Verify the JSON can be parsed
      expect(() => {
        const jsonStr = `{${result.content}}`;
        JSON.parse(jsonStr);
      }).not.toThrow();
    });

    it("should handle complete object with stray line", () => {
      const input = `{
  "externalReferences": [
    "java.sql.Connection"
  ],
src/main/java/com/example/MyClass.java
  "publicConstants": []
}`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicConstants": []');
      expect(result.content).not.toContain("MyClass.java");

      // Verify the JSON can be parsed
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should fix the exact error pattern from LoanTermVariationsData log - closing bracket comma, stray word", () => {
      // This is the exact pattern from the error log: ],\nprocrastinate\n  "externalReferences"
      const input = `  "internalReferences": [
    "org.apache.fineract.infrastructure.core.data.EnumOptionData",
    "org.apachefineract.portfolio.loanaccount.domain.LoanTermVariationType"
  ],
procrastinate
  "externalReferences": [
    "lombok.Getter"
  ]`;

      const result = removeStrayLinesBetweenStructures(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("procrastinate");
      expect(result.content).toContain('"externalReferences":');
      expect(result.content).toMatch(/],\s*\n\s*"externalReferences"/);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });
  });
});

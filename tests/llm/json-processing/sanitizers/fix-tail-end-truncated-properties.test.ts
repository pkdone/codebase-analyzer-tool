import { fixTailEndTruncatedProperties } from "../../../../src/llm/json-processing/sanitizers/fix-tail-end-truncated-properties";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("fixTailEndTruncatedProperties", () => {
  describe("basic functionality", () => {
    it("should fix the exact error pattern from the log file (alues -> publicMethods)", () => {
      const input = `    },
alues": [
      {
        "name": "stopScheduler",
`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_TAIL_END_TRUNCATED_PROPERTIES);
      expect(result.content).toContain('"publicMethods": [');
      expect(result.content).not.toContain('alues":');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should fix tail-end truncated property names with missing opening quote", () => {
      const input = `    },
nstants": [
      {
        "name": "CONSTANT"
`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicConstants": [');
      // The original pattern may appear in diagnostics, so we just check it was fixed
      expect(result.content).toMatch(/"publicConstants":\s*\[/);
    });

    it("should fix integrationPoints truncations", () => {
      const input = `    },
egrationPoints": [
      {
        "name": "integration1"
`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"integrationPoints": [');
      // The original pattern may appear in diagnostics, so we just check it was fixed
      expect(result.content).toMatch(/"integrationPoints":\s*\[/);
    });

    it("should not modify valid JSON", () => {
      const input = `    {
      "publicMethods": [
        {
          "name": "test"
        }
      ]
    }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle whitespace variations", () => {
      const input = `    },
    alues": [
      {
        "name": "test"
`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"publicMethods":\s*\[/);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle the exact pattern from the error log with full context", () => {
      const input = `      "codeSmells": []
    },
alues": [
      {
        "name": "stopScheduler",
        "purpose": "This method stops and removes a single scheduler",
        "parameters": [
          {
            "name": "name",
            "type": "String"
          }
        ],
        "returnType": "void"
      }
    ]
  },
  "databaseIntegration": {
`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": [');
      expect(result.content).not.toContain('alues":');

      // Verify the JSON structure is now valid (at least for this section)
      expect(result.content).toMatch(/"publicMethods":\s*\[/);
      expect(result.content).toMatch(/"databaseIntegration":\s*\{/);
    });

    it("should handle the exact error case from response-error-2025-11-04T08-11-44-376Z.log", () => {
      // This reproduces the exact error from the log file where alues": [ appears after },
      const input = `      "cyclomaticComplexity": 2,
      "linesOfCode": 7,
      "codeSmells": []
    },
alues": [
      {
        "name": "retrieveLoanAccountApplicableCharges",
        "purpose": "Retrieves a collection of charges that can be applied to a specific loan account.",
        "parameters": [
          {
            "name": "loanId",
            "type": "Long"
          }
        ],
        "returnType": "Collection<ChargeData>",
        "codeSmells": []
      }
    ]
  ],
  "integrationPoints": []`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_TAIL_END_TRUNCATED_PROPERTIES);
      expect(result.content).toContain('"publicMethods": [');
      expect(result.content).not.toContain('alues":');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.some((d) => d.includes("alues") && d.includes("publicMethods"))).toBe(true);
    });

    it("should handle multiple occurrences", () => {
      const input = `    },
alues": [
      {"name": "method1"}
    ],
    "other": "value",
    nstants": [
      {"name": "CONST1"}
    ]
  }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"publicMethods":\s*\[/);
      expect(result.content).toMatch(/"publicConstants":\s*\[/);
    });

    it("should handle externalReferences truncations", () => {
      const input = `    },
alReferences": [
      "org.apache.fineract.something"
    ]
  }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      // alReferences maps to externalReferences (more common)
      expect(result.content).toContain('"externalReferences": [');
      expect(result.content).toMatch(/"externalReferences":\s*\[/);
    });

    it("should handle internalReferences truncations with more specific tail-end", () => {
      const input = `    },
ernalReferences": [
      "org.apache.fineract.something"
    ]
  }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      // ernalReferences is more specific and maps to internalReferences
      expect(result.content).toContain('"internalReferences": [');
      expect(result.content).toMatch(/"internalReferences":\s*\[/);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixTailEndTruncatedProperties("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON";
      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify if pattern doesn't match", () => {
      const input = `    {
      "name": "value",
      "type": "String"
    }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify properties that already have opening quotes", () => {
      const input = `    {
      "publicMethods": [
        {"name": "test"}
      ]
    }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("nested contexts", () => {
    it("should fix truncations in nested objects", () => {
      const input = `    {
      "outer": {
        "inner": {
          alues": [
            {"name": "test"}
          ]
        }
      }
    }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": [');
    });

    it("should handle truncations after closing braces", () => {
      const input = `      }
    },
alues": [
      {"name": "test"}
    ]
  }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": [');
    });

    it("should handle truncations after closing brackets", () => {
      const input = `      ]
    },
alues": [
      {"name": "test"}
    ]
  }`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": [');
    });
  });

  describe("diagnostics", () => {
    it("should provide diagnostic messages when fixes are made", () => {
      const input = `    },
alues": [
      {"name": "test"}
    ]
  }`;

      const result = fixTailEndTruncatedProperties(input);

      if (result.changed) {
        expect(result.diagnostics).toBeDefined();
        expect(result.diagnostics?.length).toBeGreaterThan(0);
        expect(result.diagnostics?.[0]).toContain("alues");
        expect(result.diagnostics?.[0]).toContain("publicMethods");
      }
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      // Test with potentially problematic input
      const input = `    },
alues": [`;

      const result = fixTailEndTruncatedProperties(input);

      // Should not throw, should return a result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("property name mappings", () => {
    it("should handle various truncation patterns", () => {
      const testCases = [
        { input: 'alues":', expected: '"publicMethods":' },
        { input: 'nstants":', expected: '"publicConstants":' },
        { input: 'egrationPoints":', expected: '"integrationPoints":' },
        { input: 'alReferences":', expected: '"externalReferences":' }, // alReferences maps to externalReferences
        { input: 'ameters":', expected: '"parameters":' },
      ];

      for (const testCase of testCases) {
        const input = `    },
${testCase.input} [
      {"name": "test"}
    ]`;

        const result = fixTailEndTruncatedProperties(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(testCase.expected);
      }
    });
  });

  describe("context validation", () => {
    it("should not fix if inside a string value", () => {
      const input = `    {
      "description": "This contains alues": which should not be fixed"
    }`;

      const result = fixTailEndTruncatedProperties(input);

      // Should not modify content inside string values
      expect(result.changed).toBe(false);
    });

    it("should fix only at property boundaries", () => {
      const input = `    },
alues": [
      {"name": "test"}
    ]`;

      const result = fixTailEndTruncatedProperties(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": [');
    });
  });
});

import { fixUnquotedPropertyTypos } from "../../../../src/llm/json-processing/sanitizers/fix-unquoted-property-typos";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("fixUnquotedPropertyTypos", () => {
  describe("basic functionality", () => {
    it("should fix the exact error pattern from the log file (extraReferences -> externalReferences)", () => {
      const input = `  ],
extraReferences": [
    "org.springframework.jdbc.core.JdbcTemplate",
    "org.springframework.jdbc.core.RowMapper"
  ],
  "publicConstants": []`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_UNQUOTED_PROPERTY_TYPOS);
      expect(result.content).toContain('"externalReferences": [');
      expect(result.content).not.toContain('extraReferences":');
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should fix internReferences typo", () => {
      const input = `    },
internReferences": [
      "org.apache.fineract.something"
    ]
  }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"internalReferences": [');
      expect(result.content).not.toContain('internReferences":');
    });

    it("should fix publMethods typo", () => {
      const input = `    },
publMethods": [
      {
        "name": "test"
      }
    ]
  }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"publicMethods": [');
      expect(result.content).not.toContain('publMethods":');
    });

    it("should not modify valid JSON", () => {
      const input = `    {
      "externalReferences": [
        "org.springframework.something"
      ]
    }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify unquoted properties that are not typos", () => {
      const input = `    },
someOtherProperty": [
      "value"
    ]
  }`;

      const result = fixUnquotedPropertyTypos(input);

      // Should not change if it's not a known typo
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("real-world scenarios", () => {
    it("should handle the exact pattern from the error log with full context", () => {
      const input = `    "org.apache.fineract.portfolio.account.service.StandingInstructionHistoryReadPlatformService"
  ],
extraReferences": [
    "org.springframework.jdbc.core.JdbcTemplate",
    "org.springframework.jdbc.core.RowMapper"
  ],
  "publicConstants": [],
  "publicMethods": [
    {
      "name": "retrieveAll"
    }
  ]
}`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences": [');
      expect(result.content).not.toContain('extraReferences":');

      // Verify the JSON structure is now valid (at least for this section)
      expect(result.content).toMatch(/"externalReferences":\s*\[/);
      expect(result.content).toMatch(/"publicConstants":\s*\[/);
    });

    it("should handle multiple occurrences", () => {
      const input = `    },
extraReferences": [
      "value1"
    ],
    "other": "value",
    internReferences": [
      "value2"
    ]
  }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toMatch(/"externalReferences":\s*\[/);
      expect(result.content).toMatch(/"internalReferences":\s*\[/);
    });

    it("should handle various typo patterns", () => {
      const testCases = [
        { input: 'extraReferences":', expected: '"externalReferences":' },
        { input: 'internReferences":', expected: '"internalReferences":' },
        { input: 'publMethods":', expected: '"publicMethods":' },
        { input: 'publConstants":', expected: '"publicConstants":' },
      ];

      for (const testCase of testCases) {
        const input = `    },
${testCase.input} [
      {"name": "test"}
    ]`;

        const result = fixUnquotedPropertyTypos(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain(testCase.expected);
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = fixUnquotedPropertyTypos("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle non-JSON strings", () => {
      const input = "This is not JSON";
      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify if pattern doesn't match", () => {
      const input = `    {
      "name": "value",
      "type": "String"
    }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should not modify properties that already have opening quotes", () => {
      const input = `    {
      "extraReferences": [
        {"name": "test"}
      ]
    }`;

      const result = fixUnquotedPropertyTypos(input);

      // Should not change already-quoted properties (even if they're typos)
      // That's handled by fixPropertyNameTypos
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("nested contexts", () => {
    it("should fix typos in nested objects", () => {
      const input = `    {
      "outer": {
        "inner": {
          extraReferences": [
            {"name": "test"}
          ]
        }
      }
    }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences": [');
    });

    it("should handle typos after closing braces", () => {
      const input = `      }
    },
extraReferences": [
      {"name": "test"}
    ]
  }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences": [');
    });

    it("should handle typos after closing brackets", () => {
      const input = `      ]
    },
extraReferences": [
      {"name": "test"}
    ]
  }`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences": [');
    });
  });

  describe("diagnostics", () => {
    it("should provide diagnostic messages when fixes are made", () => {
      const input = `    },
extraReferences": [
      {"name": "test"}
    ]
  }`;

      const result = fixUnquotedPropertyTypos(input);

      if (result.changed) {
        expect(result.diagnostics).toBeDefined();
        expect(result.diagnostics?.length).toBeGreaterThan(0);
        expect(result.diagnostics?.[0]).toContain("extraReferences");
        expect(result.diagnostics?.[0]).toContain("externalReferences");
      }
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      // Test with potentially problematic input
      const input = `    },
extraReferences": [`;

      const result = fixUnquotedPropertyTypos(input);

      // Should not throw, should return a result
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe("context validation", () => {
    it("should not fix if inside a string value", () => {
      const input = `    {
      "description": "This contains extraReferences": which should not be fixed"
    }`;

      const result = fixUnquotedPropertyTypos(input);

      // Should not modify content inside string values
      expect(result.changed).toBe(false);
    });

    it("should fix only at property boundaries", () => {
      const input = `    },
extraReferences": [
      {"name": "test"}
    ]`;

      const result = fixUnquotedPropertyTypos(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"externalReferences": [');
    });
  });

  describe("whitespace handling", () => {
    it("should handle various whitespace patterns", () => {
      const inputs = [
        `    },
extraReferences": [`,
        `    },
    extraReferences": [`,
        `    },
  extraReferences": [`,
      ];

      for (const input of inputs) {
        const result = fixUnquotedPropertyTypos(input);

        expect(result.changed).toBe(true);
        expect(result.content).toMatch(/"externalReferences":\s*\[/);
      }
    });
  });
});

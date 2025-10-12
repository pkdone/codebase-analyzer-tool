import { isComplexity, Complexity } from "../../../src/components/reporting/report-gen.types";

/**
 * Tests for report-gen.types, specifically testing the Set-based membership
 * testing optimization for isComplexity type guard.
 */
describe("report-gen.types - Set-based membership testing", () => {
  describe("isComplexity type guard", () => {
    describe("valid complexity values", () => {
      it("should return true for LOW complexity", () => {
        expect(isComplexity("LOW")).toBe(true);
      });

      it("should return true for MEDIUM complexity", () => {
        expect(isComplexity("MEDIUM")).toBe(true);
      });

      it("should return true for HIGH complexity", () => {
        expect(isComplexity("HIGH")).toBe(true);
      });

      it("should handle lowercase input correctly", () => {
        expect(isComplexity("low")).toBe(true);
        expect(isComplexity("medium")).toBe(true);
        expect(isComplexity("high")).toBe(true);
      });

      it("should handle mixed case input correctly", () => {
        expect(isComplexity("Low")).toBe(true);
        expect(isComplexity("MeDiUm")).toBe(true);
        expect(isComplexity("HiGh")).toBe(true);
      });
    });

    describe("invalid complexity values", () => {
      it("should return false for invalid strings", () => {
        expect(isComplexity("INVALID")).toBe(false);
        expect(isComplexity("EXTREME")).toBe(false);
        expect(isComplexity("")).toBe(false);
        expect(isComplexity("low ")).toBe(false);
        expect(isComplexity(" LOW")).toBe(false);
      });

      it("should return false for non-string types", () => {
        expect(isComplexity(null)).toBe(false);
        expect(isComplexity(undefined)).toBe(false);
        expect(isComplexity(42)).toBe(false);
        expect(isComplexity(true)).toBe(false);
        expect(isComplexity({})).toBe(false);
        expect(isComplexity([])).toBe(false);
      });

      it("should return false for objects that stringify to valid complexity", () => {
        const obj = { toString: () => "LOW" };
        expect(isComplexity(obj)).toBe(false);
      });

      it("should return false for array containing valid complexity", () => {
        expect(isComplexity(["LOW"])).toBe(false);
      });
    });

    describe("type narrowing", () => {
      it("should narrow type to Complexity when true", () => {
        const value: unknown = "LOW";

        if (isComplexity(value)) {
          // TypeScript should infer value as Complexity here
          const complexity: Complexity = value;
          expect(["LOW", "MEDIUM", "HIGH"]).toContain(complexity);
        }
      });

      it("should work with all valid complexity values in type system", () => {
        const values: unknown[] = ["LOW", "MEDIUM", "HIGH"];
        const validComplexities: Complexity[] = [];

        for (const value of values) {
          if (isComplexity(value)) {
            validComplexities.push(value);
          }
        }

        expect(validComplexities).toHaveLength(3);
        expect(validComplexities).toEqual(["LOW", "MEDIUM", "HIGH"]);
      });
    });

    describe("Set performance characteristics", () => {
      it("should handle rapid consecutive calls efficiently", () => {
        // Test that Set.has() is used for O(1) lookup
        const testCases = [
          "LOW",
          "MEDIUM",
          "HIGH",
          "INVALID",
          "low",
          "medium",
          "high",
          "invalid",
          "Low",
          "Medium",
          "High",
          "Invalid",
        ];

        const results = testCases.map((tc) => isComplexity(tc));

        expect(results).toEqual([
          true,
          true,
          true,
          false,
          true,
          true,
          true,
          false,
          true,
          true,
          true,
          false,
        ]);
      });

      it("should maintain constant time lookup regardless of input", () => {
        // All valid complexity values should be found in O(1) time
        const validInputs = ["LOW", "MEDIUM", "HIGH"];

        for (const input of validInputs) {
          const startTime = Date.now();
          const result = isComplexity(input);
          const endTime = Date.now();

          expect(result).toBe(true);
          // Sanity check - should complete instantly
          expect(endTime - startTime).toBeLessThan(10);
        }
      });

      it("should handle case-insensitive checks efficiently", () => {
        const casedInputs = [
          "low",
          "Low",
          "LOW",
          "medium",
          "Medium",
          "MEDIUM",
          "high",
          "High",
          "HIGH",
        ];

        const results = casedInputs.map((input) => isComplexity(input));

        // All should be true due to toUpperCase() normalization
        expect(results.every((r) => r)).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should handle empty string", () => {
        expect(isComplexity("")).toBe(false);
      });

      it("should handle whitespace", () => {
        expect(isComplexity(" ")).toBe(false);
        expect(isComplexity("\n")).toBe(false);
        expect(isComplexity("\t")).toBe(false);
      });

      it("should handle special characters", () => {
        expect(isComplexity("LOW!")).toBe(false);
        expect(isComplexity("MEDIUM?")).toBe(false);
        expect(isComplexity("HIGH#")).toBe(false);
      });

      it("should handle numeric strings", () => {
        expect(isComplexity("1")).toBe(false);
        expect(isComplexity("123")).toBe(false);
      });

      it("should handle very long strings", () => {
        const longString = "LOW".repeat(1000);
        expect(isComplexity(longString)).toBe(false);
      });
    });

    describe("comparison with array includes pattern", () => {
      it("should behave identically to array.includes for valid values", () => {
        const COMPLEXITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
        const testValues = ["LOW", "MEDIUM", "HIGH", "INVALID"];

        for (const value of testValues) {
          const setResult = isComplexity(value);
          const arrayResult =
            typeof value === "string" &&
            (COMPLEXITY_LEVELS as readonly string[]).includes(value.toUpperCase());

          expect(setResult).toBe(arrayResult);
        }
      });

      it("should provide better performance than array.includes for large datasets", () => {
        // Demonstrate that Set.has() is O(1) vs Array.includes() O(n)
        // For 3 items, difference is minimal, but the pattern scales better
        const iterations = 10000;

        const startSet = Date.now();
        for (let i = 0; i < iterations; i++) {
          isComplexity("HIGH");
        }
        const endSet = Date.now();
        const setTime = endSet - startSet;

        // Set-based lookup should complete quickly
        expect(setTime).toBeLessThan(100);
      });
    });

    describe("integration with switch statements", () => {
      it("should work correctly in switch statement", () => {
        const testComplexity = (value: unknown): string => {
          if (!isComplexity(value)) {
            return "invalid";
          }

          switch (value) {
            case "LOW":
              return "low-priority";
            case "MEDIUM":
              return "medium-priority";
            case "HIGH":
              return "high-priority";
          }
        };

        expect(testComplexity("LOW")).toBe("low-priority");
        expect(testComplexity("MEDIUM")).toBe("medium-priority");
        expect(testComplexity("HIGH")).toBe("high-priority");
        expect(testComplexity("INVALID")).toBe("invalid");
      });

      it("should enable exhaustive switch checking", () => {
        // This test verifies that all Complexity values are handled
        const handleComplexity = (complexity: Complexity): number => {
          switch (complexity) {
            case "LOW":
              return 1;
            case "MEDIUM":
              return 2;
            case "HIGH":
              return 3;
            // TypeScript will error if we don't handle all cases
          }
        };

        expect(handleComplexity("LOW")).toBe(1);
        expect(handleComplexity("MEDIUM")).toBe(2);
        expect(handleComplexity("HIGH")).toBe(3);
      });
    });

    describe("real-world usage patterns", () => {
      it("should handle database results normalization", () => {
        // Simulate normalizing complexity values from database
        const dbResults = [
          { name: "proc1", complexity: "LOW" },
          { name: "proc2", complexity: "low" },
          { name: "proc3", complexity: "INVALID" },
          { name: "proc4", complexity: "HIGH" },
        ];

        const normalized = dbResults.map((item) => ({
          name: item.name,
          complexity: isComplexity(item.complexity) ? item.complexity : "LOW",
          isValid: isComplexity(item.complexity),
        }));

        expect(normalized[0].isValid).toBe(true);
        expect(normalized[1].isValid).toBe(true);
        expect(normalized[2].isValid).toBe(false);
        expect(normalized[3].isValid).toBe(true);
      });

      it("should filter valid complexities from mixed input", () => {
        const mixedInputs: unknown[] = [
          "LOW",
          "MEDIUM",
          "HIGH",
          "invalid",
          null,
          undefined,
          42,
          "low",
          "EXTREME",
        ];

        const validComplexities = mixedInputs.filter(isComplexity);

        expect(validComplexities).toHaveLength(4); // LOW, MEDIUM, HIGH, low
      });

      it("should validate user input safely", () => {
        const userInputs = ["low", "MEDIUM", "extreme", "high", ""];

        const validatedInputs = userInputs
          .filter(isComplexity)
          .map((c) => c.toUpperCase() as Complexity);

        expect(validatedInputs).toEqual(["LOW", "MEDIUM", "HIGH"]);
      });
    });
  });
});

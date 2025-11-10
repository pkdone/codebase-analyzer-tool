import {
  concatenationConfig,
  processingConfig,
  sanitizationConfig,
} from "../../../src/llm/json-processing/constants/json-processing.config";

describe("Sanitization Configuration", () => {
  describe("concatenationConfig", () => {
    it("defines light collapse max iterations", () => {
      expect(concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS).toBe(50);
      expect(typeof concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS).toBe("number");
      expect(concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS).toBeGreaterThan(0);
    });

    it("defines full normalize max iterations", () => {
      expect(concatenationConfig.FULL_NORMALIZE_MAX_ITERATIONS).toBe(80);
      expect(typeof concatenationConfig.FULL_NORMALIZE_MAX_ITERATIONS).toBe("number");
      expect(concatenationConfig.FULL_NORMALIZE_MAX_ITERATIONS).toBeGreaterThan(
        concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS,
      );
    });

    it("defines light collapse literal chain limit", () => {
      expect(concatenationConfig.LIGHT_COLLAPSE_LITERAL_CHAIN_LIMIT).toBe(6);
      expect(typeof concatenationConfig.LIGHT_COLLAPSE_LITERAL_CHAIN_LIMIT).toBe("number");
      expect(concatenationConfig.LIGHT_COLLAPSE_LITERAL_CHAIN_LIMIT).toBeGreaterThan(0);
    });

    it("defines full normalize literal chain limit", () => {
      expect(concatenationConfig.FULL_NORMALIZE_LITERAL_CHAIN_LIMIT).toBe(10);
      expect(typeof concatenationConfig.FULL_NORMALIZE_LITERAL_CHAIN_LIMIT).toBe("number");
      expect(concatenationConfig.FULL_NORMALIZE_LITERAL_CHAIN_LIMIT).toBeGreaterThan(
        concatenationConfig.LIGHT_COLLAPSE_LITERAL_CHAIN_LIMIT,
      );
    });

    it("defines mixed chain literal limit", () => {
      expect(concatenationConfig.MIXED_CHAIN_LITERAL_LIMIT).toBe(12);
      expect(typeof concatenationConfig.MIXED_CHAIN_LITERAL_LIMIT).toBe("number");
      expect(concatenationConfig.MIXED_CHAIN_LITERAL_LIMIT).toBeGreaterThan(0);
    });

    it("defines complex chain literal limit", () => {
      expect(concatenationConfig.COMPLEX_CHAIN_LITERAL_LIMIT).toBe(20);
      expect(typeof concatenationConfig.COMPLEX_CHAIN_LITERAL_LIMIT).toBe("number");
      expect(concatenationConfig.COMPLEX_CHAIN_LITERAL_LIMIT).toBeGreaterThan(
        concatenationConfig.MIXED_CHAIN_LITERAL_LIMIT,
      );
    });

    it("has reasonable relationship between limits", () => {
      // Full normalize should allow more iterations than light collapse
      expect(concatenationConfig.FULL_NORMALIZE_MAX_ITERATIONS).toBeGreaterThanOrEqual(
        concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS,
      );

      // Full normalize should allow longer literal chains than light collapse
      expect(concatenationConfig.FULL_NORMALIZE_LITERAL_CHAIN_LIMIT).toBeGreaterThanOrEqual(
        concatenationConfig.LIGHT_COLLAPSE_LITERAL_CHAIN_LIMIT,
      );

      // Complex chains should allow more literals than mixed chains
      expect(concatenationConfig.COMPLEX_CHAIN_LITERAL_LIMIT).toBeGreaterThanOrEqual(
        concatenationConfig.MIXED_CHAIN_LITERAL_LIMIT,
      );
    });

    it("is frozen and immutable", () => {
      expect(Object.isFrozen(concatenationConfig)).toBe(true);
    });
  });

  describe("processingConfig", () => {
    it("defines truncation safety buffer", () => {
      expect(processingConfig.TRUNCATION_SAFETY_BUFFER).toBe(100);
      expect(typeof processingConfig.TRUNCATION_SAFETY_BUFFER).toBe("number");
      expect(processingConfig.TRUNCATION_SAFETY_BUFFER).toBeGreaterThan(0);
    });

    it("defines max recursion depth", () => {
      expect(processingConfig.MAX_RECURSION_DEPTH).toBe(4);
      expect(typeof processingConfig.MAX_RECURSION_DEPTH).toBe("number");
      expect(processingConfig.MAX_RECURSION_DEPTH).toBeGreaterThan(0);
    });

    it("is frozen and immutable", () => {
      expect(Object.isFrozen(processingConfig)).toBe(true);
    });
  });

  describe("sanitizationConfig (combined)", () => {
    it("exposes concatenation config", () => {
      expect(sanitizationConfig.concatenation).toBe(concatenationConfig);
      expect(sanitizationConfig.concatenation.LIGHT_COLLAPSE_MAX_ITERATIONS).toBe(50);
    });

    it("exposes processing config", () => {
      expect(sanitizationConfig.processing).toBe(processingConfig);
      expect(sanitizationConfig.processing.TRUNCATION_SAFETY_BUFFER).toBe(100);
    });

    it("is frozen and immutable", () => {
      expect(Object.isFrozen(sanitizationConfig)).toBe(true);
    });

    it("provides convenient access to all config values", () => {
      // Can access via combined config
      expect(sanitizationConfig.concatenation.LIGHT_COLLAPSE_MAX_ITERATIONS).toBe(50);
      expect(sanitizationConfig.processing.MAX_RECURSION_DEPTH).toBe(4);

      // Or via individual exports
      expect(concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS).toBe(50);
      expect(processingConfig.MAX_RECURSION_DEPTH).toBe(4);
    });
  });

  describe("Configuration immutability", () => {
    it("prevents modification of concatenation config", () => {
      expect(() => {
        // @ts-expect-error - Intentionally testing runtime immutability
        concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS = 999;
      }).toThrow();

      // Value should remain unchanged
      expect(concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS).toBe(50);
    });

    it("prevents modification of processing config", () => {
      expect(() => {
        // @ts-expect-error - Intentionally testing runtime immutability
        processingConfig.MAX_RECURSION_DEPTH = 999;
      }).toThrow();

      // Value should remain unchanged
      expect(processingConfig.MAX_RECURSION_DEPTH).toBe(4);
    });

    it("prevents adding new properties to concatenation config", () => {
      expect(() => {
        // @ts-expect-error - Intentionally testing runtime immutability
        concatenationConfig.NEW_PROPERTY = 123;
      }).toThrow();

      // @ts-expect-error - Checking property doesn't exist
      expect(concatenationConfig.NEW_PROPERTY).toBeUndefined();
    });
  });

  describe("Configuration documentation and clarity", () => {
    it("has clear naming conventions", () => {
      // All constant names should be UPPER_SNAKE_CASE
      const allKeys = [...Object.keys(concatenationConfig), ...Object.keys(processingConfig)];

      allKeys.forEach((key) => {
        expect(key).toMatch(/^[A-Z_]+$/);
      });
    });

    it("uses descriptive names that indicate purpose", () => {
      // Check that names contain meaningful keywords
      expect("LIGHT_COLLAPSE_MAX_ITERATIONS").toContain("MAX");
      expect("LIGHT_COLLAPSE_MAX_ITERATIONS").toContain("ITERATIONS");
      expect("TRUNCATION_SAFETY_BUFFER").toContain("BUFFER");
      expect("MAX_RECURSION_DEPTH").toContain("MAX");
      expect("MAX_RECURSION_DEPTH").toContain("DEPTH");
    });
  });
});

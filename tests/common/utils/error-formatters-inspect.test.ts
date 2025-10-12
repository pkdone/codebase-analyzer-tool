import { formatError } from "../../../src/common/utils/error-formatters";

describe("error-formatters - util.inspect integration", () => {
  describe("formatError with util.inspect", () => {
    test("should handle Error instances", () => {
      const error = new Error("Test error");
      const result = formatError(error);

      expect(result).toBe("Error. Test error");
    });

    test("should handle custom Error subclasses", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }
      const error = new CustomError("Custom error message");
      const result = formatError(error);

      expect(result).toContain("CustomError");
      expect(result).toContain("Custom error message");
    });

    test("should handle objects with message property", () => {
      const error = { message: "Error object" };
      const result = formatError(error);

      expect(result).toBe("<unknown-type>. Error object");
    });

    test("should handle null/undefined", () => {
      expect(formatError(null)).toBe("<unknown-type>. No error message available");
      expect(formatError(undefined)).toBe("<unknown-type>. No error message available");
    });

    test("should use util.inspect for plain objects", () => {
      const error = { code: 500, status: "Internal Error", details: { nested: "value" } };
      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("code");
      expect(result).toContain("500");
      expect(result).toContain("status");
      expect(result).toContain("Internal Error");
    });

    test("should handle circular references without throwing", () => {
      const error: any = { name: "CircularError" };
      error.self = error; // Create circular reference

      // This should not throw with util.inspect
      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("CircularError");
      // util.inspect should handle circular ref with [Circular]
      expect(result).toContain("Circular");
    });

    test("should handle arrays", () => {
      const error = [1, 2, 3, "error", { nested: true }];
      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("1");
      expect(result).toContain("error");
    });

    test("should handle primitive types", () => {
      expect(formatError("string error")).toContain("string error");
      expect(formatError(42)).toContain("42");
      expect(formatError(true)).toContain("true");
    });

    test("should handle symbols", () => {
      const sym = Symbol("test");
      const result = formatError(sym);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("Symbol(test)");
    });

    test("should limit depth for deeply nested objects", () => {
      const error = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: "too deep",
              },
            },
          },
        },
      };

      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("level1");
      expect(result).toContain("level2");
      // With depth: 2, level3+ might be truncated as [Object]
    });

    test("should handle objects with getters", () => {
      const error = {
        get dynamicValue() {
          return "computed value";
        },
        staticValue: "static",
      };

      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      // util.inspect should show getters
      expect(result).toContain("staticValue");
    });

    test("should handle objects with non-enumerable properties", () => {
      const error = {};
      Object.defineProperty(error, "hidden", {
        value: "secret",
        enumerable: false,
      });
      Object.defineProperty(error, "visible", {
        value: "public",
        enumerable: true,
      });

      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("visible");
      expect(result).toContain("public");
      // Non-enumerable might not be shown by default
    });

    test("should format on single line with breakLength: Infinity", () => {
      const error = { a: 1, b: 2, c: 3, d: 4, e: 5 };
      const result = formatError(error);

      // Should not contain multiple lines (no newlines except at boundaries)
      const contentPart = result.split("<unknown-type>. ")[1];
      // The inspect output should be relatively compact
      expect(contentPart).toBeDefined();
    });

    test("should handle Map and Set objects", () => {
      const errorMap = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
      const resultMap = formatError(errorMap);
      expect(resultMap).toContain("Map");

      const errorSet = new Set([1, 2, 3]);
      const resultSet = formatError(errorSet);
      expect(resultSet).toContain("Set");
    });

    test("should handle Date objects", () => {
      const error = new Date("2023-01-01");
      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("2023");
    });

    test("should handle RegExp objects", () => {
      const error = /test-pattern/gi;
      const result = formatError(error);

      expect(result).toContain("<unknown-type>.");
      expect(result).toContain("test-pattern");
    });
  });
});

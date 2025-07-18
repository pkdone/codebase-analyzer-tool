import { getErrorText, getErrorStack } from "../../../src/common/utils/error-utils";

describe("Error utilities", () => {
  describe("getErrorText", () => {
    // Test data for getErrorText function
    const errorTextTestData = [
      {
        input: new Error("Test error"),
        expected: "Error. Test error",
        description: "Error object",
      },
      {
        input: { message: "Custom error" },
        expected: "<unknown-type>. Custom error",
        description: "object containing message",
      },
      {
        input: "string error",
        expected: '<unknown-type>. "string error"',
        description: "primitive value",
      },
      {
        input: null,
        expected: "<unknown-type>. No error message available",
        description: "null value",
      },
    ];

    test.each(errorTextTestData)("with $description", ({ input, expected }) => {
      expect(getErrorText(input)).toBe(expected);
    });

    test("with circular reference object", () => {
      // Create an object with circular reference
      const circularObj: Record<string, unknown> = { name: "test" };
      circularObj.self = circularObj;

      const result = getErrorText(circularObj);
      expect(result).toBe("<unknown-type>. (Unserializable object)");
    });
  });

  describe("getErrorStack", () => {
    test("with Error object", () => {
      const error = new Error("Test error");
      const stack = getErrorStack(error);
      expect(stack).toContain("Error: Test error");
    });

    test("with non-Error object", () => {
      const stack = getErrorStack("not an error");
      expect(stack).toBe("No stack trace available for the provided non-Error object.");
    });
  });
});

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { withSanitizerErrorHandling } from "../../../../../src/common/llm/json-processing/sanitizers/with-sanitizer-error-handling";
import type {
  Sanitizer,
  SanitizerResult,
} from "../../../../../src/common/llm/json-processing/sanitizers/sanitizers-types";
import * as logging from "../../../../../src/common/utils/logging";

// Mock the logging module
jest.mock("../../../../../src/common/utils/logging", () => ({
  logWarn: jest.fn(),
}));

const mockLogWarn = logging.logWarn as jest.MockedFunction<typeof logging.logWarn>;

describe("withSanitizerErrorHandling", () => {
  beforeEach(() => {
    mockLogWarn.mockClear();
  });

  it("should pass through successful sanitizer results unchanged", () => {
    const expectedResult: SanitizerResult = {
      content: "sanitized content",
      changed: true,
      description: "Test description",
      repairs: ["Repair 1", "Repair 2"],
    };

    const innerSanitizer: Sanitizer = () => expectedResult;
    const wrappedSanitizer = withSanitizerErrorHandling("testSanitizer", innerSanitizer);

    const result = wrappedSanitizer("input content");

    expect(result).toEqual(expectedResult);
  });

  it("should pass input and config to the wrapped sanitizer", () => {
    const mockSanitizer = jest.fn<Sanitizer>().mockReturnValue({
      content: "output",
      changed: false,
    });

    const config = { knownProperties: ["name"] };
    const wrappedSanitizer = withSanitizerErrorHandling("testSanitizer", mockSanitizer);

    wrappedSanitizer("test input", config);

    expect(mockSanitizer).toHaveBeenCalledWith("test input", config);
  });

  it("should catch errors and return safe failure result", () => {
    const throwingSanitizer: Sanitizer = () => {
      throw new Error("Test error message");
    };

    const wrappedSanitizer = withSanitizerErrorHandling("testSanitizer", throwingSanitizer);

    const result = wrappedSanitizer("original input");

    expect(result).toEqual({
      content: "original input",
      changed: false,
      description: undefined,
      repairs: ["Sanitizer failed: Error: Test error message"],
    });
  });

  it("should preserve original input when error occurs", () => {
    const complexInput = '{"name": "test", "value": 123}';
    const throwingSanitizer: Sanitizer = () => {
      throw new Error("Parsing failed");
    };

    const wrappedSanitizer = withSanitizerErrorHandling("jsonSanitizer", throwingSanitizer);

    const result = wrappedSanitizer(complexInput);

    expect(result.content).toBe(complexInput);
  });

  it("should handle non-Error objects being thrown", () => {
    const throwingSanitizer: Sanitizer = () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- Testing non-Error throw handling
      throw "string error";
    };

    const wrappedSanitizer = withSanitizerErrorHandling("stringSanitizer", throwingSanitizer);

    const result = wrappedSanitizer("input");

    expect(result.repairs).toEqual(["Sanitizer failed: string error"]);
  });

  it("should handle null/undefined throws", () => {
    const throwsNull: Sanitizer = () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- Testing null throw handling
      throw null;
    };
    const throwsUndefined: Sanitizer = () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw undefined;
    };

    const wrappedNull = withSanitizerErrorHandling("nullThrower", throwsNull);
    const wrappedUndefined = withSanitizerErrorHandling("undefinedThrower", throwsUndefined);

    expect(wrappedNull("input").repairs).toEqual(["Sanitizer failed: null"]);
    expect(wrappedUndefined("input").repairs).toEqual(["Sanitizer failed: undefined"]);
  });

  it("should return changed: false when error occurs", () => {
    const throwingSanitizer: Sanitizer = () => {
      throw new Error("Some error");
    };

    const wrappedSanitizer = withSanitizerErrorHandling("testSanitizer", throwingSanitizer);

    const result = wrappedSanitizer("input");

    expect(result.changed).toBe(false);
  });

  it("should return description: undefined when error occurs", () => {
    const throwingSanitizer: Sanitizer = () => {
      throw new Error("Some error");
    };

    const wrappedSanitizer = withSanitizerErrorHandling("testSanitizer", throwingSanitizer);

    const result = wrappedSanitizer("input");

    expect(result.description).toBeUndefined();
  });

  it("should work with sanitizers that return unchanged content", () => {
    const noopSanitizer: Sanitizer = (input) => ({
      content: input,
      changed: false,
    });

    const wrappedSanitizer = withSanitizerErrorHandling("noopSanitizer", noopSanitizer);

    const result = wrappedSanitizer("unchanged content");

    expect(result).toEqual({
      content: "unchanged content",
      changed: false,
    });
  });

  it("should include sanitizer name in logged warning", () => {
    const throwingSanitizer: Sanitizer = () => {
      throw new Error("Test error");
    };

    const wrappedSanitizer = withSanitizerErrorHandling("myCustomSanitizer", throwingSanitizer);
    wrappedSanitizer("input");

    expect(mockLogWarn).toHaveBeenCalledWith(
      "myCustomSanitizer sanitizer failed: Error: Test error",
    );
  });
});

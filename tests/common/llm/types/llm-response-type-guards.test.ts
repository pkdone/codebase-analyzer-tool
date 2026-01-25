import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import {
  LLMResponseStatus,
  LLMFunctionResponse,
  LLMCompletedResponse,
  LLMErroredResponse,
  LLMStatusResponse,
  isCompletedResponse,
  isErrorResponse,
  isOverloadedResponse,
} from "../../../../src/common/llm/types/llm-response.types";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";

/**
 * Tests for LLMFunctionResponse discriminated union type guards.
 * These tests verify that type guards correctly narrow the discriminated union
 * and provide compile-time type safety.
 */
describe("LLMFunctionResponse Type Guards", () => {
  // Helper to create base response fields
  const createBaseResponse = () => ({
    request: "test prompt",
    modelKey: "test-model",
    context: { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
  });

  describe("isCompletedResponse", () => {
    test("returns true for COMPLETED status with generated content", () => {
      const response: LLMFunctionResponse<string> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: "test result",
      };

      expect(isCompletedResponse(response)).toBe(true);
    });

    test("returns true for COMPLETED status with object content", () => {
      const response: LLMFunctionResponse<{ key: string }> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: { key: "value" },
      };

      expect(isCompletedResponse(response)).toBe(true);
    });

    test("returns true for COMPLETED status with null content", () => {
      const response: LLMFunctionResponse<null> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: null,
      };

      expect(isCompletedResponse(response)).toBe(true);
    });

    test("returns true for COMPLETED status with repairs", () => {
      const response: LLMFunctionResponse<string> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: "result",
        repairs: ["Fixed trailing comma"],
        pipelineSteps: ["JSON sanitization"],
      };

      expect(isCompletedResponse(response)).toBe(true);

      if (isCompletedResponse(response)) {
        // Type narrowing: TypeScript knows response has repairs
        expect(response.repairs).toContain("Fixed trailing comma");
        expect(response.pipelineSteps).toContain("JSON sanitization");
      }
    });

    test("returns false for ERRORED status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.ERRORED,
        error: new Error("test error"),
      };

      expect(isCompletedResponse(response)).toBe(false);
    });

    test("returns false for OVERLOADED status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.OVERLOADED,
      };

      expect(isCompletedResponse(response)).toBe(false);
    });
  });

  describe("isErrorResponse", () => {
    test("returns true for ERRORED status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.ERRORED,
        error: new Error("test error"),
      };

      expect(isErrorResponse(response)).toBe(true);
    });

    test("returns true for INVALID status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.INVALID,
        error: "JSON parse error",
      };

      expect(isErrorResponse(response)).toBe(true);
    });

    test("provides access to error field after narrowing", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.ERRORED,
        error: { code: "TEST_ERROR", message: "Something went wrong" },
      };

      if (isErrorResponse(response)) {
        // Type narrowing: TypeScript knows response.error exists
        expect(response.error).toBeDefined();
        expect((response.error as { code: string }).code).toBe("TEST_ERROR");
      }
    });

    test("returns false for COMPLETED status", () => {
      const response: LLMFunctionResponse<string> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: "result",
      };

      expect(isErrorResponse(response)).toBe(false);
    });

    test("returns false for OVERLOADED status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.OVERLOADED,
      };

      expect(isErrorResponse(response)).toBe(false);
    });
  });

  describe("isOverloadedResponse", () => {
    test("returns true for OVERLOADED status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.OVERLOADED,
      };

      expect(isOverloadedResponse(response)).toBe(true);
    });

    test("returns false for EXCEEDED status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.EXCEEDED,
      };

      expect(isOverloadedResponse(response)).toBe(false);
    });

    test("returns false for COMPLETED status", () => {
      const response: LLMFunctionResponse<string> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: "result",
      };

      expect(isOverloadedResponse(response)).toBe(false);
    });
  });

  describe("Discriminated Union Type Narrowing", () => {
    test("enables type-safe field access after status check", () => {
      const completedResponse: LLMFunctionResponse<{ result: number }> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: { result: 42 },
      };

      // After isCompletedResponse check, TypeScript knows generated exists
      if (isCompletedResponse(completedResponse)) {
        // This should compile without type errors
        const value = completedResponse.generated.result;
        expect(value).toBe(42);
      }
    });

    test("prevents access to non-existent fields", () => {
      const errorResponse: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.ERRORED,
        error: new Error("test"),
      };

      // After isErrorResponse check, TypeScript knows error exists
      if (isErrorResponse(errorResponse)) {
        expect(errorResponse.error).toBeDefined();
        // Note: 'generated' is not accessible on LLMErroredResponse
      }
    });

    test("works with conditional logic pattern", () => {
      const processResponse = (response: LLMFunctionResponse<string>): string => {
        if (isCompletedResponse(response)) {
          return `Success: ${response.generated}`;
        } else if (isErrorResponse(response)) {
          return `Error: ${String(response.error)}`;
        } else if (isOverloadedResponse(response)) {
          return `Overloaded: ${response.status}`;
        }
        return `Status: ${response.status}`;
      };

      const completed: LLMFunctionResponse<string> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: "test",
      };

      const errored: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.ERRORED,
        error: "fail",
      };

      const overloaded: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.OVERLOADED,
      };

      expect(processResponse(completed)).toBe("Success: test");
      expect(processResponse(errored as LLMFunctionResponse<string>)).toBe("Error: fail");
      expect(processResponse(overloaded as LLMFunctionResponse<string>)).toBe(
        "Overloaded: overloaded",
      );
    });
  });

  describe("Type Compatibility", () => {
    test("LLMCompletedResponse is assignable from response with COMPLETED status", () => {
      const response: LLMFunctionResponse<string> = {
        ...createBaseResponse(),
        status: LLMResponseStatus.COMPLETED,
        generated: "test",
      };

      if (isCompletedResponse(response)) {
        // TypeScript correctly narrows to LLMCompletedResponse
        const completed: LLMCompletedResponse<string> = response;
        expect(completed.generated).toBe("test");
      }
    });

    test("LLMErroredResponse is assignable from response with error status", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.ERRORED,
        error: new Error("test"),
      };

      if (isErrorResponse(response)) {
        // TypeScript correctly narrows to LLMErroredResponse
        const errored: LLMErroredResponse = response;
        expect(errored.error).toBeDefined();
      }
    });

    test("LLMStatusResponse is assignable from response with status-only response", () => {
      const response: LLMFunctionResponse = {
        ...createBaseResponse(),
        status: LLMResponseStatus.OVERLOADED,
      };

      if (isOverloadedResponse(response)) {
        // TypeScript correctly narrows to LLMStatusResponse with OVERLOADED status
        const status: LLMStatusResponse = response;
        expect(status.status).toBe(LLMResponseStatus.OVERLOADED);
      }
    });
  });
});

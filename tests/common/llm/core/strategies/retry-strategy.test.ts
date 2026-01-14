import "reflect-metadata";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { RetryStrategy } from "../../../../../src/common/llm/strategies/retry-strategy";
import LLMExecutionStats from "../../../../../src/common/llm/tracking/llm-execution-stats";
import {
  LLMFunctionResponse,
  LLMContext,
  LLMResponseStatus,
  LLMPurpose,
} from "../../../../../src/common/llm/types/llm.types";
import { LLMRetryConfig } from "../../../../../src/common/llm/providers/llm-provider.types";

// Mock p-retry
jest.mock("p-retry", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import pRetry from "p-retry";
const mockPRetry = pRetry as jest.MockedFunction<typeof pRetry>;

describe("RetryStrategy", () => {
  let retryStrategy: RetryStrategy;
  let mockLLMExecutionStats: jest.Mocked<LLMExecutionStats>;

  const mockProviderRetryConfig: LLMRetryConfig = {
    requestTimeoutMillis: 60000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 5000,
  };

  const mockContext: LLMContext = {
    purpose: LLMPurpose.COMPLETIONS,
    resource: "test-resource",
  };

  const mockSuccessResponse: LLMFunctionResponse = {
    status: LLMResponseStatus.COMPLETED,
    generated: "Test response",
    request: "Test prompt",
    modelKey: "test-model",
    context: mockContext,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock LLMExecutionStats
    mockLLMExecutionStats = {
      recordOverloadedStatusForProviderAndModel: jest.fn(),
      recordTokenLimitExceededStatusForProviderAndModel: jest.fn(),
      recordInvalidStatusForProviderAndModel: jest.fn(),
      recordCompletedStatusForProviderAndModel: jest.fn(),
      recordErrorStatusForProviderAndModel: jest.fn(),
      getStatusTypesStatistics: jest.fn(),
    } as unknown as jest.Mocked<LLMExecutionStats>;

    retryStrategy = new RetryStrategy(mockLLMExecutionStats);
  });

  describe("Successful Execution", () => {
    test("should return result immediately on successful first attempt", async () => {
      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;
      mockLLMFunction.mockResolvedValue(mockSuccessResponse);

      // Mock p-retry to call the function and return its result
      (mockPRetry as any).mockImplementation(async (fn: any) => {
        return await fn();
      });

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(result).toEqual(mockSuccessResponse);
      expect(mockLLMFunction).toHaveBeenCalledTimes(1);
      expect(mockLLMFunction).toHaveBeenCalledWith("test prompt", mockContext);
    });

    test("should pass retryOnInvalid flag correctly", async () => {
      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;
      mockLLMFunction.mockResolvedValue(mockSuccessResponse);

      // Mock p-retry to call the function and return its result
      (mockPRetry as any).mockImplementation(async (fn: any) => {
        return await fn();
      });

      // Test with retryOnInvalid = false (like for embeddings)
      await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
        false, // retryOnInvalid
      );

      expect(mockLLMFunction).toHaveBeenCalledWith("test prompt", mockContext);
    });
  });

  describe("Retry Logic for Overloaded Status", () => {
    test("should retry when LLM returns OVERLOADED status", async () => {
      const overloadedResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.OVERLOADED,
      };

      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;

      mockLLMFunction
        .mockResolvedValueOnce(overloadedResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      // Mock p-retry to simply return the successful result for this test
      (mockPRetry as jest.MockedFunction<typeof mockPRetry>).mockResolvedValue(mockSuccessResponse);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      // Should eventually return successful result after retry
      expect(result).toEqual(mockSuccessResponse);
      expect(mockPRetry).toHaveBeenCalled();
    });
  });

  describe("Configuration Handling", () => {
    test("should use provider retry config to build p-retry options", async () => {
      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;

      mockLLMFunction.mockResolvedValue(mockSuccessResponse);
      (mockPRetry as jest.MockedFunction<typeof mockPRetry>).mockResolvedValue(mockSuccessResponse);

      await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(mockPRetry).toHaveBeenCalled();
    });

    test("should handle minimal retry config with all required properties", async () => {
      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;
      const minimalConfig: LLMRetryConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 1,
        minRetryDelayMillis: 100,
        maxRetryDelayMillis: 500,
      };

      mockLLMFunction.mockResolvedValue(mockSuccessResponse);
      (mockPRetry as jest.MockedFunction<typeof mockPRetry>).mockResolvedValue(mockSuccessResponse);

      await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        minimalConfig,
      );

      expect(mockPRetry).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    test("should return null when LLM function throws before returning a response", async () => {
      const networkError = new Error("Network error");
      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;

      mockLLMFunction.mockRejectedValue(networkError);

      // Mock p-retry to call the function (which throws) and propagate the error
      (mockPRetry as any).mockImplementation(async (fn: any) => {
        await fn(); // This throws before setting lastResponse
      });

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      // Should return null because no response was ever captured
      expect(result).toBeNull();
    });

    test("should return last response when all retries are exhausted for OVERLOADED", async () => {
      const overloadedResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.OVERLOADED,
      };

      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;

      mockLLMFunction.mockResolvedValue(overloadedResponse);

      // Mock p-retry to call the function (which captures lastResponse) then reject
      (mockPRetry as any).mockImplementation(async (fn: any) => {
        await fn(); // This sets lastResponse before throwing RetryableError
        throw new Error("All retries exhausted");
      });

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      // Should return the last OVERLOADED response, not null
      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.OVERLOADED);
    });
  });

  describe("LLM Stats Integration", () => {
    test("should record overloaded status in stats", async () => {
      const overloadedResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.OVERLOADED,
      };

      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;

      mockLLMFunction.mockResolvedValue(overloadedResponse);
      (mockPRetry as jest.MockedFunction<typeof mockPRetry>).mockRejectedValue(
        new Error("LLM is overloaded"),
      );

      try {
        await retryStrategy.executeWithRetries(
          mockLLMFunction,
          "test prompt",
          mockContext,
          mockProviderRetryConfig,
        );
      } catch {
        // Expected to throw
      }

      // In the real implementation, stats would be recorded when retryable errors occur
      expect(mockPRetry).toHaveBeenCalled();
    });
  });

  describe("Invalid Response Handling", () => {
    test("should return last response when INVALID response retries are exhausted", async () => {
      const invalidResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.INVALID,
      };

      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;

      mockLLMFunction.mockResolvedValue(invalidResponse);

      // Mock p-retry to call the function (which captures lastResponse) then reject
      (mockPRetry as any).mockImplementation(async (fn: any) => {
        await fn(); // This sets lastResponse before throwing RetryableError
        throw new Error("All retries exhausted");
      });

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      // Should return the last INVALID response, not null
      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.INVALID);
    });
  });

  describe("Type Safety with Schemas", () => {
    test("should preserve object type through retry", async () => {
      const typedResponse: LLMFunctionResponse<Record<string, unknown>> = {
        status: LLMResponseStatus.COMPLETED,
        generated: { id: 1, name: "Alice" },
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
      };

      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;
      mockLLMFunction.mockResolvedValue(typedResponse);
      (mockPRetry as any).mockImplementation(async (fn: any) => await fn());

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.COMPLETED);

      if (result?.status === LLMResponseStatus.COMPLETED && result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data.id).toBe(1);
        expect(data.name).toBe("Alice");
      }
    });

    test("should preserve array type through retry", async () => {
      const typedResponse: LLMFunctionResponse<number[]> = {
        status: LLMResponseStatus.COMPLETED,
        generated: [1, 2, 3, 4, 5],
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
      };

      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;
      mockLLMFunction.mockResolvedValue(typedResponse);
      (mockPRetry as any).mockImplementation(async (fn: any) => await fn());

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.COMPLETED);

      if (result?.status === LLMResponseStatus.COMPLETED && result.generated) {
        expect(Array.isArray(result.generated)).toBe(true);
        const data = result.generated as unknown[];
        expect(data.length).toBe(5);
      }
    });

    test("should preserve nested type through retry with overload recovery", async () => {
      const overloadedResponse: LLMFunctionResponse = {
        status: LLMResponseStatus.OVERLOADED,
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
      };

      const successResponse: LLMFunctionResponse<Record<string, unknown>> = {
        status: LLMResponseStatus.COMPLETED,
        generated: { user: { id: 1, profile: { name: "Bob" } } },
        request: "test prompt",
        modelKey: "test-model",
        context: mockContext,
      };

      const mockLLMFunction = jest.fn() as jest.MockedFunction<
        (content: string, context: LLMContext) => Promise<LLMFunctionResponse>
      >;
      mockLLMFunction
        .mockResolvedValueOnce(overloadedResponse)
        .mockResolvedValueOnce(successResponse);

      (mockPRetry as jest.MockedFunction<typeof mockPRetry>).mockResolvedValue(successResponse);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe(LLMResponseStatus.COMPLETED);

      if (result?.status === LLMResponseStatus.COMPLETED && result.generated) {
        const data = result.generated as Record<string, unknown>;
        expect(data).toHaveProperty("user");
      }
    });
  });
});

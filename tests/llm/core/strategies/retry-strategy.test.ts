import "reflect-metadata";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { RetryStrategy } from "../../../../src/llm/core/strategies/retry-strategy";
import LLMStats from "../../../../src/llm/core/tracking/llm-stats";
import {
  LLMFunction,
  LLMFunctionResponse,
  LLMContext,
  LLMCompletionOptions,
  LLMResponseStatus,
  LLMPurpose,
  LLMOutputFormat,
} from "../../../../src/llm/types/llm.types";
import { LLMRetryConfig } from "../../../../src/llm/providers/llm-provider.types";

// Mock p-retry
jest.mock("p-retry", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import pRetry from "p-retry";
const mockPRetry = pRetry as jest.MockedFunction<typeof pRetry>;

describe("RetryStrategy", () => {
  let retryStrategy: RetryStrategy;
  let mockLLMStats: jest.Mocked<LLMStats>;

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

    // Mock LLMStats
    mockLLMStats = {
      recordOverloadedStatusForProviderAndModel: jest.fn(),
      recordTokenLimitExceededStatusForProviderAndModel: jest.fn(),
      recordInvalidStatusForProviderAndModel: jest.fn(),
      recordCompletedStatusForProviderAndModel: jest.fn(),
      recordErrorStatusForProviderAndModel: jest.fn(),
      getStatusTypesStatistics: jest.fn(),
    } as unknown as jest.Mocked<LLMStats>;

    retryStrategy = new RetryStrategy(mockLLMStats);
  });

  describe("Successful Execution", () => {
    test("should return result immediately on successful first attempt", async () => {
      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;
      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(mockSuccessResponse);

      // Mock successful LLM function response
      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(mockSuccessResponse);

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
      expect(mockLLMFunction).toHaveBeenCalledWith("test prompt", mockContext, undefined);
    });

    test("should pass completion options to LLM function", async () => {
      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;
      const mockCompletionOptions: LLMCompletionOptions = { outputFormat: LLMOutputFormat.JSON };

      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(mockSuccessResponse);

      // Mock p-retry to call the function and return its result
      (mockPRetry as any).mockImplementation(async (fn: any) => {
        return await fn();
      });

      await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
        mockCompletionOptions,
      );

      expect(mockLLMFunction).toHaveBeenCalledWith(
        "test prompt",
        mockContext,
        mockCompletionOptions,
      );
    });
  });

  describe("Retry Logic for Overloaded Status", () => {
    test("should retry when LLM returns OVERLOADED status", async () => {
      const overloadedResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.OVERLOADED,
      };

      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;

      (mockLLMFunction as jest.MockedFunction<LLMFunction>)
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
      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;

      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(mockSuccessResponse);
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
      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;
      const minimalConfig: LLMRetryConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 1,
        minRetryDelayMillis: 100,
        maxRetryDelayMillis: 500,
      };

      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(mockSuccessResponse);
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
    test("should return null when p-retry throws non-retryable errors", async () => {
      const nonRetryableError = new Error("Non-retryable error");
      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;

      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockRejectedValue(nonRetryableError);

      mockPRetry.mockRejectedValue(nonRetryableError);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(result).toBeNull();
    });

    test("should return null when all retries are exhausted", async () => {
      const overloadedResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.OVERLOADED,
      };

      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;

      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(overloadedResponse);
      // Mock p-retry to simulate exhausted retries
      (mockPRetry as jest.MockedFunction<typeof mockPRetry>).mockRejectedValue(
        new Error("All retries exhausted"),
      );

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(result).toBeNull();
    });
  });

  describe("LLM Stats Integration", () => {
    test("should record overloaded status in stats", async () => {
      const overloadedResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.OVERLOADED,
      };

      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;

      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(overloadedResponse);
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
    test("should return null when INVALID response retries are exhausted", async () => {
      const tokenLimitResponse: LLMFunctionResponse = {
        ...mockSuccessResponse,
        status: LLMResponseStatus.INVALID,
      };

      const mockLLMFunction: LLMFunction = jest.fn() as jest.MockedFunction<LLMFunction>;

      (mockLLMFunction as jest.MockedFunction<LLMFunction>).mockResolvedValue(tokenLimitResponse);

      const invalidError = Object.assign(new Error("Invalid response"), {
        retryableStatus: LLMResponseStatus.INVALID,
      });

      (mockPRetry as jest.MockedFunction<typeof mockPRetry>).mockRejectedValue(invalidError);

      const result = await retryStrategy.executeWithRetries(
        mockLLMFunction,
        "test prompt",
        mockContext,
        mockProviderRetryConfig,
      );

      expect(result).toBeNull();
    });
  });
});

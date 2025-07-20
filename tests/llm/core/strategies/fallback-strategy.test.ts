import "reflect-metadata";
import { FallbackStrategy } from "../../../../src/llm/core/strategies/fallback-strategy";
import {
  LLMFunctionResponse,
  LLMContext,
  LLMResponseStatus,
  LLMPurpose,
  LLMResponseTokensUsage,
} from "../../../../src/llm/llm.types";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock the logging module
jest.mock("../../../../src/llm/processing/routerTracking/llm-router-logging", () => ({
  logWithContext: jest.fn(),
}));

describe("FallbackStrategy", () => {
  let fallbackStrategy: FallbackStrategy;

  beforeEach(() => {
    fallbackStrategy = new FallbackStrategy();
  });

  describe("determineNextAction", () => {
    const context: LLMContext = {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    };

    const testCases = [
      {
        description: "overloaded response with ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: true,
        },
      },
      {
        description: "overloaded response with no ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.OVERLOADED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: true,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: false,
        },
      },
      {
        description: "exceeded tokens with ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192,
          } as LLMResponseTokensUsage,
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: true,
        },
      },
      {
        description: "exceeded tokens with no ability to switch models (should crop)",
        llmResponse: {
          status: LLMResponseStatus.EXCEEDED,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
          tokensUage: {
            promptTokens: 5000,
            completionTokens: 3500,
            maxTotalTokens: 8192,
          } as LLMResponseTokensUsage,
        } as LLMFunctionResponse,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: true,
          shouldSwitchToNextLLM: false,
        },
      },
      {
        description: "invalid response with ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.INVALID,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: false,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: true,
        },
      },
      {
        description: "invalid response with no ability to switch models",
        llmResponse: {
          status: LLMResponseStatus.INVALID,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: true,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: false,
        },
      },
      {
        description: "null response (treated as overloaded) with no ability to switch",
        llmResponse: null,
        currentLLMIndex: 1,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: true,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: false,
        },
      },
      {
        description: "unknown status should return shouldTerminate true",
        llmResponse: {
          status: LLMResponseStatus.UNKNOWN,
          request: "test prompt",
          modelKey: "GPT_COMPLETIONS_GPT4",
          context: {},
        } as LLMFunctionResponse,
        currentLLMIndex: 0,
        totalLLMCount: 2,
        expected: {
          shouldTerminate: true,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: false,
        },
      },
    ];

    test.each(testCases)(
      "$description",
      ({ llmResponse, currentLLMIndex, totalLLMCount, expected }) => {
        const result = fallbackStrategy.determineNextAction(
          llmResponse,
          currentLLMIndex,
          totalLLMCount,
          context,
          "test-resource",
        );

        expect(result).toEqual(expected);
      },
    );
  });
});

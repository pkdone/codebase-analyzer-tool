import { LLMErrorLogger } from "../../../src/llm/tracking/llm-error-logger";

/**
 * Creates a mock LLMErrorLogger for use in tests.
 * The mock logger does not actually write files, making tests faster and cleaner.
 */
export function createMockErrorLogger(): LLMErrorLogger {
  const mockLogger = {
    recordJsonProcessingError: jest.fn().mockResolvedValue(undefined),
  } as unknown as LLMErrorLogger;
  return mockLogger;
}

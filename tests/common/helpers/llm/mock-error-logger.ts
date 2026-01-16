import type { LLMErrorLoggingConfig } from "../../../../src/common/llm/config/llm-module-config.types";

/**
 * Creates a mock LLMErrorLoggingConfig for use in tests.
 * Tests will create actual LLMErrorLogger instances from this config,
 * but using a temp directory prevents cluttering the filesystem.
 */
export function createMockErrorLoggingConfig(): LLMErrorLoggingConfig {
  return {
    errorLogDirectory: "/tmp/test-llm-errors",
    errorLogFilenameTemplate: "llm-error-{timestamp}.log",
  };
}

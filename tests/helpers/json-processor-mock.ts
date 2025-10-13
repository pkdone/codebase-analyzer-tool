import { JsonProcessor } from "../../src/llm/json-processing/core/json-processor";

/**
 * Creates a mock JsonProcessor for use in tests
 */
export function createMockJsonProcessor(): JsonProcessor {
  return new JsonProcessor(false); // logging disabled for tests
}

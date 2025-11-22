import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";

// We'll mock the logging utility to capture sanitation step logging
jest.mock("../../../src/common/utils/logging", () => {
  return {
    logErrorMsg: jest.fn(), // still mocked for unrelated error logging
    logSingleLineWarning: jest.fn(),
    logErrorMsgAndDetail: jest.fn(),
    logJsonProcessingWarning: jest.fn(),
  };
});

import { logJsonProcessingWarning } from "../../../src/common/utils/logging";

describe("json-tools sanitation pipeline (incremental refactor wrapper)", () => {
  let jsonProcessor: JsonProcessor;
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
    jest.clearAllMocks();
  });

  test("fast path: valid JSON returns with no sanitation steps logged", () => {
    const json = '{"a":1,"b":2}';
    const result = jsonProcessor.parseAndValidate(json, "fast-path", completionOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1, b: 2 });
    }
    // Should log nothing about sanitation steps (fast path returns before strategies list is created)
    expect(logJsonProcessingWarning).not.toHaveBeenCalled();
  });

  test("extraction path: JSON embedded in text triggers extraction step logging", () => {
    const text = 'Intro text before JSON {"hello":"world"} trailing commentary';
    const result = jsonProcessor.parseAndValidate(text, "extract-path", completionOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ hello: "world" });
    }
    // Should log steps including 'Extracted'
    const calls = (logJsonProcessingWarning as jest.Mock).mock.calls.map((c) => c[1]); // c[1] is the message
    expect(calls.some((c) => c.includes("Extracted"))).toBe(true);
  });

  test("unified sanitization pipeline: deliberately malformed then recoverable JSON", () => {
    // Force multiple sanitizers: content with code fences & trailing comma
    const malformed = '```json\n{"key":"value",}\n``` Extra trailing';
    const result = jsonProcessor.parseAndValidate(malformed, "pipeline-test", completionOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ key: "value" });
    }
    const calls = (logJsonProcessingWarning as jest.Mock).mock.calls.map((c) => c[1]); // c[1] is the message
    // Should include sanitization steps in the log
    expect(calls.some((c) => c.includes("Applied"))).toBe(true);
  });

  test("pre-concat strategy invoked for identifier-only concatenations", () => {
    const withConcat = '{"path": SOME_CONST + OTHER_CONST + THIRD_CONST}';
    const result = jsonProcessor.parseAndValidate(withConcat, "pre-concat", completionOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).path).toBe("");
    }
    const calls = (logJsonProcessingWarning as jest.Mock).mock.calls.map((c) => c[1]); // c[1] is the message
    // Check that sanitization was logged (the message contains "Applied" and sanitization steps)
    expect(calls.some((c) => c.includes("Applied"))).toBe(true);
  });
});

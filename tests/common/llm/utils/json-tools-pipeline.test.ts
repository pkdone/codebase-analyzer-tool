import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import { processJson } from "../../../../src/common/llm/json-processing/core/json-processing";

// We'll mock the logging utility to capture sanitation step logging
jest.mock("../../../../src/common/utils/logging", () => {
  return {
    logErrorMsg: jest.fn(), // still mocked for unrelated error logging
    logOneLineWarning: jest.fn(),
    logError: jest.fn(),
  };
});

import { logOneLineWarning } from "../../../../src/common/utils/logging";

describe("json-tools sanitation pipeline (incremental refactor wrapper)", () => {
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fast path: valid JSON returns with no sanitation steps logged", () => {
    const json = '{"a":1,"b":2}';
    const result = processJson(
      json,
      { resource: "fast-path", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1, b: 2 });
    }
    // Should log nothing about sanitation steps (fast path returns before strategies list is created)
    expect(logOneLineWarning).not.toHaveBeenCalled();
  });

  test("extraction path: JSON embedded in text triggers extraction step logging", () => {
    const text = 'Intro text before JSON {"hello":"world"} trailing commentary';
    const result = processJson(
      text,
      { resource: "extract-path", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ hello: "world" });
    }
    // Should log steps including 'Extracted' (now in diagnostics or step description)
    const calls = (logOneLineWarning as jest.Mock).mock.calls.map((c) => c[0]); // c[0] is the message
    expect(
      calls.some(
        (c) =>
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          c.includes("Extracted") ||
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          c.includes("Fixed JSON structure and noise") ||
          c.includes("Extracted largest JSON span"),
      ),
    ).toBe(true);
  });

  test("unified sanitization pipeline: deliberately malformed then recoverable JSON", () => {
    // Force multiple sanitizers: content with code fences & trailing comma
    const malformed = '```json\n{"key":"value",}\n``` Extra trailing';
    const result = processJson(
      malformed,
      { resource: "pipeline-test", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ key: "value" });
    }
    const calls = (logOneLineWarning as jest.Mock).mock.calls.map((c) => c[0]); // c[0] is the message
    // Should include sanitization steps in the log
    expect(calls.some((c) => c.includes("Applied"))).toBe(true);
  });

  test("pre-concat strategy invoked for identifier-only concatenations", () => {
    const withConcat = '{"path": SOME_CONST + OTHER_CONST + THIRD_CONST}';
    const result = processJson(
      withConcat,
      { resource: "pre-concat", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).path).toBe("");
    }
    const calls = (logOneLineWarning as jest.Mock).mock.calls.map((c) => c[0]); // c[0] is the message
    // Check that sanitization was logged (the message contains "Applied" and sanitization steps)
    expect(calls.some((c) => c.includes("Applied"))).toBe(true);
  });
});

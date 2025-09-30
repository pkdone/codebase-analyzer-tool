import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { parseAndValidateLLMJsonContent } from "../../../src/llm/json-processing/parse-and-validate-llm-json";

// We'll mock the logging utility to capture sanitation step logging
jest.mock("../../../src/common/utils/logging", () => {
  return {
    logErrorMsg: jest.fn(),
    log: jest.fn(),
    logWarningMsg: jest.fn(),
    logErrorMsgAndDetail: jest.fn(),
  };
});

import { logErrorMsg } from "../../../src/common/utils/logging";

describe("json-tools sanitation pipeline (incremental refactor wrapper)", () => {
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fast path: valid JSON returns with no sanitation steps logged", () => {
    const json = '{"a":1,"b":2}';
    const result = parseAndValidateLLMJsonContent(json, "fast-path", completionOptions, true);
    expect(result).toEqual({ a: 1, b: 2 });
    // Should log nothing about sanitation steps (fast path returns before strategies list is created)
    expect(logErrorMsg).not.toHaveBeenCalled();
  });

  test("extraction path: JSON embedded in text triggers extraction step logging", () => {
    const text = 'Intro text before JSON {"hello":"world"} trailing commentary';
    const result = parseAndValidateLLMJsonContent(text, "extract-path", completionOptions, true);
    expect(result).toEqual({ hello: "world" });
    // Should log steps including 'extract'
    const calls = (logErrorMsg as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes("extract"))).toBe(true);
  });

  test("resilient sanitation path: deliberately malformed then recoverable JSON", () => {
    // Force earlier strategies to fail: unbalanced content with code fences & trailing comma
    const malformed = '```json\n{"key":"value",}\n``` Extra trailing';
    const result = parseAndValidateLLMJsonContent(
      malformed,
      "resilient-path",
      completionOptions,
      true,
    );
    expect(result).toEqual({ key: "value" });
    const calls = (logErrorMsg as jest.Mock).mock.calls.map((c) => c[0]);
    // Should include resilient-sanitization marker
    expect(calls.some((c) => c.includes("resilient-sanitization"))).toBe(true);
  });

  test("pre-concat strategy invoked for identifier-only concatenations", () => {
    const withConcat = '{"path": SOME_CONST + OTHER_CONST + THIRD_CONST}';
    const result = parseAndValidateLLMJsonContent(
      withConcat,
      "pre-concat",
      completionOptions,
      true,
    );
    expect((result as any).path).toBe("");
    const calls = (logErrorMsg as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.includes("pre-concat"))).toBe(true);
  });
});

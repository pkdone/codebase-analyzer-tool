import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat, LLMPurpose } from "../../../src/llm/types/llm.types";

jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logSingleLineWarning: jest.fn(),
  logError: jest.fn(),
}));

import { logSingleLineWarning } from "../../../src/common/utils/logging";

describe("JsonProcessor.parseAndValidate (declarative sanitization pipeline)", () => {
  let jsonProcessor: JsonProcessor;
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor(true);
    jest.clearAllMocks();
  });

  it("returns fast path untouched JSON with no sanitation log", () => {
    const json = '{"x":1}';
    const result = jsonProcessor.parseAndValidate(
      json,
      { resource: "decl-fast", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ x: 1 });
    }
    expect(logSingleLineWarning).not.toHaveBeenCalled();
  });

  it("applies extract sanitizer when JSON is embedded in prose", () => {
    const txt = 'Leading words {"y":2} trailing info';
    const result = jsonProcessor.parseAndValidate(
      txt,
      { resource: "decl-extract", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).y).toBe(2);
    }
    const calls = (logSingleLineWarning as jest.Mock).mock.calls.flat();
    expect(
      calls.some(
        (c: string) =>
          c.includes("Fixed JSON structure and noise") || c.includes("Extracted largest JSON span"),
      ),
    ).toBe(true);
  });

  it("applies concatenation chain sanitizer for identifier-only chains", () => {
    const chain = '{"path": A_CONST + B_CONST + C_CONST}';
    const result = jsonProcessor.parseAndValidate(
      chain,
      { resource: "decl-concat", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).path).toBe("");
    }
    const calls = (logSingleLineWarning as jest.Mock).mock.calls.flat();
    expect(
      calls.some((c: string) => c.includes("Fixed") && c.includes("property and value syntax")),
    ).toBe(true);
  });

  it("applies multiple sanitizers in pipeline for complex malformed JSON", () => {
    const malformed = '```json\n{"a":1,}\n``` noise after';
    const result = jsonProcessor.parseAndValidate(
      malformed,
      { resource: "decl-multi", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).a).toBe(1);
    }
    const calls = (logSingleLineWarning as jest.Mock).mock.calls.flat();
    // Should have applied multiple sanitizers for this complex case
    expect(calls.some((c: string) => c.includes("Applied"))).toBe(true);
    // Should include at least code fence removal or JSON structure fixes
    const logMsg = calls.find((c: string) => c.includes("Applied"));
    expect(logMsg).toMatch(
      /Fixed JSON structure and noise|Removed markdown code fences|Fixed JSON structure/,
    );
  });
});

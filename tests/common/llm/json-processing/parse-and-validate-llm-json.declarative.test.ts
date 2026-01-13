import { parseAndValidateLLMJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import { MUTATION_STEP } from "../../../../src/common/llm/json-processing/constants/mutation-steps.config";

jest.mock("../../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

import { logWarn } from "../../../../src/common/utils/logging";

describe("JsonProcessor.parseAndValidate (declarative sanitization pipeline)", () => {
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns fast path untouched JSON with no sanitation log", () => {
    const json = '{"x":1}';
    const result = parseAndValidateLLMJson(
      json,
      { resource: "decl-fast", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ x: 1 });
    }
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("applies extract sanitizer when JSON is embedded in prose", () => {
    const txt = 'Leading words {"y":2} trailing info';
    const result = parseAndValidateLLMJson(
      txt,
      { resource: "decl-extract", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).y).toBe(2);
    }
    const calls = (logWarn as jest.Mock).mock.calls.flat();
    expect(
      calls.some(
        (c: string) =>
          c.includes("Fixed JSON structure and noise") || c.includes("Extracted largest JSON span"),
      ),
    ).toBe(true);
  });

  it("applies concatenation chain sanitizer for identifier-only chains", () => {
    const chain = '{"path": A_CONST + B_CONST + C_CONST}';
    const result = parseAndValidateLLMJson(
      chain,
      { resource: "decl-concat", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).path).toBe("");
    }
    const calls = (logWarn as jest.Mock).mock.calls.flat();
    expect(
      calls.some((c: string) => c.includes("Fixed") && c.includes("property and value syntax")),
    ).toBe(true);
  });

  it("applies multiple sanitizers in pipeline for complex malformed JSON", () => {
    const malformed = '```json\n{"a":1,}\n``` noise after';
    const result = parseAndValidateLLMJson(
      malformed,
      { resource: "decl-multi", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).a).toBe(1);
    }
    const calls = (logWarn as jest.Mock).mock.calls.flat();
    // Should have applied multiple sanitizers for this complex case
    expect(calls.some((c: string) => c.includes("Applied"))).toBe(true);
    // Should include at least code fence removal or JSON structure fixes
    const logMsg = calls.find((c: string) => c.includes("Applied"));
    expect(logMsg).toMatch(
      new RegExp(
        `Fixed JSON structure and noise|${MUTATION_STEP.REMOVED_CODE_FENCES}|Fixed JSON structure`,
      ),
    );
  });
});

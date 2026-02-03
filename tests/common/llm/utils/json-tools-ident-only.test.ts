import { parseAndValidateLLMJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";

describe("json-tools identifier-only chain handling", () => {
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {});

  it("collapses identifier-only concatenation chain to empty string literal", () => {
    const json = '{"path": SOME_CONST + OTHER_CONST + THIRD_CONST}';
    const result = parseAndValidateLLMJson(
      json,
      {
        resource: "test-ident-only-chain",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "test-model",
      },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).path).toBe("");
    }
  });

  it("keeps surrounding structure when collapsing identifier-only chain", () => {
    const json = '{"a": 1, "b": CONST_A + CONST_B + CONST_C, "c": 3}';
    const result = parseAndValidateLLMJson(
      json,
      {
        resource: "test-ident-only-chain-struct",
        purpose: LLMPurpose.COMPLETIONS,
        modelKey: "test-model",
      },
      completionOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).a).toBe(1);
      expect((result.data as any).b).toBe("");
      expect((result.data as any).c).toBe(3);
    }
  });
});

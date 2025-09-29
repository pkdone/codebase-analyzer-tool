import { parseAndValidateLLMJsonContent } from "../../../src/llm/json-processing/parse-and-validate-llm-json";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";

describe("json-tools identifier-only chain handling", () => {
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  it("collapses identifier-only concatenation chain to empty string literal", () => {
    const json = '{"path": SOME_CONST + OTHER_CONST + THIRD_CONST}';
    const result = parseAndValidateLLMJsonContent(json, "test-ident-only-chain", completionOptions);
    expect(result).toBeDefined();
    expect((result as any).path).toBe("");
  });

  it("keeps surrounding structure when collapsing identifier-only chain", () => {
    const json = '{"a": 1, "b": CONST_A + CONST_B + CONST_C, "c": 3}';
    const result = parseAndValidateLLMJsonContent(
      json,
      "test-ident-only-chain-struct",
      completionOptions,
    );
    expect(result).toBeDefined();
    expect((result as any).a).toBe(1);
    expect((result as any).b).toBe("");
    expect((result as any).c).toBe(3);
  });
});

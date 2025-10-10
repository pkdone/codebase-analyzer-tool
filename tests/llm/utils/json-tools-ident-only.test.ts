import { JsonProcessor } from "../../../src/llm/json-processing/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";

describe("json-tools identifier-only chain handling", () => {
  let jsonProcessor: JsonProcessor;
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
  });

  it("collapses identifier-only concatenation chain to empty string literal", () => {
    const json = '{"path": SOME_CONST + OTHER_CONST + THIRD_CONST}';
    const result = jsonProcessor.parseAndValidate(json, "test-ident-only-chain", completionOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).path).toBe("");
    }
  });

  it("keeps surrounding structure when collapsing identifier-only chain", () => {
    const json = '{"a": 1, "b": CONST_A + CONST_B + CONST_C, "c": 3}';
    const result = jsonProcessor.parseAndValidate(
      json,
      "test-ident-only-chain-struct",
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

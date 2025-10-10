import { JsonProcessor } from "../../../src/llm/json-processing/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";

jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logWarningMsg: jest.fn(),
  logErrorMsgAndDetail: jest.fn(),
}));

import { logWarningMsg } from "../../../src/common/utils/logging";

describe("JsonProcessor.parseAndValidate (declarative strategy pipeline)", () => {
  let jsonProcessor: JsonProcessor;
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
    jest.clearAllMocks();
  });

  it("returns fast path untouched JSON with no sanitation log", () => {
    const json = '{"x":1}';
    const result = jsonProcessor.parseAndValidate(json, "decl-fast", completionOptions, true);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ x: 1 });
    }
    expect(logWarningMsg).not.toHaveBeenCalled();
  });

  it("applies extract strategy when JSON is embedded in prose", () => {
    const txt = 'Leading words {"y":2} trailing info';
    const result = jsonProcessor.parseAndValidate(txt, "decl-extract", completionOptions, true);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).y).toBe(2);
    }
    const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
    expect(calls.some((c: string) => c.includes("extract"))).toBe(true);
  });

  it("falls through to pre-concat strategy for identifier-only chains", () => {
    const chain = '{"path": A_CONST + B_CONST + C_CONST}';
    const result = jsonProcessor.parseAndValidate(
      chain,
      "decl-pre-concat",
      completionOptions,
      true,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).path).toBe("");
    }
    const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
    expect(calls.some((c: string) => c.includes("pre-concat"))).toBe(true);
  });

  it("invokes resilient sanitation when earlier strategies cannot parse", () => {
    const malformed = '```json\n{"a":1,}\n``` noise after';
    const result = jsonProcessor.parseAndValidate(
      malformed,
      "decl-resilient",
      completionOptions,
      true,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).a).toBe(1);
    }
    const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
    expect(calls.some((c: string) => c.includes("resilient-sanitization"))).toBe(true);
  });
});

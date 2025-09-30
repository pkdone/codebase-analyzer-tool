import { parseAndValidateLLMJsonContent } from "../../../src/llm/json-processing/parse-and-validate-llm-json";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";

jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logWarningMsg: jest.fn(),
  logErrorMsgAndDetail: jest.fn(),
}));

import { logWarningMsg } from "../../../src/common/utils/logging";

describe("parseAndValidateLLMJsonContent (declarative strategy pipeline)", () => {
  const completionOptions = { outputFormat: LLMOutputFormat.JSON } as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns fast path untouched JSON with no sanitation log", () => {
    const json = '{"x":1}';
    const out = parseAndValidateLLMJsonContent(json, "decl-fast", completionOptions, true);
    expect(out).toEqual({ x: 1 });
    expect(logWarningMsg).not.toHaveBeenCalled();
  });

  it("applies extract strategy when JSON is embedded in prose", () => {
    const txt = 'Leading words {"y":2} trailing info';
    const out = parseAndValidateLLMJsonContent(txt, "decl-extract", completionOptions, true);
    expect((out as any).y).toBe(2);
    const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
    expect(calls.some((c: string) => c.includes("extract"))).toBe(true);
  });

  it("falls through to pre-concat strategy for identifier-only chains", () => {
    const chain = '{"path": A_CONST + B_CONST + C_CONST}';
    const out = parseAndValidateLLMJsonContent(chain, "decl-pre-concat", completionOptions, true);
    expect((out as any).path).toBe("");
    const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
    expect(calls.some((c: string) => c.includes("pre-concat"))).toBe(true);
  });

  it("invokes resilient sanitation when earlier strategies cannot parse", () => {
    const malformed = '```json\n{"a":1,}\n``` noise after';
    const out = parseAndValidateLLMJsonContent(
      malformed,
      "decl-resilient",
      completionOptions,
      true,
    );
    expect((out as any).a).toBe(1);
    const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
    expect(calls.some((c: string) => c.includes("resilient-sanitization"))).toBe(true);
  });
});

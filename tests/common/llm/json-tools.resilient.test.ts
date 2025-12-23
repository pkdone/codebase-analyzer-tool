import { processJson } from "../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../src/common/llm/types/llm.types";

describe("json-tools resilient parsing", () => {
  const baseOptions = { outputFormat: LLMOutputFormat.JSON } as any; // schema optional

  beforeEach(() => {});
  const sampleValid = `{
    "purpose": "Example",
    "nested": { "a": 1, "b": [1,2,3] }
  }`;

  it("parses already valid JSON (fast path)", () => {
    const result = processJson(
      sampleValid,
      { resource: "res1", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).purpose).toBe("Example");
    }
  });

  it("parses JSON inside fenced block", () => {
    const txt = "```json\n" + sampleValid + "\n```";
    const result = processJson(
      txt,
      { resource: "res2", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).nested.a).toBe(1);
    }
  });

  it("parses JSON with trailing commentary", () => {
    const txt = sampleValid + "\n-- END OF JSON --";
    const result = processJson(
      txt,
      { resource: "res3", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).nested.b.length).toBe(3);
    }
  });

  it("parses duplicated identical JSON objects concatenated", () => {
    const dup = sampleValid + sampleValid;
    const result = processJson(
      dup,
      { resource: "res4", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).purpose).toBe("Example");
    }
  });

  it("removes trailing commas", () => {
    const trailing = `{"a":1, "b":[1,2,3,],}`;
    const result = processJson(
      trailing,
      { resource: "res5", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).b[2]).toBe(3);
    }
  });

  it("handles zero-width characters", () => {
    const weird = `\u200B${sampleValid}\u200C`;
    const result = processJson(
      weird,
      { resource: "res6", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).purpose).toBe("Example");
    }
  });

  it("two different concatenated objects results in first object being parsed (documented behavior)", () => {
    const combo = `{"a":1}{"b":2}`;
    const result = processJson(
      combo,
      { resource: "res7", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1 });
    }
  });

  it("fails for input with no JSON braces", () => {
    const noJson = "There is absolutely no JSON structure here";
    const result = processJson(
      noJson,
      { resource: "res8", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      // Plain text without JSON structure now gets a clearer error message
      expect(result.error.message).toMatch(
        /contains no JSON structure|doesn't contain valid JSON|cannot be parsed/i,
      );
    }
  });

  it("parses realistic large-ish response subset", () => {
    const large = `{
      "purpose": "This class is a JUnit 5 test suite designed to verify the functionality",
      "publicFunctions": [
        { "name": "testCreateNewDataSourceFor_ShouldUseNormalConfiguration_WhenInAllMode" }
      ]
    }`;
    const result = processJson(
      large,
      { resource: "failing-sample", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).publicFunctions[0].name).toContain("UseNormalConfiguration");
    }
  });

  it("resilient sanitation path still parses fenced JSON when earlier strategies fail intentionally", () => {
    // Craft input that defeats raw extract by adding leading noise without braces, then fenced JSON
    const fenced = "Noise before block\n```json\n" + sampleValid + "\n```   trailing";
    const result = processJson(
      fenced,
      { resource: "res9", purpose: LLMPurpose.COMPLETIONS },
      baseOptions,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).nested.a).toBe(1);
    }
  });
});

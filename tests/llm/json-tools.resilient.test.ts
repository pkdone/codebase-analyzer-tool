import { JsonProcessor } from "../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../src/llm/types/llm.types";

describe("json-tools resilient parsing", () => {
  let jsonProcessor: JsonProcessor;
  const baseOptions = { outputFormat: LLMOutputFormat.JSON } as any; // schema optional

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
  });
  const sampleValid = `{
    "purpose": "Example",
    "nested": { "a": 1, "b": [1,2,3] }
  }`;

  it("parses already valid JSON (fast path)", () => {
    const result = jsonProcessor.parseAndValidate(sampleValid, "res1", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).purpose).toBe("Example");
    }
  });

  it("parses JSON inside fenced block", () => {
    const txt = "```json\n" + sampleValid + "\n```";
    const result = jsonProcessor.parseAndValidate(txt, "res2", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).nested.a).toBe(1);
    }
  });

  it("parses JSON with trailing commentary", () => {
    const txt = sampleValid + "\n-- END OF JSON --";
    const result = jsonProcessor.parseAndValidate(txt, "res3", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).nested.b.length).toBe(3);
    }
  });

  it("parses duplicated identical JSON objects concatenated", () => {
    const dup = sampleValid + sampleValid;
    const result = jsonProcessor.parseAndValidate(dup, "res4", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).purpose).toBe("Example");
    }
  });

  it("removes trailing commas", () => {
    const trailing = `{"a":1, "b":[1,2,3,],}`;
    const result = jsonProcessor.parseAndValidate(trailing, "res5", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).b[2]).toBe(3);
    }
  });

  it("handles zero-width characters", () => {
    const weird = `\u200B${sampleValid}\u200C`;
    const result = jsonProcessor.parseAndValidate(weird, "res6", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).purpose).toBe("Example");
    }
  });

  it("two different concatenated objects results in first object being parsed (documented behavior)", () => {
    const combo = `{"a":1}{"b":2}`;
    const result = jsonProcessor.parseAndValidate(combo, "res7", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1 });
    }
  });

  it("fails for input with no JSON braces", () => {
    const noJson = "There is absolutely no JSON structure here";
    const result = jsonProcessor.parseAndValidate(noJson, "res8", baseOptions);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toMatch(/doesn't contain valid JSON|cannot be parsed/i);
    }
  });

  it("parses realistic large-ish response subset", () => {
    const large = `{
      "purpose": "This class is a JUnit 5 test suite designed to verify the functionality",
      "publicMethods": [
        { "name": "testCreateNewDataSourceFor_ShouldUseNormalConfiguration_WhenInAllMode" }
      ]
    }`;
    const result = jsonProcessor.parseAndValidate(large, "failing-sample", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).publicMethods[0].name).toContain("UseNormalConfiguration");
    }
  });

  it("resilient sanitation path still parses fenced JSON when earlier strategies fail intentionally", () => {
    // Craft input that defeats raw extract by adding leading noise without braces, then fenced JSON
    const fenced = "Noise before block\n```json\n" + sampleValid + "\n```   trailing";
    const result = jsonProcessor.parseAndValidate(fenced, "res9", baseOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).nested.a).toBe(1);
    }
  });
});

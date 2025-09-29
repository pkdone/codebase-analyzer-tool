import { parseAndValidateLLMJsonContent } from "../../src/llm/json-processing/parse-and-validate-llm-json";
import { LLMOutputFormat } from "../../src/llm/types/llm.types";

describe("json-tools resilient parsing", () => {
  const baseOptions = { outputFormat: LLMOutputFormat.JSON } as any; // schema optional
  const sampleValid = `{
    "purpose": "Example",
    "nested": { "a": 1, "b": [1,2,3] }
  }`;

  it("parses already valid JSON (fast path)", () => {
    const obj = parseAndValidateLLMJsonContent(sampleValid, "res1", baseOptions);
    expect((obj as any).purpose).toBe("Example");
  });

  it("parses JSON inside fenced block", () => {
    const txt = "```json\n" + sampleValid + "\n```";
    const obj = parseAndValidateLLMJsonContent(txt, "res2", baseOptions);
    expect((obj as any).nested.a).toBe(1);
  });

  it("parses JSON with trailing commentary", () => {
    const txt = sampleValid + "\n-- END OF JSON --";
    const obj = parseAndValidateLLMJsonContent(txt, "res3", baseOptions);
    expect((obj as any).nested.b.length).toBe(3);
  });

  it("parses duplicated identical JSON objects concatenated", () => {
    const dup = sampleValid + sampleValid;
    const obj = parseAndValidateLLMJsonContent(dup, "res4", baseOptions);
    expect((obj as any).purpose).toBe("Example");
  });

  it("removes trailing commas", () => {
    const trailing = `{"a":1, "b":[1,2,3,],}`;
    const obj = parseAndValidateLLMJsonContent(trailing, "res5", baseOptions);
    expect((obj as any).b[2]).toBe(3);
  });

  it("handles zero-width characters", () => {
    const weird = `\u200B${sampleValid}\u200C`;
    const obj = parseAndValidateLLMJsonContent(weird, "res6", baseOptions);
    expect((obj as any).purpose).toBe("Example");
  });

  it("two different concatenated objects results in first object being parsed (documented behavior)", () => {
    const combo = `{"a":1}{"b":2}`;
    const obj = parseAndValidateLLMJsonContent(combo, "res7", baseOptions);
    expect(obj).toEqual({ a: 1 });
  });

  it("fails for input with no JSON braces", () => {
    const noJson = "There is absolutely no JSON structure here";
    expect(() => parseAndValidateLLMJsonContent(noJson, "res8", baseOptions)).toThrow(
      /doesn't contain valid JSON|cannot be parsed/i,
    );
  });

  it("parses realistic large-ish response subset", () => {
    const large = `{
      "purpose": "This class is a JUnit 5 test suite designed to verify the functionality",
      "publicMethods": [
        { "name": "testCreateNewDataSourceFor_ShouldUseNormalConfiguration_WhenInAllMode" }
      ]
    }`;
    const obj = parseAndValidateLLMJsonContent(large, "failing-sample", baseOptions);
    expect((obj as any).publicMethods[0].name).toContain("UseNormalConfiguration");
  });

  it("resilient sanitation path still parses fenced JSON when earlier strategies fail intentionally", () => {
    // Craft input that defeats raw extract by adding leading noise without braces, then fenced JSON
    const fenced = "Noise before block\n```json\n" + sampleValid + "\n```   trailing";
    const obj = parseAndValidateLLMJsonContent(fenced, "res9", baseOptions, true);
    expect((obj as any).nested.a).toBe(1);
  });
});

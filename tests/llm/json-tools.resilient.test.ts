import {
  convertTextToJSONAndOptionallyValidate,
  sanitizePotentialJSONResponse,
} from "../../src/llm/utils/json-tools";
import { LLMOutputFormat } from "../../src/llm/types/llm.types";

describe("json-tools resilient parsing", () => {
  const baseOptions = { outputFormat: LLMOutputFormat.JSON } as any; // schema optional
  const sampleValid = `{
    "purpose": "Example",
    "nested": { "a": 1, "b": [1,2,3] }
  }`;

  it("parses already valid JSON (fast path)", () => {
    const obj = convertTextToJSONAndOptionallyValidate(sampleValid, "res1", baseOptions);
    expect((obj as any).purpose).toBe("Example");
  });

  it("parses JSON inside fenced block", () => {
    const txt = "```json\n" + sampleValid + "\n```";
    const obj = convertTextToJSONAndOptionallyValidate(txt, "res2", baseOptions);
    expect((obj as any).nested.a).toBe(1);
  });

  it("parses JSON with trailing commentary", () => {
    const txt = sampleValid + "\n-- END OF JSON --";
    const obj = convertTextToJSONAndOptionallyValidate(txt, "res3", baseOptions);
    expect((obj as any).nested.b.length).toBe(3);
  });

  it("parses duplicated identical JSON objects concatenated", () => {
    const dup = sampleValid + sampleValid;
    const obj = convertTextToJSONAndOptionallyValidate(dup, "res4", baseOptions);
    expect((obj as any).purpose).toBe("Example");
  });

  it("removes trailing commas", () => {
    const trailing = `{"a":1, "b":[1,2,3,],}`;
    const obj = convertTextToJSONAndOptionallyValidate(trailing, "res5", baseOptions);
    expect((obj as any).b[2]).toBe(3);
  });

  it("handles zero-width characters", () => {
    const weird = `\u200B${sampleValid}\u200C`;
    const obj = convertTextToJSONAndOptionallyValidate(weird, "res6", baseOptions);
    expect((obj as any).purpose).toBe("Example");
  });

  it("two different concatenated objects results in first object being parsed (documented behavior)", () => {
    const combo = `{"a":1}{"b":2}`;
    const obj = convertTextToJSONAndOptionallyValidate(combo, "res7", baseOptions);
    expect(obj).toEqual({ a: 1 });
  });

  it("fails for input with no JSON braces", () => {
    const noJson = "There is absolutely no JSON structure here";
    expect(() => convertTextToJSONAndOptionallyValidate(noJson, "res8", baseOptions)).toThrow(
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
    const obj = convertTextToJSONAndOptionallyValidate(large, "failing-sample", baseOptions);
    expect((obj as any).publicMethods[0].name).toContain("UseNormalConfiguration");
  });

  it("sanitize reports diagnostics when changed", () => {
    const fenced = "```json\n" + sampleValid + "\n```";
    const { changed, diagnostics } = sanitizePotentialJSONResponse(fenced);
    expect(changed).toBe(true);
    expect(diagnostics).toMatch(/code fences/i);
  });
});

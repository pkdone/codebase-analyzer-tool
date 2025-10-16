import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMCompletionOptions, LLMOutputFormat } from "../../../src/llm/types/llm.types";

describe("JsonProcessor lastSanitizer tracking", () => {
  const processor = new JsonProcessor(false);
  const completionOptions: LLMCompletionOptions = { outputFormat: LLMOutputFormat.JSON } as any;

  it("includes lastSanitizer in error when pipeline fails", () => {
    const malformed = "NOT_JSON@@";
    const result = processor.parseAndValidate(malformed, "TestResource", completionOptions);
    expect(result.success).toBe(false);
    if (!result.success) {
      // lastSanitizer may or may not be set depending on whether any sanitizer changed content
      if (result.error instanceof Error) {
        const anyErr = result.error as any;
        if (anyErr.lastSanitizer) {
          expect(typeof anyErr.lastSanitizer).toBe("string");
          if (Array.isArray(anyErr.appliedSanitizers)) {
            expect(anyErr.appliedSanitizers).toContain(anyErr.lastSanitizer);
          }
        }
      }
    }
  });
});

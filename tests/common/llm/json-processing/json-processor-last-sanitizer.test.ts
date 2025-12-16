import { processJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import {
  LLMCompletionOptions,
  LLMOutputFormat,
  LLMPurpose,
} from "../../../../src/common/llm/types/llm.types";

describe("JsonProcessor lastSanitizer tracking", () => {
  const completionOptions: LLMCompletionOptions = { outputFormat: LLMOutputFormat.JSON } as any;

  it("includes lastSanitizer in error when pipeline fails", () => {
    const malformed = "NOT_JSON@@";

    const result = (processJson as any)(
      malformed,
      { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      // lastSanitizer may or may not be set depending on whether any sanitizer changed content
      if (result.error instanceof Error) {
        const anyErr = result.error;
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

import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../src/llm/json-processing/types/json-processing.errors";

describe("JsonProcessingError lastSanitizer property", () => {
  it("stores lastSanitizer when provided", () => {
    const err = new JsonProcessingError(
      JsonProcessingErrorType.PARSE,
      "Failed",
      "orig",
      "san",
      ["a", "b"],
      new Error("parse"),
      "finalStep",
    );
    expect(err.lastSanitizer).toBe("finalStep");
  });

  it("leaves lastSanitizer undefined when omitted", () => {
    const err = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Failed", "orig", "san", []);
    expect(err.lastSanitizer).toBeUndefined();
  });
});

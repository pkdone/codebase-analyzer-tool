import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../../src/common/llm/json-processing/types/json-processing.errors";

describe("JsonProcessingError simplified structure", () => {
  it("should create error with type and message", () => {
    const err = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Failed");
    expect(err.type).toBe(JsonProcessingErrorType.PARSE);
    expect(err.message).toBe("Failed");
  });

  it("should create error with cause", () => {
    const underlyingError = new Error("parse");
    const err = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Failed", underlyingError);
    expect(err.cause).toBe(underlyingError);
  });

  it("should work without cause", () => {
    const err = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Failed");
    expect(err.cause).toBeUndefined();
  });
});

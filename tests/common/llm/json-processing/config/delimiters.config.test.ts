import { DELIMITERS } from "../../../../../src/common/llm/json-processing/constants/json-processing.config";

describe("DELIMITERS config", () => {
  it("is frozen and has expected keys", () => {
    expect(Object.isFrozen(DELIMITERS)).toBe(true);
    expect(DELIMITERS.OPEN_BRACE).toBe("{");
    expect(DELIMITERS.CLOSE_BRACE).toBe("}");
    expect(DELIMITERS.OPEN_BRACKET).toBe("[");
    expect(DELIMITERS.CLOSE_BRACKET).toBe("]");
    expect(DELIMITERS.DOUBLE_QUOTE).toBe('"');
  });
});

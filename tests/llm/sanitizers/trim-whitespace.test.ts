import { trimWhitespace } from "../../../src/llm/json-processing/sanitizers/trim-whitespace";

describe("trimWhitespace sanitizer", () => {
  it("trims leading and trailing whitespace", () => {
    const input = '  \n  {"a":1}  \t';
    const { content, changed, description } = trimWhitespace(input);
    expect(changed).toBe(true);
    expect(description).toMatch(/trimmed/i);
    expect(content).toBe('{"a":1}');
  });

  it("leaves already trimmed content unchanged", () => {
    const input = '{"a":1}';
    const { content, changed } = trimWhitespace(input);
    expect(changed).toBe(false);
    expect(content).toBe(input);
  });
});

import { repairOverEscapedStringSequences } from "../../../src/llm/json-processing/sanitizers/fix-over-escaped-sequences";

/**
 * Guards the extracted over-escaped sequence repair logic to ensure no regressions.
 */

describe("repairOverEscapedStringSequences", () => {
  it("reduces excessive backslashes around single quotes", () => {
    const input = "\\\\\\'test\\\\\\'"; // represents \\\'test\\\'
    const result = repairOverEscapedStringSequences(input);
    expect(result).toBe("'test'");
  });

  it("collapses over-escaped null sequences", () => {
    const input = "path\\\\0more \\0 end"; // contains \\\\0 then \\0
    const result = repairOverEscapedStringSequences(input);
    expect(result).toBe("path\\0more \\0 end");
  });

  it("removes stray backslashes before commas and parentheses", () => {
    const input = "value\\, next\\)";
    const result = repairOverEscapedStringSequences(input);
    expect(result).toBe("value, next)");
  });

  it("is idempotent for already clean string", () => {
    const input = "simple clean";
    expect(repairOverEscapedStringSequences(input)).toBe(input);
  });
});

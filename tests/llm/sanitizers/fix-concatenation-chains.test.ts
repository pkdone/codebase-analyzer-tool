import {
  lightCollapseConcatenationChains,
  normalizeConcatenationChains,
} from "../../../src/llm/json-processing/sanitizers/fix-concatenation-chains";

/**
 * These tests guard the extracted concatenation chain sanitizers to ensure
 * behavior parity with the previously inlined logic inside
 * parse-and-validate-llm-json.ts.
 */

describe("concatenation chain sanitizers", () => {
  it("lightCollapseConcatenationChains leaves content without + unchanged", () => {
    const input = '{"key": "value"}';
    expect(lightCollapseConcatenationChains(input)).toBe(input);
  });

  it("lightCollapseConcatenationChains collapses identifier-only chains to empty string literal", () => {
    const input = '{"k": partA + partB + partC}';
    const output = lightCollapseConcatenationChains(input);
    expect(output).toBe('{"k": ""}');
  });

  it("lightCollapseConcatenationChains preserves first literal in identifier-leading chain", () => {
    const input = '{"k": someIdent + "literal" + otherIdent}';
    const output = lightCollapseConcatenationChains(input);
    expect(output).toBe('{"k": "literal"}');
  });

  it("normalizeConcatenationChains merges chained string literals", () => {
    const input = '{"k": "a" + "b" + "c"}';
    const output = normalizeConcatenationChains(input);
    expect(output).toBe('{"k": "abc"}');
  });

  it("normalizeConcatenationChains reduces literal + identifier sequence to first literal", () => {
    const input = '{"k": "hello" + someVar + "world"}';
    const output = normalizeConcatenationChains(input);
    expect(output).toBe('{"k": "hello"}');
  });
});

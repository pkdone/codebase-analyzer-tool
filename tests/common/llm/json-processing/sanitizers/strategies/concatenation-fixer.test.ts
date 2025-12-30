/**
 * Tests for the concatenation fixer strategy.
 */

import { concatenationFixer } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/concatenation-fixer";

describe("concatenationFixer", () => {
  it("should return unchanged for empty input", () => {
    const result = concatenationFixer.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged when no concatenation present", () => {
    const input = '{"name": "test", "value": 123}';
    const result = concatenationFixer.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should merge consecutive string literals", () => {
    const input = '{"path": "base" + "/path" + "/end"}';
    const result = concatenationFixer.apply(input);
    expect(result.content).toBe('{"path": "base/path/end"}');
    expect(result.changed).toBe(true);
  });

  it("should handle identifier + literal chains", () => {
    const input = '{"url": BASE_URL + "/api/endpoint"}';
    const result = concatenationFixer.apply(input);
    expect(result.content).toBe('{"url": "/api/endpoint"}');
    expect(result.changed).toBe(true);
  });

  it("should handle literal + identifier chains", () => {
    const input = '{"url": "/api/" + someVariable}';
    const result = concatenationFixer.apply(input);
    expect(result.content).toBe('{"url": "/api/"}');
    expect(result.changed).toBe(true);
  });

  it("should replace identifier-only chains with empty string", () => {
    const input = '{"value": BASE_PATH + CONFIG.path}';
    const result = concatenationFixer.apply(input);
    expect(result.content).toBe('{"value": ""}');
    expect(result.changed).toBe(true);
  });

  it("should add diagnostics for changes", () => {
    const input = '{"path": "a" + "b"}';
    const result = concatenationFixer.apply(input);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

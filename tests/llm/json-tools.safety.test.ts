import { __test_assertNoDistinctConcatenatedObjects } from "../../src/llm/utils/json-tools";

// We test only the explicit error path where two distinct concatenated objects should raise.
// Normal parsing path often collapses or extracts the first object; this focuses solely on
// the safety detection logic exposed via a test wrapper.

describe("json-tools safety detection", () => {
  it("throws when two distinct concatenated objects detected", () => {
    const first = '{"a":1}';
    const second = '{"b":2}';
    const combined = first + second;
    expect(() => {
      __test_assertNoDistinctConcatenatedObjects(combined, combined, "safety-resource");
    }).toThrow(/two different concatenated JSON objects/i);
  });

  it("does not throw when objects are identical duplicates", () => {
    const first = '{"a":1}';
    const combined = first + first;
    expect(() => {
      __test_assertNoDistinctConcatenatedObjects(combined, combined, "safety-resource");
    }).not.toThrow();
  });
});

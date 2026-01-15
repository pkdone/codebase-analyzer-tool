/**
 * Tests for the duplicate entry remover strategy.
 */

import { duplicateEntryRemover } from "../../../../../../src/common/llm/json-processing/sanitizers/strategies/duplicate-entry-remover";

describe("duplicateEntryRemover", () => {
  it("should return unchanged for empty input", () => {
    const result = duplicateEntryRemover.apply("");
    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  it("should return unchanged for valid JSON arrays", () => {
    const input = '["item1", "item2", "item3"]';
    const result = duplicateEntryRemover.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should remove entries with corruption markers", () => {
    // Test with properly quoted corruption marker entry
    const input = '["valid.entry",\n  "extra_duplicate_entry"]';
    const result = duplicateEntryRemover.apply(input);
    expect(result.content).not.toContain("extra_duplicate");
    expect(result.changed).toBe(true);
  });

  it("should remove quoted entries with extra prefix", () => {
    const input = '["valid.entry",\n  "extra_duplicate_entry",]';
    const result = duplicateEntryRemover.apply(input);
    expect(result.content).not.toContain("extra_duplicate");
    expect(result.changed).toBe(true);
  });

  it("should remove quoted entries with duplicate prefix", () => {
    const input = '["valid.entry",\n  "duplicate_of_entry",]';
    const result = duplicateEntryRemover.apply(input);
    expect(result.content).not.toContain("duplicate_of");
    expect(result.changed).toBe(true);
  });

  it("should keep valid entries", () => {
    const input = '["com.example.Service", "com.example.Repository"]';
    const result = duplicateEntryRemover.apply(input);
    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  it("should add diagnostics when removing entries", () => {
    const input = '["valid",\n  "extra_duplicate",]';
    const result = duplicateEntryRemover.apply(input);
    if (result.changed) {
      expect(result.repairs.length).toBeGreaterThan(0);
    }
  });
});

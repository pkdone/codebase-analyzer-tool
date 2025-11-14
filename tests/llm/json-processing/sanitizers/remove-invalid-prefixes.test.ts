import { removeInvalidPrefixes } from "../../../../src/llm/json-processing/sanitizers/remove-invalid-prefixes";

describe("removeInvalidPrefixes", () => {
  describe("Pattern 4.5: Remove stray key-value pairs in arrays", () => {
    it("should remove stray key-value pair in array", () => {
      const input = `{
  "externalReferences": [
    "java.sql.SQLException",
LAGACY_CODE_REFACTOR_TOOLING: "2024-05-22",
    "java.time.LocalDate"
  ]
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("LAGACY_CODE_REFACTOR_TOOLING");
      expect(result.content).toContain('"java.sql.SQLException"');
      expect(result.content).toContain('"java.time.LocalDate"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove multiple stray key-value pairs in array", () => {
      const input = `{
  "externalReferences": [
    "java.sql.SQLException",
LAGACY_CODE_REFACTOR_TOOLING: "2024-05-22",
    "java.time.LocalDate",
ANOTHER_STRAY_KEY: "some-value",
    "java.util.Collection"
  ]
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("LAGACY_CODE_REFACTOR_TOOLING");
      expect(result.content).not.toContain("ANOTHER_STRAY_KEY");
      expect(result.content).toContain('"java.sql.SQLException"');
      expect(result.content).toContain('"java.time.LocalDate"');
      expect(result.content).toContain('"java.util.Collection"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should not remove key-value pairs in objects", () => {
      const input = `{
  "properties": {
    "LAGACY_CODE_REFACTOR_TOOLING": "2024-05-22",
    "other": "value"
  }
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(false);
      expect(result.content).toContain("LAGACY_CODE_REFACTOR_TOOLING");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});

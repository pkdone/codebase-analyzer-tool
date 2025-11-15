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

  describe("Pattern 3e: Remove file paths and image references before array string values", () => {
    it("should remove image file path before array element", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.integrationtests.common.Utils",
    images/validation/OIG4.9HS_X.8.jpeg    "java.util.List",
    "org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper"
  ]
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("images/validation/OIG4.9HS_X.8.jpeg");
      expect(result.content).toContain('"java.util.List"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should remove various file extensions before array elements", () => {
      const testCases = [
        { path: "docs/example.json", extension: "json" },
        { path: "src/main.java", extension: "java" },
        { path: "test/file.ts", extension: "ts" },
        { path: "image.png", extension: "png" },
      ];

      testCases.forEach(({ path }) => {
        const input = `{
  "references": [
    "org.example.Class1",
    ${path}    "org.example.Class2",
    "org.example.Class3"
  ]
}`;

        const result = removeInvalidPrefixes(input);

        expect(result.changed).toBe(true);
        expect(result.content).not.toContain(path);
        expect(result.content).toContain('"org.example.Class2"');
        expect(() => JSON.parse(result.content)).not.toThrow();
      });
    });

    it("should not remove file paths that are valid array elements", () => {
      const input = `{
  "filePaths": [
    "images/validation/OIG4.9HS_X.8.jpeg",
    "docs/example.json"
  ]
}`;

      const result = removeInvalidPrefixes(input);

      // Should not change since these are valid string values, not prefixes
      expect(result.changed).toBe(false);
      expect(result.content).toContain('"images/validation/OIG4.9HS_X.8.jpeg"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});

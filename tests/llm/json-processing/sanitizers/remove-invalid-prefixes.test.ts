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

    it("should remove lowercase stray key-value pairs in arrays", () => {
      const input = `{
  "internalReferences": [
    "org.apache.fineract.portfolio.calendar.domain.Calendar",
    "org.apache.fineract.portfolio.calendar.domain.CalendarFrequencyType",
    "org.apache.fineract.portfolio.calendar.domain.CalendarWeekDaysType",
extra_schema_fields_to_ignore: "['NthDayNameEnum', 'DayNameEnum']",
    "org.apache.fineract.portfolio.common.domain.NthDayType"
  ]
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("extra_schema_fields_to_ignore");
      expect(result.content).toContain('"org.apache.fineract.portfolio.calendar.domain.Calendar"');
      expect(result.content).toContain('"org.apache.fineract.portfolio.common.domain.NthDayType"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern: Single character prefixes before properties", () => {
    it("should remove single character prefix before property", () => {
      const input = `{
  "externalReferences": [
    "io.restassured.builder.RequestSpecBuilder",
a   "jakarta.persistence.Table",
    "jakarta.persistence.Transient"
  ]
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"jakarta.persistence.Table"');
      expect(result.content).not.toContain('a   "jakarta.persistence.Table"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle single character with multiple spaces", () => {
      const input = `{
  "properties": {
s     "name": "value"
  }
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "value"');
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });

  describe("Pattern: Trailing stray text after closing brace", () => {
    it("should remove trailing stray text like cURL:", () => {
      const input = `{
  "name": "TestClass",
  "kind": "CLASS"
}cURL:`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"kind": "CLASS"');
      expect(result.content).not.toContain("cURL:");
      expect(result.content.trim().endsWith("}")).toBe(true);
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should handle trailing text with colon", () => {
      const input = `{
  "name": "TestClass"
}someText:`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(true);
      expect(result.content.trim().endsWith("}")).toBe(true);
      expect(result.content).not.toContain("someText:");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });

    it("should not remove text that's part of valid JSON", () => {
      const input = `{
  "description": "This is valid text with cURL: mentioned"
}`;

      const result = removeInvalidPrefixes(input);

      expect(result.changed).toBe(false);
      expect(result.content).toContain("cURL:");
      expect(() => JSON.parse(result.content)).not.toThrow();
    });
  });
});

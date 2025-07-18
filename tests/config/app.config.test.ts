import { appConfig } from "../../src/config/app.config";

describe("App Configuration", () => {
  describe("appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS", () => {
    test("should be a Map instance", () => {
      expect(appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS).toBeInstanceOf(Map);
    });

    test("should contain expected file suffix mappings", () => {
      const expectedMappings = [
        ["java", "java"],
        ["js", "javascript"],
        ["ts", "javascript"],
        ["javascript", "javascript"],
        ["typescript", "javascript"],
        ["ddl", "sql"],
        ["sql", "sql"],
        ["xml", "xml"],
        ["jsp", "jsp"],
        ["markdown", "markdown"],
        ["md", "markdown"],
      ];

      expectedMappings.forEach(([suffix, expected]) => {
        expect(appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.get(suffix)).toBe(expected);
      });
    });
  });
});

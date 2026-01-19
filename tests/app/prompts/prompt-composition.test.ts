import {
  COMMON_FRAGMENTS,
  JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC_FRAGMENTS,
} from "../../../src/app/prompts/sources/fragments";
import { fileTypePromptRegistry } from "../../../src/app/prompts/sources/sources.definitions";

describe("prompt-composition", () => {
  describe("fileTypePromptRegistry", () => {
    it("should use instruction arrays for file types", () => {
      const fileTypes = ["default", "java", "javascript", "sql", "markdown"];
      fileTypes.forEach((fileType) => {
        const config = fileTypePromptRegistry[fileType as keyof typeof fileTypePromptRegistry];
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.contentDesc).toBeDefined();
        expect(typeof config.contentDesc).toBe("string");
      });
    });

    it("should compose Java instructions from fragments", () => {
      const javaInstructions = fileTypePromptRegistry.java.instructions;

      // Instructions are now string array - fragments are embedded within formatted strings
      const allInstructions = javaInstructions.join(" ");

      expect(allInstructions).toContain(COMMON_FRAGMENTS.PURPOSE);
      expect(allInstructions).toContain(COMMON_FRAGMENTS.IMPLEMENTATION);
      expect(allInstructions).toContain(JAVA_SPECIFIC_FRAGMENTS.INTERNAL_REFS);
      expect(allInstructions).toContain(JAVA_SPECIFIC_FRAGMENTS.EXTERNAL_REFS);

      // Check for DB integration and code quality
      expect(allInstructions).toContain("Database Integration Analysis");
      expect(allInstructions).toContain("Code Quality Analysis");
    });

    it("should compose JavaScript instructions from fragments", () => {
      const jsInstructions = fileTypePromptRegistry.javascript.instructions;

      // Instructions are now string array - fragments are embedded within formatted strings
      const jsAllInstructions = jsInstructions.join(" ");

      expect(jsAllInstructions).toContain(COMMON_FRAGMENTS.PURPOSE);
      expect(jsAllInstructions).toContain(COMMON_FRAGMENTS.IMPLEMENTATION);
      expect(jsAllInstructions).toContain(JAVASCRIPT_SPECIFIC_FRAGMENTS.INTERNAL_REFS);
      expect(jsAllInstructions).toContain(JAVASCRIPT_SPECIFIC_FRAGMENTS.EXTERNAL_REFS);
    });

    it("should compose simple file type instructions from fragments", () => {
      const markdownInstructions = fileTypePromptRegistry.markdown.instructions;
      const sqlInstructions = fileTypePromptRegistry.sql.instructions;

      // Instructions are now string array - fragments are embedded within formatted strings
      const markdownAllInstructions = markdownInstructions.join(" ");
      const sqlAllInstructions = sqlInstructions.join(" ");

      expect(markdownAllInstructions).toContain(COMMON_FRAGMENTS.PURPOSE);
      expect(markdownAllInstructions).toContain(COMMON_FRAGMENTS.IMPLEMENTATION);

      expect(sqlAllInstructions).toContain(COMMON_FRAGMENTS.PURPOSE);
      expect(sqlAllInstructions).toContain(COMMON_FRAGMENTS.IMPLEMENTATION);
    });

    it("should maintain backward compatibility for file types", () => {
      const fileTypes = ["default", "java", "javascript", "sql", "markdown"];

      fileTypes.forEach((fileType) => {
        const config = fileTypePromptRegistry[fileType as keyof typeof fileTypePromptRegistry];
        const instructions = config.instructions;

        // Instructions are now string array

        // All file types should have purpose and implementation
        const instructionText = instructions.join(" ");
        expect(instructionText).toContain("purpose");
        expect(instructionText).toContain("implementation");
      });
    });

    it("should have consistent instruction structure for file types", () => {
      const fileTypes = ["default", "java", "javascript", "sql", "markdown"];

      fileTypes.forEach((fileType) => {
        const config = fileTypePromptRegistry[fileType as keyof typeof fileTypePromptRegistry];
        const instructions = config.instructions;

        // Each instruction point should be a non-empty string
        instructions.forEach((instruction) => {
          expect(typeof instruction).toBe("string");
          expect(instruction.length).toBeGreaterThan(0);
        });
      });
    });

    it("should reuse common fragments appropriately for file types", () => {
      const fileTypesWithCodeQuality = ["java", "javascript"];

      fileTypesWithCodeQuality.forEach((fileType) => {
        const config = fileTypePromptRegistry[fileType as keyof typeof fileTypePromptRegistry];
        const instructions = config.instructions;

        // These file types should use code quality fragments
        const instructionText = instructions.join(" ");
        expect(instructionText).toContain("Code Quality Analysis");
      });
    });

    it("should have language-specific fragments in appropriate file types", () => {
      // Java should use Java-specific fragments
      const javaInstructions = fileTypePromptRegistry.java.instructions;
      const javaAllInstructions = javaInstructions.join(" ");
      expect(javaAllInstructions).toContain(JAVA_SPECIFIC_FRAGMENTS.INTERNAL_REFS);
      expect(javaAllInstructions).toContain(JAVA_SPECIFIC_FRAGMENTS.EXTERNAL_REFS);

      // JavaScript should use JavaScript-specific fragments
      const jsInstructions = fileTypePromptRegistry.javascript.instructions;
      const jsAllInstructions = jsInstructions.join(" ");
      expect(jsAllInstructions).toContain(JAVASCRIPT_SPECIFIC_FRAGMENTS.INTERNAL_REFS);
      expect(jsAllInstructions).toContain(JAVASCRIPT_SPECIFIC_FRAGMENTS.EXTERNAL_REFS);
    });
  });
});

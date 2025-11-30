import { SOURCES_PROMPT_FRAGMENTS } from "../../src/prompts/definitions/fragments";
import { fileTypePromptMetadata } from "../../src/prompts/definitions/sources";

describe("prompt-composition", () => {
  describe("fileTypePromptMetadata", () => {
    it("should use instruction arrays for converted file types", () => {
      const convertedFileTypes = ["default", "java", "javascript", "sql", "markdown"];
      convertedFileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        expect(Array.isArray(metadata.instructions)).toBe(true);
        expect(metadata.instructions.length).toBeGreaterThan(0);
        expect(metadata.template).toBeDefined();
        expect(typeof metadata.template).toBe("string");
      });
    });

    it("should compose Java instructions from fragments", () => {
      const javaInstructions = fileTypePromptMetadata.java.instructions;

      // Instructions are now string array - fragments are embedded within formatted strings
      const allInstructions = javaInstructions.join(" ");

      expect(allInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(allInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
      expect(allInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS);
      expect(allInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS);

      // Check for DB integration and code quality
      expect(allInstructions).toContain("Database Integration Analysis");
      expect(allInstructions).toContain("Code Quality Analysis");
    });

    it("should compose JavaScript instructions from fragments", () => {
      const jsInstructions = fileTypePromptMetadata.javascript.instructions;

      // Instructions are now string array - fragments are embedded within formatted strings
      const jsAllInstructions = jsInstructions.join(" ");

      expect(jsAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(jsAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
      expect(jsAllInstructions).toContain(
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS,
      );
      expect(jsAllInstructions).toContain(
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS,
      );
    });

    it("should compose simple file type instructions from fragments", () => {
      const markdownInstructions = fileTypePromptMetadata.markdown.instructions;
      const sqlInstructions = fileTypePromptMetadata.sql.instructions;

      // Instructions are now string array - fragments are embedded within formatted strings
      const markdownAllInstructions = markdownInstructions.join(" ");
      const sqlAllInstructions = sqlInstructions.join(" ");

      expect(markdownAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(markdownAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);

      expect(sqlAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(sqlAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
    });

    it("should maintain backward compatibility for converted types", () => {
      const convertedFileTypes = ["default", "java", "javascript", "sql", "markdown"];

      convertedFileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        const instructions = metadata.instructions;

        // Instructions are now string array
        const instructionArray = instructions;

        // All file types should have purpose and implementation
        const instructionText = instructionArray.join(" ");
        expect(instructionText).toContain("purpose");
        expect(instructionText).toContain("implementation");
      });
    });

    it("should have consistent instruction structure for converted types", () => {
      const convertedFileTypes = ["default", "java", "javascript", "sql", "markdown"];

      convertedFileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        const instructions = metadata.instructions;

        // Instructions are now string array
        const instructionArray = instructions;

        // Each instruction point should be a non-empty string
        instructionArray.forEach((instruction) => {
          expect(typeof instruction).toBe("string");
          expect(instruction.length).toBeGreaterThan(0);
        });
      });
    });

    it("should reuse common fragments appropriately for converted types", () => {
      const fileTypesWithCodeQuality = ["java", "javascript"];

      fileTypesWithCodeQuality.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        const instructions = metadata.instructions;

        // Instructions are now string array
        const instructionArray = instructions;

        // These file types should use code quality fragments
        const instructionText = instructionArray.join(" ");
        expect(instructionText).toContain("Code Quality Analysis");
      });
    });

    it("should have language-specific fragments in appropriate file types", () => {
      // Java should use Java-specific fragments
      const javaInstructions = fileTypePromptMetadata.java.instructions;
      const javaAllInstructions = javaInstructions.join(" ");
      expect(javaAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS);
      expect(javaAllInstructions).toContain(SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS);

      // JavaScript should use JavaScript-specific fragments
      const jsInstructions = fileTypePromptMetadata.javascript.instructions;
      const jsAllInstructions = jsInstructions.join(" ");
      expect(jsAllInstructions).toContain(
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS,
      );
      expect(jsAllInstructions).toContain(
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS,
      );
    });
  });
});

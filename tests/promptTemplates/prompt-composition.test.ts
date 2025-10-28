import { PROMPT_FRAGMENTS } from "../../src/prompts/templates/prompt-fragments";
import { fileTypePromptMetadata } from "../../src/prompts/templates/sources.prompts";

describe("prompt-composition", () => {
  describe("fileTypePromptMetadata", () => {
    it("should use instruction arrays for converted file types", () => {
      const convertedFileTypes = ["default", "java", "javascript", "sql", "markdown"];
      convertedFileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        expect(Array.isArray(metadata.instructions)).toBe(true);
        expect(metadata.instructions.length).toBeGreaterThan(0);
      });
    });

    it("should compose Java instructions from fragments", () => {
      const javaInstructions = fileTypePromptMetadata.java.instructions;

      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS);
      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS);
      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO);
      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.CODE_QUALITY.INTRO);
    });

    it("should compose JavaScript instructions from fragments", () => {
      const jsInstructions = fileTypePromptMetadata.javascript.instructions;

      expect(jsInstructions).toContain(PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(jsInstructions).toContain(PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
      expect(jsInstructions).toContain(PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS);
      expect(jsInstructions).toContain(PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS);
    });

    it("should compose simple file type instructions from fragments", () => {
      const markdownInstructions = fileTypePromptMetadata.markdown.instructions;
      const sqlInstructions = fileTypePromptMetadata.sql.instructions;

      expect(markdownInstructions).toContain(PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(markdownInstructions).toContain(PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);

      expect(sqlInstructions).toContain(PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(sqlInstructions).toContain(PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
    });

    it("should maintain backward compatibility for converted types", () => {
      const convertedFileTypes = ["default", "java", "javascript", "sql", "markdown"];

      convertedFileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        const instructions = metadata.instructions;

        // All file types should have purpose and implementation
        const instructionText = instructions.join(" ");
        expect(instructionText).toContain("purpose");
        expect(instructionText).toContain("implementation");
      });
    });

    it("should have consistent instruction structure for converted types", () => {
      const convertedFileTypes = ["default", "java", "javascript", "sql", "markdown"];

      convertedFileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        const instructions = metadata.instructions;

        // Each instruction should be a non-empty string
        instructions.forEach((instruction) => {
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

        // These file types should use code quality fragments
        const instructionText = instructions.join(" ");
        expect(instructionText).toContain("Code Quality Analysis");
      });
    });

    it("should have language-specific fragments in appropriate file types", () => {
      // Java should use Java-specific fragments
      const javaInstructions = fileTypePromptMetadata.java.instructions;
      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS);
      expect(javaInstructions).toContain(PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS);

      // JavaScript should use JavaScript-specific fragments
      const jsInstructions = fileTypePromptMetadata.javascript.instructions;
      expect(jsInstructions).toContain(PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS);
      expect(jsInstructions).toContain(PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS);
    });
  });
});

import { SOURCES_FRAGMENTS } from "../../src/prompts/definitions/fragments";
import { fileTypePromptMetadata } from "../../src/prompts/definitions/sources";
import { InstructionSection } from "../../src/prompts/prompt.types";

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

      // Instructions are now structured sections - flatten to check content
      const instructionArray = javaInstructions.flatMap(
        (section: InstructionSection) => section.points,
      );

      expect(instructionArray).toContain(SOURCES_FRAGMENTS.COMMON.PURPOSE);
      expect(instructionArray).toContain(SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION);
      expect(instructionArray).toContain(SOURCES_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS);
      expect(instructionArray).toContain(SOURCES_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS);

      // Check for DB integration and code quality by flattening all points
      const allInstructions = instructionArray.join(" ");
      expect(allInstructions).toContain("Database Integration Analysis");
      expect(allInstructions).toContain("Code Quality Analysis");
    });

    it("should compose JavaScript instructions from fragments", () => {
      const jsInstructions = fileTypePromptMetadata.javascript.instructions;

      // Instructions are now structured sections - flatten to check content
      const jsInstructionArray = jsInstructions.flatMap(
        (section: InstructionSection) => section.points,
      );

      expect(jsInstructionArray).toContain(SOURCES_FRAGMENTS.COMMON.PURPOSE);
      expect(jsInstructionArray).toContain(SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION);
      expect(jsInstructionArray).toContain(SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS);
      expect(jsInstructionArray).toContain(SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS);
    });

    it("should compose simple file type instructions from fragments", () => {
      const markdownInstructions = fileTypePromptMetadata.markdown.instructions;
      const sqlInstructions = fileTypePromptMetadata.sql.instructions;

      // Instructions are now structured sections - flatten to check content
      const markdownInstructionArray = markdownInstructions.flatMap(
        (section: InstructionSection) => section.points,
      );

      const sqlInstructionArray = sqlInstructions.flatMap(
        (section: InstructionSection) => section.points,
      );

      expect(markdownInstructionArray).toContain(SOURCES_FRAGMENTS.COMMON.PURPOSE);
      expect(markdownInstructionArray).toContain(SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION);

      expect(sqlInstructionArray).toContain(SOURCES_FRAGMENTS.COMMON.PURPOSE);
      expect(sqlInstructionArray).toContain(SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION);
    });

    it("should maintain backward compatibility for converted types", () => {
      const convertedFileTypes = ["default", "java", "javascript", "sql", "markdown"];

      convertedFileTypes.forEach((fileType) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];
        const instructions = metadata.instructions;

        // Convert to string array if needed
        const instructionArray = instructions.flatMap(
          (section: InstructionSection) => section.points,
        );

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

        // Convert to string array if needed
        const instructionArray = instructions.flatMap(
          (section: InstructionSection) => section.points,
        );

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

        // Convert to string array if needed
        const instructionArray = instructions.flatMap(
          (section: InstructionSection) => section.points,
        );

        // These file types should use code quality fragments
        const instructionText = instructionArray.join(" ");
        expect(instructionText).toContain("Code Quality Analysis");
      });
    });

    it("should have language-specific fragments in appropriate file types", () => {
      // Java should use Java-specific fragments
      const javaInstructions = fileTypePromptMetadata.java.instructions;
      const javaInstructionArray = javaInstructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      expect(javaInstructionArray).toContain(SOURCES_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS);
      expect(javaInstructionArray).toContain(SOURCES_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS);

      // JavaScript should use JavaScript-specific fragments
      const jsInstructions = fileTypePromptMetadata.javascript.instructions;
      const jsInstructionArray = jsInstructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      expect(jsInstructionArray).toContain(SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS);
      expect(jsInstructionArray).toContain(SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS);
    });
  });
});

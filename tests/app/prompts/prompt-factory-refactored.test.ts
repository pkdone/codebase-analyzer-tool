import {
  buildInstructionBlock,
  INSTRUCTION_SECTION_TITLES,
} from "../../../src/app/prompts/sources/source-instruction-utils";

describe("Prompt Factory Refactoring Tests", () => {
  describe("buildInstructionBlock in instruction-utils", () => {
    test("should build instruction block with title and parts", () => {
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        "Extract name",
        "Extract kind",
      );

      expect(result).toBe("__Basic Information__\nExtract name\nExtract kind");
    });

    test("should handle array of parts", () => {
      const parts = ["First instruction", "Second instruction", "Third instruction"];
      const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS, parts);

      expect(result).toBe(
        "__Instructions__\nFirst instruction\nSecond instruction\nThird instruction",
      );
    });

    test("should flatten mixed string and array parts", () => {
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
        "Single string",
        ["Array item 1", "Array item 2"],
        "Another single string",
      );

      expect(result).toBe(
        "__Instructions__\nSingle string\nArray item 1\nArray item 2\nAnother single string",
      );
    });

    test("should handle empty parts array", () => {
      const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS);

      expect(result).toBe("__Instructions__");
    });

    test("should handle title with spaces", () => {
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        "Instruction 1",
      );

      expect(result).toBe("__Database Integration Analysis__\nInstruction 1");
    });

    test("should work with readonly string arrays", () => {
      const readonlyParts: readonly string[] = ["Part 1", "Part 2"] as const;
      const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS, readonlyParts);

      expect(result).toBe("__Instructions__\nPart 1\nPart 2");
    });

    test("should be accessible from source-instruction-utils module", () => {
      // This test verifies that buildInstructionBlock is properly exported
      // from source-instruction-utils (co-located with INSTRUCTION_SECTION_TITLES)
      expect(typeof buildInstructionBlock).toBe("function");
    });
  });
});

import {
  buildInstructionBlock,
  INSTRUCTION_SECTION_TITLES,
} from "../../../src/app/prompts/sources/definitions/source-config-factories";

/**
 * Tests for buildInstructionBlock function.
 * Note: This function is now in instruction-utils.ts alongside INSTRUCTION_SECTION_TITLES.
 */
describe("buildInstructionBlock", () => {
  describe("basic functionality", () => {
    test("should format a title with a single string part", () => {
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        "Extract the name",
      );
      expect(result).toBe("__Basic Information__\nExtract the name");
    });

    test("should format a title with multiple string parts", () => {
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES,
        "Internal refs",
        "External refs",
      );
      expect(result).toBe("__References__\nInternal refs\nExternal refs");
    });

    test("should format a title with array parts", () => {
      const parts = ["Part 1", "Part 2", "Part 3"] as const;
      const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS, parts);
      expect(result).toBe("__Instructions__\nPart 1\nPart 2\nPart 3");
    });

    test("should format a title with mixed string and array parts", () => {
      const arrayParts = ["Array 1", "Array 2"] as const;
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
        "String part",
        arrayParts,
        "Another string",
      );
      expect(result).toBe("__Instructions__\nString part\nArray 1\nArray 2\nAnother string");
    });
  });

  describe("edge cases", () => {
    test("should handle empty arrays", () => {
      const emptyArray: readonly string[] = [];
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
        emptyArray,
        "After empty",
      );
      expect(result).toBe("__Instructions__\nAfter empty");
    });

    test("should handle single element arrays", () => {
      const singleArray = ["Only one"] as const;
      const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS, singleArray);
      expect(result).toBe("__Instructions__\nOnly one");
    });

    test("should handle no parts (only title)", () => {
      const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS);
      expect(result).toBe("__Instructions__");
    });

    test("should handle empty strings", () => {
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
        "",
        "Non-empty",
      );
      expect(result).toBe("__Instructions__\n\nNon-empty");
    });

    test("should handle multiple empty arrays", () => {
      const empty1: readonly string[] = [];
      const empty2: readonly string[] = [];
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
        empty1,
        empty2,
        "Content",
      );
      expect(result).toBe("__Instructions__\nContent");
    });
  });

  describe("real-world usage patterns", () => {
    test("should match the pattern used in sources.config.ts", () => {
      const baseInstructions = ["The name of the main class", "Its kind", "Its namespace"] as const;
      const purpose = "A detailed definition of its purpose";
      const implementation = "A detailed definition of its implementation";

      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        baseInstructions,
        purpose,
        implementation,
      );

      expect(result).toContain("__Basic Information__");
      expect(result).toContain("The name of the main class");
      expect(result).toContain("Its kind");
      expect(result).toContain("Its namespace");
      expect(result).toContain(purpose);
      expect(result).toContain(implementation);
    });

    test("should handle complex nested structures", () => {
      const array1 = ["Item 1", "Item 2"] as const;
      const array2 = ["Item 3", "Item 4", "Item 5"] as const;
      const result = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
        "Intro text",
        array1,
        "Middle text",
        array2,
        "Conclusion",
      );

      const lines = result.split("\n");
      expect(lines[0]).toBe("__Instructions__");
      expect(lines[1]).toBe("Intro text");
      expect(lines[2]).toBe("Item 1");
      expect(lines[3]).toBe("Item 2");
      expect(lines[4]).toBe("Middle text");
      expect(lines[5]).toBe("Item 3");
      expect(lines[6]).toBe("Item 4");
      expect(lines[7]).toBe("Item 5");
      expect(lines[8]).toBe("Conclusion");
    });
  });
});

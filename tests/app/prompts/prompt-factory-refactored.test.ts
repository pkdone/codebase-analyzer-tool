import { buildInstructionBlock } from "../../../src/app/prompts/definitions/prompt-factory";

describe("Prompt Factory Refactoring Tests", () => {
  describe("buildInstructionBlock moved from prompt-utils", () => {
    test("should build instruction block with title and parts", () => {
      const result = buildInstructionBlock("Basic Info", "Extract name", "Extract kind");

      expect(result).toBe("__Basic Info__\nExtract name\nExtract kind");
    });

    test("should handle array of parts", () => {
      const parts = ["First instruction", "Second instruction", "Third instruction"];
      const result = buildInstructionBlock("Title", parts);

      expect(result).toBe("__Title__\nFirst instruction\nSecond instruction\nThird instruction");
    });

    test("should flatten mixed string and array parts", () => {
      const result = buildInstructionBlock(
        "Mixed",
        "Single string",
        ["Array item 1", "Array item 2"],
        "Another single string",
      );

      expect(result).toBe(
        "__Mixed__\nSingle string\nArray item 1\nArray item 2\nAnother single string",
      );
    });

    test("should handle empty parts array", () => {
      const result = buildInstructionBlock("Empty");

      expect(result).toBe("__Empty__");
    });

    test("should handle title with spaces", () => {
      const result = buildInstructionBlock("Database Integration Analysis", "Instruction 1");

      expect(result).toBe("__Database Integration Analysis__\nInstruction 1");
    });

    test("should work with readonly string arrays", () => {
      const readonlyParts: readonly string[] = ["Part 1", "Part 2"] as const;
      const result = buildInstructionBlock("Readonly", readonlyParts);

      expect(result).toBe("__Readonly__\nPart 1\nPart 2");
    });

    test("should be accessible from prompt-factory module", () => {
      // This test verifies that buildInstructionBlock is properly exported
      // from prompt-factory after being moved from prompt-utils
      expect(typeof buildInstructionBlock).toBe("function");
    });
  });
});

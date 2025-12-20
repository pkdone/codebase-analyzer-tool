import {
  INSTRUCTION_SECTION_TITLES,
  buildInstructionBlock,
  type InstructionSectionTitle,
} from "../../../../src/app/prompts/definitions/instruction-utils";

describe("instruction-utils", () => {
  describe("INSTRUCTION_SECTION_TITLES", () => {
    it("should export INSTRUCTION_SECTION_TITLES as a const object", () => {
      expect(INSTRUCTION_SECTION_TITLES).toBeDefined();
      expect(typeof INSTRUCTION_SECTION_TITLES).toBe("object");
      // 'as const' provides compile-time immutability via TypeScript's readonly types
      // Runtime immutability is not enforced (no Object.freeze)
    });

    it("should contain all expected section title constants", () => {
      const expectedKeys = [
        "BASIC_INFO",
        "CLASS_INFO",
        "MODULE_INFO",
        "PURPOSE_AND_IMPLEMENTATION",
        "REFERENCES",
        "REFERENCES_AND_DEPS",
        "PUBLIC_API",
        "USER_INPUT_FIELDS",
        "INTEGRATION_POINTS",
        "DATABASE_INTEGRATION",
        "DATABASE_INTEGRATION_ANALYSIS",
        "CODE_QUALITY_METRICS",
        "UI_FRAMEWORK_DETECTION",
        "DEPENDENCIES",
        "DATABASE_OBJECTS",
        "SCHEDULED_JOBS",
      ];

      expectedKeys.forEach((key) => {
        expect(INSTRUCTION_SECTION_TITLES).toHaveProperty(key);
        expect(
          typeof INSTRUCTION_SECTION_TITLES[key as keyof typeof INSTRUCTION_SECTION_TITLES],
        ).toBe("string");
      });
    });

    it("should have human-readable values for all title constants", () => {
      expect(INSTRUCTION_SECTION_TITLES.BASIC_INFO).toBe("Basic Information");
      expect(INSTRUCTION_SECTION_TITLES.CLASS_INFO).toBe("Class Information");
      expect(INSTRUCTION_SECTION_TITLES.MODULE_INFO).toBe("Module Information");
      expect(INSTRUCTION_SECTION_TITLES.PURPOSE_AND_IMPLEMENTATION).toBe(
        "Purpose and Implementation",
      );
      expect(INSTRUCTION_SECTION_TITLES.REFERENCES).toBe("References");
      expect(INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS).toBe("References and Dependencies");
      expect(INSTRUCTION_SECTION_TITLES.PUBLIC_API).toBe("Public API");
      expect(INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS).toBe("User Input Fields");
      expect(INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS).toBe("Integration Points");
      expect(INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION).toBe("Database Integration");
      expect(INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS).toBe(
        "Database Integration Analysis",
      );
      expect(INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS).toBe("Code Quality Metrics");
      expect(INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION).toBe("User Interface Framework");
      expect(INSTRUCTION_SECTION_TITLES.DEPENDENCIES).toBe("Dependencies");
      expect(INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS).toBe("Database Objects");
      expect(INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS).toBe("Scheduled Jobs");
    });

    it("should have exactly 16 section title constants", () => {
      // 'as const' provides compile-time immutability via TypeScript
      // but runtime modification is possible (no Object.freeze)
      // This test verifies the expected number of constants exists
      expect(Object.keys(INSTRUCTION_SECTION_TITLES)).toHaveLength(16);
    });
  });

  describe("InstructionSectionTitle type", () => {
    it("should accept valid section title values", () => {
      // These assignments verify the type is correctly narrowed
      const title1: InstructionSectionTitle = "Basic Information";
      const title2: InstructionSectionTitle = "References and Dependencies";
      const title3: InstructionSectionTitle = "Code Quality Metrics";

      expect(title1).toBe(INSTRUCTION_SECTION_TITLES.BASIC_INFO);
      expect(title2).toBe(INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS);
      expect(title3).toBe(INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS);
    });
  });

  describe("buildInstructionBlock", () => {
    describe("basic functionality", () => {
      it("should format a title with double underscores", () => {
        const result = buildInstructionBlock("Basic Info");
        expect(result).toBe("__Basic Info__");
      });

      it("should format a title with a single string part", () => {
        const result = buildInstructionBlock("Basic Info", "Extract the name");
        expect(result).toBe("__Basic Info__\nExtract the name");
      });

      it("should format a title with multiple string parts", () => {
        const result = buildInstructionBlock("References", "Internal refs", "External refs");
        expect(result).toBe("__References__\nInternal refs\nExternal refs");
      });

      it("should format a title with array parts", () => {
        const parts = ["Part 1", "Part 2", "Part 3"] as const;
        const result = buildInstructionBlock("Section", parts);
        expect(result).toBe("__Section__\nPart 1\nPart 2\nPart 3");
      });

      it("should format a title with mixed string and array parts", () => {
        const arrayParts = ["Array 1", "Array 2"] as const;
        const result = buildInstructionBlock(
          "Mixed Section",
          "String part",
          arrayParts,
          "Another string",
        );
        expect(result).toBe("__Mixed Section__\nString part\nArray 1\nArray 2\nAnother string");
      });
    });

    describe("edge cases", () => {
      it("should handle empty arrays", () => {
        const emptyArray: readonly string[] = [];
        const result = buildInstructionBlock("Title", emptyArray, "After empty");
        expect(result).toBe("__Title__\nAfter empty");
      });

      it("should handle single element arrays", () => {
        const singleArray = ["Only one"] as const;
        const result = buildInstructionBlock("Title", singleArray);
        expect(result).toBe("__Title__\nOnly one");
      });

      it("should handle no parts (only title)", () => {
        const result = buildInstructionBlock("Title");
        expect(result).toBe("__Title__");
      });

      it("should handle empty strings in parts", () => {
        const result = buildInstructionBlock("Title", "", "Non-empty");
        expect(result).toBe("__Title__\n\nNon-empty");
      });

      it("should handle multiple empty arrays", () => {
        const empty1: readonly string[] = [];
        const empty2: readonly string[] = [];
        const result = buildInstructionBlock("Title", empty1, empty2, "Content");
        expect(result).toBe("__Title__\nContent");
      });

      it("should handle titles with special characters", () => {
        const result = buildInstructionBlock("Title (with) [brackets]", "Content");
        expect(result).toBe("__Title (with) [brackets]__\nContent");
      });

      it("should handle multi-line content in parts", () => {
        const multiLine = "Line 1\nLine 2\nLine 3";
        const result = buildInstructionBlock("Title", multiLine);
        expect(result).toBe("__Title__\nLine 1\nLine 2\nLine 3");
      });
    });

    describe("integration with INSTRUCTION_SECTION_TITLES", () => {
      it("should work with INSTRUCTION_SECTION_TITLES constants", () => {
        const result = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.BASIC_INFO,
          "Extract the name",
          "Extract the type",
        );
        expect(result).toBe("__Basic Information__\nExtract the name\nExtract the type");
      });

      it("should match the pattern used in sources.config.ts", () => {
        const baseInstructions = [
          "The name of the main class",
          "Its kind",
          "Its namespace",
        ] as const;
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

      it("should match the pattern used in app-summaries.config.ts", () => {
        const result = buildInstructionBlock(
          "Instructions",
          "A detailed description of the entire application",
        );
        expect(result).toBe("__Instructions__\nA detailed description of the entire application");
      });
    });

    describe("real-world usage patterns", () => {
      it("should handle complex nested structures", () => {
        const array1 = ["Item 1", "Item 2"] as const;
        const array2 = ["Item 3", "Item 4", "Item 5"] as const;
        const result = buildInstructionBlock(
          "Complex Section",
          "Intro text",
          array1,
          "Middle text",
          array2,
          "Conclusion",
        );

        const lines = result.split("\n");
        expect(lines[0]).toBe("__Complex Section__");
        expect(lines[1]).toBe("Intro text");
        expect(lines[2]).toBe("Item 1");
        expect(lines[3]).toBe("Item 2");
        expect(lines[4]).toBe("Middle text");
        expect(lines[5]).toBe("Item 3");
        expect(lines[6]).toBe("Item 4");
        expect(lines[7]).toBe("Item 5");
        expect(lines[8]).toBe("Conclusion");
      });

      it("should produce consistent output for the same input", () => {
        const input1 = buildInstructionBlock("Test", "A", "B", "C");
        const input2 = buildInstructionBlock("Test", "A", "B", "C");
        expect(input1).toBe(input2);
      });

      it("should handle readonly string arrays from as const", () => {
        const readonlyArray = ["Read", "Only", "Array"] as const;
        const result = buildInstructionBlock("Test", readonlyArray);
        expect(result).toBe("__Test__\nRead\nOnly\nArray");
      });
    });
  });

  describe("module organization", () => {
    it("should co-locate buildInstructionBlock with INSTRUCTION_SECTION_TITLES", () => {
      // This test verifies that both exports come from the same module
      // which improves code organization
      expect(typeof buildInstructionBlock).toBe("function");
      expect(typeof INSTRUCTION_SECTION_TITLES).toBe("object");
    });

    it("should provide both named exports for easy destructuring", () => {
      // The import at the top of this file already demonstrates this works
      // This test verifies both exports are functions/objects as expected
      expect(INSTRUCTION_SECTION_TITLES).toBeDefined();
      expect(buildInstructionBlock).toBeDefined();
      expect(Object.keys(INSTRUCTION_SECTION_TITLES).length).toBeGreaterThan(0);
    });
  });
});

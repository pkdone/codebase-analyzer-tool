import {
  INSTRUCTION_SECTION_TITLES,
  buildInstructionBlock,
  type InstructionSectionTitle,
  createDbMechanismInstructions,
} from "../../../../src/app/prompts/utils/instruction-utils";

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
        "INSTRUCTIONS",
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
      expect(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS).toBe("Instructions");
    });

    it("should have exactly 17 section title constants", () => {
      // 'as const' provides compile-time immutability via TypeScript
      // but runtime modification is possible (no Object.freeze)
      // This test verifies the expected number of constants exists
      expect(Object.keys(INSTRUCTION_SECTION_TITLES)).toHaveLength(17);
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

    it("should accept InstructionSectionTitle type in buildInstructionBlock", () => {
      const title: InstructionSectionTitle = INSTRUCTION_SECTION_TITLES.BASIC_INFO;
      const result = buildInstructionBlock(title, "test");
      expect(result).toContain("__Basic Information__");
    });

    it("should accept all valid title constants", () => {
      const validTitles = Object.values(INSTRUCTION_SECTION_TITLES);
      validTitles.forEach((title) => {
        expect(() => buildInstructionBlock(title, "test")).not.toThrow();
        const result = buildInstructionBlock(title, "test");
        expect(result).toContain(`__${title}__`);
      });
    });
  });

  describe("buildInstructionBlock", () => {
    describe("basic functionality", () => {
      it("should format a title with double underscores", () => {
        const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.BASIC_INFO);
        expect(result).toBe("__Basic Information__");
      });

      it("should format a title with a single string part", () => {
        const result = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.BASIC_INFO,
          "Extract the name",
        );
        expect(result).toBe("__Basic Information__\nExtract the name");
      });

      it("should format a title with multiple string parts", () => {
        const result = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.REFERENCES,
          "Internal refs",
          "External refs",
        );
        expect(result).toBe("__References__\nInternal refs\nExternal refs");
      });

      it("should format a title with array parts", () => {
        const parts = ["Part 1", "Part 2", "Part 3"] as const;
        const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS, parts);
        expect(result).toBe("__Instructions__\nPart 1\nPart 2\nPart 3");
      });

      it("should format a title with mixed string and array parts", () => {
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
      it("should handle empty arrays", () => {
        const emptyArray: readonly string[] = [];
        const result = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
          emptyArray,
          "After empty",
        );
        expect(result).toBe("__Instructions__\nAfter empty");
      });

      it("should handle single element arrays", () => {
        const singleArray = ["Only one"] as const;
        const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS, singleArray);
        expect(result).toBe("__Instructions__\nOnly one");
      });

      it("should handle no parts (only title)", () => {
        const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS);
        expect(result).toBe("__Instructions__");
      });

      it("should handle empty strings in parts", () => {
        const result = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
          "",
          "Non-empty",
        );
        expect(result).toBe("__Instructions__\n\nNon-empty");
      });

      it("should handle multiple empty arrays", () => {
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

      it("should handle titles with special characters", () => {
        const result = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
          "Content",
        );
        expect(result).toBe("__References and Dependencies__\nContent");
      });

      it("should handle multi-line content in parts", () => {
        const multiLine = "Line 1\nLine 2\nLine 3";
        const result = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS, multiLine);
        expect(result).toBe("__Instructions__\nLine 1\nLine 2\nLine 3");
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
          INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
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

      it("should produce consistent output for the same input", () => {
        const input1 = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
          "A",
          "B",
          "C",
        );
        const input2 = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
          "A",
          "B",
          "C",
        );
        expect(input1).toBe(input2);
      });

      it("should handle readonly string arrays from as const", () => {
        const readonlyArray = ["Read", "Only", "Array"] as const;
        const result = buildInstructionBlock(
          INSTRUCTION_SECTION_TITLES.INSTRUCTIONS,
          readonlyArray,
        );
        expect(result).toBe("__Instructions__\nRead\nOnly\nArray");
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

  describe("createDbMechanismInstructions", () => {
    describe("basic functionality", () => {
      it("should combine prefix, examples, and suffix with newlines", () => {
        const examples = [
          "      - Example 1 => mechanism: 'TEST1'",
          "      - Example 2 => mechanism: 'TEST2'",
        ] as const;
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("mechanism: If any of the following are true");
        expect(result).toContain("Example 1");
        expect(result).toContain("Example 2");
        expect(result).toContain("mechanism: 'NONE'");
        expect(result.split("\n").length).toBe(4); // prefix + 2 examples + suffix
      });

      it("should include additional note when provided", () => {
        const examples = ["      - Example => mechanism: 'TEST'"] as const;
        const additionalNote = "    (note: this is a test note)";
        const result = createDbMechanismInstructions(examples, additionalNote);

        expect(result).toContain("mechanism: If any of the following are true");
        expect(result).toContain("Example");
        expect(result).toContain("mechanism: 'NONE'");
        expect(result).toContain(additionalNote);
        expect(result.split("\n").length).toBe(4); // prefix + example + suffix + note
      });

      it("should handle empty examples array", () => {
        const examples: readonly string[] = [];
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("mechanism: If any of the following are true");
        expect(result).toContain("mechanism: 'NONE'");
        expect(result.split("\n").length).toBe(2); // prefix + suffix only
      });

      it("should handle single example", () => {
        const examples = ["      - Single example => mechanism: 'SINGLE'"] as const;
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("mechanism: If any of the following are true");
        expect(result).toContain("Single example");
        expect(result).toContain("mechanism: 'NONE'");
        expect(result.split("\n").length).toBe(3); // prefix + example + suffix
      });

      it("should handle multiple examples", () => {
        const examples = [
          "      - Example 1 => mechanism: 'TEST1'",
          "      - Example 2 => mechanism: 'TEST2'",
          "      - Example 3 => mechanism: 'TEST3'",
          "      - Example 4 => mechanism: 'TEST4'",
        ] as const;
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("mechanism: If any of the following are true");
        expect(result).toContain("Example 1");
        expect(result).toContain("Example 2");
        expect(result).toContain("Example 3");
        expect(result).toContain("Example 4");
        expect(result).toContain("mechanism: 'NONE'");
        expect(result.split("\n").length).toBe(6); // prefix + 4 examples + suffix
      });
    });

    describe("edge cases", () => {
      it("should handle examples with special characters", () => {
        const examples = ["      - Example with 'quotes' => mechanism: 'QUOTED'"] as const;
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("Example with 'quotes'");
        expect(result).toContain("mechanism: 'QUOTED'");
      });

      it("should handle additional note with newlines", () => {
        const examples = ["      - Example => mechanism: 'TEST'"] as const;
        const additionalNote = "    (note: line 1\n    line 2)";
        const result = createDbMechanismInstructions(examples, additionalNote);

        expect(result).toContain("line 1");
        expect(result).toContain("line 2");
      });

      it("should preserve exact formatting of examples", () => {
        const examples = ["      - Uses JDBC => mechanism: 'JDBC'"] as const;
        const result = createDbMechanismInstructions(examples);

        const lines = result.split("\n");
        expect(lines[1]).toBe("      - Uses JDBC => mechanism: 'JDBC'");
      });
    });

    describe("integration with constants", () => {
      it("should use the base prefix in output", () => {
        const examples = ["      - Test => mechanism: 'TEST'"] as const;
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("mechanism: If any of the following are true");
        expect(result.startsWith("    - mechanism: If any of the following are true")).toBe(true);
      });

      it("should use the base suffix in output", () => {
        const examples = ["      - Test => mechanism: 'TEST'"] as const;
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("mechanism: 'NONE'");
        expect(
          result.endsWith(
            "      - Otherwise, if the code does not use a database => mechanism: 'NONE'",
          ),
        ).toBe(true);
      });

      it("should place suffix after examples even with additional note", () => {
        const examples = ["      - Test => mechanism: 'TEST'"] as const;
        const additionalNote = "    (test note)";
        const result = createDbMechanismInstructions(examples, additionalNote);

        const lines = result.split("\n");
        const suffixIndex = lines.findIndex((line) => line.includes("mechanism: 'NONE'"));
        const noteIndex = lines.indexOf(additionalNote);

        expect(suffixIndex).toBeLessThan(noteIndex);
      });
    });

    describe("real-world usage patterns", () => {
      it("should match Java DB mechanism mapping pattern", () => {
        const examples = [
          "      - Uses JDBC driver / JDBC API classes => mechanism: 'JDBC'",
          "      - Uses Spring Data repositories => mechanism: 'SPRING-DATA'",
        ] as const;
        const additionalNote =
          "    (note, JMS and JNDI are not related to interacting with a database)";
        const result = createDbMechanismInstructions(examples, additionalNote);

        expect(result).toContain("JDBC");
        expect(result).toContain("SPRING-DATA");
        expect(result).toContain("JMS and JNDI");
        expect(result).toContain("mechanism: 'NONE'");
      });

      it("should match JavaScript DB mechanism mapping pattern", () => {
        const examples = [
          "      - Uses Mongoose schemas/models => mechanism: 'MONGOOSE'",
          "      - Uses Prisma Client => mechanism: 'PRISMA'",
        ] as const;
        const result = createDbMechanismInstructions(examples);

        expect(result).toContain("MONGOOSE");
        expect(result).toContain("PRISMA");
        expect(result).not.toContain("JMS and JNDI");
      });

      it("should produce consistent output for the same input", () => {
        const examples = ["      - Test => mechanism: 'TEST'"] as const;
        const result1 = createDbMechanismInstructions(examples);
        const result2 = createDbMechanismInstructions(examples);

        expect(result1).toBe(result2);
      });
    });
  });
});

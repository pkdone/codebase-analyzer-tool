import {
  buildInstructionBlock,
  createIntroTextTemplate,
} from "../../../src/app/prompts/utils/prompt-utils";

describe("buildInstructionBlock", () => {
  describe("basic functionality", () => {
    test("should format a title with a single string part", () => {
      const result = buildInstructionBlock("Basic Info", "Extract the name");
      expect(result).toBe("__Basic Info__\nExtract the name");
    });

    test("should format a title with multiple string parts", () => {
      const result = buildInstructionBlock("References", "Internal refs", "External refs");
      expect(result).toBe("__References__\nInternal refs\nExternal refs");
    });

    test("should format a title with array parts", () => {
      const parts = ["Part 1", "Part 2", "Part 3"] as const;
      const result = buildInstructionBlock("Section", parts);
      expect(result).toBe("__Section__\nPart 1\nPart 2\nPart 3");
    });

    test("should format a title with mixed string and array parts", () => {
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
    test("should handle empty arrays", () => {
      const emptyArray: readonly string[] = [];
      const result = buildInstructionBlock("Title", emptyArray, "After empty");
      expect(result).toBe("__Title__\nAfter empty");
    });

    test("should handle single element arrays", () => {
      const singleArray = ["Only one"] as const;
      const result = buildInstructionBlock("Title", singleArray);
      expect(result).toBe("__Title__\nOnly one");
    });

    test("should handle no parts (only title)", () => {
      const result = buildInstructionBlock("Title");
      expect(result).toBe("__Title__");
    });

    test("should handle empty strings", () => {
      const result = buildInstructionBlock("Title", "", "Non-empty");
      expect(result).toBe("__Title__\n\nNon-empty");
    });

    test("should handle multiple empty arrays", () => {
      const empty1: readonly string[] = [];
      const empty2: readonly string[] = [];
      const result = buildInstructionBlock("Title", empty1, empty2, "Content");
      expect(result).toBe("__Title__\nContent");
    });
  });

  describe("real-world usage patterns", () => {
    test("should match the pattern used in sources.config.ts", () => {
      const baseInstructions = ["The name of the main class", "Its kind", "Its namespace"] as const;
      const purpose = "A detailed definition of its purpose";
      const implementation = "A detailed definition of its implementation";

      const result = buildInstructionBlock("Basic Info", baseInstructions, purpose, implementation);

      expect(result).toContain("__Basic Info__");
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
  });
});

describe("createIntroTextTemplate", () => {
  describe("basic functionality", () => {
    test("should create intro text with default options", () => {
      const result = createIntroTextTemplate({
        contentDescription: "JVM code",
      });

      expect(result).toBe(
        "Act as a senior developer analyzing the code in a legacy application. Based on the JVM code shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains {{instructionsText}}.",
      );
    });

    test("should create intro text with custom responseDescription", () => {
      const result = createIntroTextTemplate({
        contentDescription: "JVM code",
        responseDescription:
          "the following metadata about the source file:\n\n{{instructionsText}}.",
      });

      expect(result).toContain("Based on the JVM code");
      expect(result).toContain(
        "return a JSON response that contains the following metadata about the source file:",
      );
      expect(result).toContain("{{instructionsText}}.");
    });

    test("should include article 'the' by default", () => {
      const result = createIntroTextTemplate({
        contentDescription: "JavaScript/TypeScript code",
      });

      expect(result).toContain("Based on the JavaScript/TypeScript code shown below");
    });

    test("should omit article 'the' when includeArticle is false", () => {
      const result = createIntroTextTemplate({
        contentDescription: "a set of source file summaries",
        includeArticle: false,
      });

      expect(result).toContain("Based on a set of source file summaries shown below");
      expect(result).not.toContain("Based on the a set of");
    });
  });

  describe("placeholder preservation", () => {
    test("should preserve dataBlockHeader placeholder", () => {
      const result = createIntroTextTemplate({
        contentDescription: "test content",
      });

      expect(result).toContain("'{{dataBlockHeader}}'");
    });

    test("should preserve instructionsText placeholder in default responseDescription", () => {
      const result = createIntroTextTemplate({
        contentDescription: "test content",
      });

      expect(result).toContain("{{instructionsText}}");
    });

    test("should preserve custom placeholders in responseDescription", () => {
      const result = createIntroTextTemplate({
        contentDescription: "test content",
        responseDescription: "{{customPlaceholder}} and {{anotherOne}}",
      });

      expect(result).toContain("{{customPlaceholder}}");
      expect(result).toContain("{{anotherOne}}");
    });
  });

  describe("real-world usage patterns", () => {
    test("should match sources intro text format", () => {
      const result = createIntroTextTemplate({
        contentDescription: "JVM code",
        responseDescription:
          "the following metadata about the source file:\n\n{{instructionsText}}.",
      });

      // Verify structure matches what sources/index.ts expects
      expect(result).toContain(
        "Act as a senior developer analyzing the code in a legacy application",
      );
      expect(result).toContain("Based on the JVM code shown below");
      expect(result).toContain("section marked '{{dataBlockHeader}}'");
      expect(result).toContain("return a JSON response that contains the following metadata");
    });

    test("should match app-summaries intro text format", () => {
      const result = createIntroTextTemplate({
        contentDescription: "a set of source file summaries",
        includeArticle: false,
        responseDescription: "{{instructionsText}}.",
      });

      // Verify structure matches what app-summaries/index.ts expects
      expect(result).toContain(
        "Act as a senior developer analyzing the code in a legacy application",
      );
      expect(result).toContain("Based on a set of source file summaries shown below");
      expect(result).not.toContain("Based on the a set of"); // No double article
      expect(result).toContain("return a JSON response that contains {{instructionsText}}.");
    });

    test("should work with various content descriptions", () => {
      const contentTypes = [
        "JavaScript/TypeScript code",
        "C# code",
        "Python code",
        "Ruby code",
        "database DDL/DML/SQL code",
        "Markdown documentation",
        "XML configuration",
      ];

      contentTypes.forEach((contentDesc) => {
        const result = createIntroTextTemplate({
          contentDescription: contentDesc,
        });

        expect(result).toContain(`Based on the ${contentDesc} shown below`);
        expect(result).toContain("{{dataBlockHeader}}");
        expect(result).toContain("{{instructionsText}}");
      });
    });
  });

  describe("edge cases", () => {
    test("should handle empty content description", () => {
      const result = createIntroTextTemplate({
        contentDescription: "",
      });

      expect(result).toContain("Based on the  shown below");
    });

    test("should handle empty responseDescription", () => {
      const result = createIntroTextTemplate({
        contentDescription: "test",
        responseDescription: "",
      });

      expect(result).toContain("return a JSON response that contains ");
      expect(result).not.toContain("{{instructionsText}}");
    });

    test("should explicitly set includeArticle to true", () => {
      const result = createIntroTextTemplate({
        contentDescription: "test content",
        includeArticle: true,
      });

      expect(result).toContain("Based on the test content");
    });
  });
});

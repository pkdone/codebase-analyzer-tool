import { Prompt, type PromptConfig } from "../../../../src/common/prompts/prompt";
import { z } from "zod";

describe("Prompt", () => {
  const createMockPrompt = (overrides?: Partial<PromptConfig>): Prompt => {
    const config: PromptConfig = {
      contentDesc: "Test intro text template with {{placeholder}}",
      instructions: ["instruction 1", "instruction 2"],
      responseSchema: z.string(),
      dataBlockHeader: "CODE",
      wrapInCodeBlock: false,
      ...overrides,
    };
    return new Prompt(config, "Test template");
  };

  describe("structure", () => {
    it("should have required fields", () => {
      const prompt = new Prompt(
        {
          contentDesc: "Test intro text template",
          instructions: ["test"],
          responseSchema: z.string(),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        "Test template",
      );

      expect(prompt.contentDesc).toBe("Test intro text template");
      expect(prompt.instructions).toEqual(["test"]);
      expect(prompt.responseSchema).toBeDefined();
    });
  });

  describe("compatibility", () => {
    it("should accept readonly string arrays for instructions", () => {
      const prompt = new Prompt(
        {
          contentDesc: "Test intro text template",
          instructions: ["a", "b", "c"],
          responseSchema: z.string(),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        "Test template",
      );

      expect(Array.isArray(prompt.instructions)).toBe(true);
      expect(prompt.instructions.length).toBe(3);
    });

    it("should accept various Zod schema types", () => {
      const stringPrompt = createMockPrompt({ responseSchema: z.string() });
      expect(stringPrompt.responseSchema).toBeDefined();

      const objectPrompt = createMockPrompt({
        responseSchema: z.object({ name: z.string() }),
      });
      expect(objectPrompt.responseSchema).toBeDefined();

      const arrayPrompt = createMockPrompt({ responseSchema: z.array(z.string()) });
      expect(arrayPrompt.responseSchema).toBeDefined();
    });
  });

  describe("usage examples", () => {
    it("should work with source file prompting", () => {
      const sourceFilePrompt = new Prompt(
        {
          contentDesc:
            "Act as a senior developer analyzing the code in an existing application. Based on the JVM code shown below...",
          instructions: [
            "Extract the class name",
            "Extract the purpose",
            "Extract the implementation",
          ],
          responseSchema: z.object({
            name: z.string(),
            purpose: z.string(),
            implementation: z.string(),
          }),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: true,
        },
        "Test template",
      );

      expect(sourceFilePrompt.contentDesc).toContain("JVM code");
      expect(sourceFilePrompt.instructions).toHaveLength(3);
    });

    it("should work with app summary prompting", () => {
      const appSummaryPrompt = new Prompt(
        {
          contentDesc:
            "Act as a senior developer analyzing the code in an existing application. Based on the source files shown below...",
          instructions: ["Extract entities", "Extract bounded contexts"],
          responseSchema: z.object({
            entities: z.array(z.string()),
            boundedContexts: z.array(z.string()),
          }),
          dataBlockHeader: "FILE_SUMMARIES",
          wrapInCodeBlock: false,
        },
        "Test template",
      );

      expect(appSummaryPrompt.contentDesc).toContain("source files");
      expect(appSummaryPrompt.instructions).toHaveLength(2);
      expect(appSummaryPrompt.instructions[0]).toBe("Extract entities");
      expect(appSummaryPrompt.instructions[1]).toBe("Extract bounded contexts");
    });
  });

  describe("immutability", () => {
    it("should support readonly string arrays", () => {
      const readonlyInstructions: readonly string[] = ["instruction 1", "instruction 2"];

      const prompt = new Prompt(
        {
          contentDesc: "Test intro text template",
          instructions: readonlyInstructions,
          responseSchema: z.string(),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        "Test template",
      );

      expect(prompt.instructions).toEqual(["instruction 1", "instruction 2"]);
    });
  });
});

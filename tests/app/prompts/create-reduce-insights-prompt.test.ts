import { z } from "zod";
import { createReduceInsightsPrompt } from "../../../src/app/prompts/prompt-registry";
import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";
import { appSummaryCategorySchemas } from "../../../src/app/components/insights/insights.types";

describe("createReduceInsightsPrompt", () => {
  describe("Factory Function", () => {
    it("should create a valid PromptDefinition", () => {
      const schema = z.object({
        technologies: z.array(z.object({ name: z.string() })),
      });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result).toHaveProperty("label", "Reduce Insights");
      expect(result).toHaveProperty("contentDesc");
      expect(result).toHaveProperty("instructions");
      expect(result).toHaveProperty("responseSchema");
      expect(result).toHaveProperty("template");
      expect(result).toHaveProperty("dataBlockHeader");
      expect(result).toHaveProperty("wrapInCodeBlock");
    });

    it("should include categoryKey in contentDesc", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.contentDesc).toContain("technologies");
      expect(result.contentDesc).toContain("consolidate");
    });

    it("should include categoryKey in instructions", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0]).toContain("technologies");
    });

    it("should use the provided schema as responseSchema", () => {
      const testSchema = z.object({
        boundedContexts: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          }),
        ),
      });
      const result = createReduceInsightsPrompt("boundedContexts", "boundedContexts", testSchema);

      expect(result.responseSchema).toBe(testSchema);
    });

    it("should use BASE_PROMPT_TEMPLATE", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.template).toBe(BASE_PROMPT_TEMPLATE);
    });

    it("should use FRAGMENTED_DATA as dataBlockHeader", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.dataBlockHeader).toBe("FRAGMENTED_DATA");
    });

    it("should not wrap content in code blocks", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.wrapInCodeBlock).toBe(false);
    });
  });

  describe("Integration with appSummaryCategorySchemas", () => {
    // Note: aggregates, entities, and repositories are now nested within boundedContexts
    const categories = [
      "appDescription",
      "technologies",
      "businessProcesses",
      "boundedContexts",
      "potentialMicroservices",
    ] as const;

    it.each(categories)("should work with %s category schema", (category) => {
      const schema = appSummaryCategorySchemas[category];
      const schemaShape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      const categoryKey = Object.keys(schemaShape)[0];

      const result = createReduceInsightsPrompt(category, categoryKey, schema);

      expect(result.responseSchema).toBe(schema);
      expect(result.contentDesc).toContain(categoryKey);
      expect(result.instructions[0]).toContain(categoryKey);
    });
  });

  describe("Type Safety", () => {
    it("should preserve schema type in the returned definition", () => {
      const technologiesSchema = z.object({
        technologies: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          }),
        ),
      });

      const result = createReduceInsightsPrompt("technologies", "technologies", technologiesSchema);

      // The responseSchema should be usable for parsing
      const testData = {
        technologies: [
          { name: "Java", description: "Java language" },
          { name: "MongoDB", description: "NoSQL database" },
        ],
      };

      const parseResult = result.responseSchema.safeParse(testData);
      expect(parseResult.success).toBe(true);
    });

    it("should reject invalid data with the schema", () => {
      const schema = z.object({
        technologies: z.array(z.object({ name: z.string() })),
      });

      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      const invalidData = { technologies: "not an array" };
      const parseResult = result.responseSchema.safeParse(invalidData);
      expect(parseResult.success).toBe(false);
    });
  });

  describe("Different Category Keys", () => {
    it("should handle different categoryKey values correctly", () => {
      const schema = z.object({
        technologies: z.array(z.object({ name: z.string() })),
      });

      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.contentDesc).toContain("'technologies'");
      expect(result.instructions[0]).toContain("'technologies'");
    });

    it("should handle camelCase category keys", () => {
      const schema = z.object({
        boundedContexts: z.array(z.object({ name: z.string() })),
      });

      const result = createReduceInsightsPrompt("boundedContexts", "boundedContexts", schema);

      expect(result.contentDesc).toContain("'boundedContexts'");
      expect(result.instructions[0]).toContain("'boundedContexts'");
    });
  });

  describe("Immutability", () => {
    it("should return a new object each time", () => {
      const schema = z.object({ technologies: z.array(z.string()) });

      const result1 = createReduceInsightsPrompt("technologies", "technologies", schema);
      const result2 = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it("should not share mutable state between calls", () => {
      const schema1 = z.object({ technologies: z.array(z.string()) });
      const schema2 = z.object({ businessProcesses: z.array(z.string()) });

      const result1 = createReduceInsightsPrompt("technologies", "technologies", schema1);
      const result2 = createReduceInsightsPrompt("businessProcesses", "businessProcesses", schema2);

      expect(result1.responseSchema).toBe(schema1);
      expect(result2.responseSchema).toBe(schema2);
      expect(result1.contentDesc).not.toBe(result2.contentDesc);
    });
  });
});

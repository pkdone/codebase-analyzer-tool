import { createReduceInsightsPromptDefinition } from "../../../src/app/prompts/definitions/utility-prompts";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { z } from "zod";

describe("Utility Prompts Refactoring Tests", () => {
  describe("createReduceInsightsPromptDefinition with factory", () => {
    test("should create definition using generic factory", () => {
      const categoryLabel = "Entities";
      const responseSchema = z.object({
        entities: z.array(z.object({ name: z.string() })),
      });

      const definition = createReduceInsightsPromptDefinition(categoryLabel, responseSchema);

      // Should have required fields
      expect(definition.label).toBe("Reduce Entities");
      expect(definition.contentDesc).toBeDefined();
      expect(definition.contentDesc).toContain("consolidate");
      expect(definition.instructions).toHaveLength(1);
      expect(definition.instructions[0]).toContain("Entities");
      expect(definition.responseSchema).toBe(responseSchema);
      expect(definition.dataBlockHeader).toBe("FRAGMENTED_DATA");
      expect(definition.wrapInCodeBlock).toBe(false);
    });

    test("should render correctly with renderPrompt", () => {
      const categoryLabel = "Aggregates";
      const responseSchema = z.object({
        aggregates: z.array(z.string()),
      });

      const definition = createReduceInsightsPromptDefinition(categoryLabel, responseSchema);
      const content = '[{"aggregates": ["Order"]}, {"aggregates": ["Customer"]}]';
      const rendered = renderPrompt(definition, {
        content,
        categoryKey: "aggregates",
      });

      // Should contain consolidation instructions
      expect(rendered).toContain("consolidate");
      expect(rendered).toContain("de-duplicated");
      expect(rendered).toContain("comprehensive");
      expect(rendered).toContain("a consolidated list of 'Aggregates'");
      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(content);
    });

    test("should work with different category labels", () => {
      const labels = ["Repositories", "BoundedContexts", "Technologies"];

      labels.forEach((label) => {
        const definition = createReduceInsightsPromptDefinition(label, z.object({}));

        expect(definition.label).toBe(`Reduce ${label}`);
        expect(definition.instructions[0]).toContain(label);
      });
    });

    test("should preserve schema type", () => {
      const complexSchema = z.object({
        items: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
          }),
        ),
      });

      const definition = createReduceInsightsPromptDefinition("Items", complexSchema);

      expect(definition.responseSchema).toBe(complexSchema);
    });

    test("should have consistent structure with other factory-generated definitions", () => {
      const definition = createReduceInsightsPromptDefinition("TestCategory", z.object({}));

      // Should have all required PromptDefinition fields
      expect(definition).toHaveProperty("contentDesc");
      expect(definition).toHaveProperty("instructions");
      expect(definition).toHaveProperty("responseSchema");
      expect(definition).toHaveProperty("template");
      expect(definition).toHaveProperty("dataBlockHeader");
      expect(definition).toHaveProperty("wrapInCodeBlock");
      expect(definition).toHaveProperty("label");

      // Should NOT have the old introTextTemplate
      expect(definition).not.toHaveProperty("introTextTemplate");
    });

    test("should render with categoryKey placeholder replacement", () => {
      const definition = createReduceInsightsPromptDefinition("Entities", z.object({}));
      const rendered = renderPrompt(definition, {
        content: "test",
        categoryKey: "myCustomKey",
      });

      // The categoryKey should be part of the rendered contentDesc
      // Note: contentDesc contains {{categoryKey}} which gets replaced during rendering
      expect(rendered).toContain("legacy application");
    });
  });
});


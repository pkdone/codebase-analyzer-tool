import { BASE_PROMPT_TEMPLATE } from "../../../../../src/app/prompts/templates";
import { renderPrompt } from "../../../../../src/app/prompts/prompt-renderer";
import { createReduceInsightsPrompt } from "../../../../../src/app/prompts/prompt-registry";
import { z } from "zod";
import { AppSummaryCategoryEnum } from "../../../../../src/app/components/insights/insights.types";

describe("MapReduceInsightStrategy - categoryKey parameter handling", () => {
  it("should use factory to embed categoryKey in contentDesc", () => {
    // With the factory pattern, categoryKey is embedded directly in contentDesc
    // by createReduceInsightsPrompt, not as a placeholder for renderPrompt
    const category: AppSummaryCategoryEnum = "technologies";
    const categoryKey = "technologies";
    const schema = z.object({ technologies: z.array(z.object({ name: z.string() })) });

    // Create a reduce prompt definition using the factory
    const reducePromptDef = createReduceInsightsPrompt(category, categoryKey, schema);

    // Verify the factory embedded the categoryKey in contentDesc
    expect(reducePromptDef.contentDesc).toContain(categoryKey);

    // Now render with the definition
    const rendered = renderPrompt(reducePromptDef, {
      content: '{"technologies": []}',
    });

    // Verify categoryKey appears in the rendered output
    expect(rendered).toContain("technologies");
    expect(rendered).not.toContain("{{categoryKey}}");
  });

  it("should render reduce prompt with FRAGMENTED_DATA header", () => {
    const category: AppSummaryCategoryEnum = "technologies";
    const categoryKey = "technologies";
    const schema = z.object({ technologies: z.array(z.object({ name: z.string() })) });
    const reducePromptDef = createReduceInsightsPrompt(category, categoryKey, schema);

    const content = JSON.stringify({ technologies: [{ name: "Test" }] }, null, 2);
    const rendered = renderPrompt(reducePromptDef, { content });

    // Verify the template was rendered correctly
    expect(rendered).toContain("technologies");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain(content);
  });

  it("should work with pre-populated contentDesc (simulating factory output)", () => {
    // This tests the pattern where factory pre-populates the contentDesc
    const categoryKey = "technologies";
    const testConfig = {
      label: "Test Reduce",
      contentDesc: `Test intro with ${categoryKey} in the section below.`,
      instructions: ["a consolidated list"],
      responseSchema: z.object({ technologies: z.array(z.object({ name: z.string() })) }),
      template: BASE_PROMPT_TEMPLATE,
      dataBlockHeader: "FRAGMENTED_DATA" as const,
      wrapInCodeBlock: false,
    };

    const content = JSON.stringify({ technologies: [{ name: "Test" }] }, null, 2);
    const rendered = renderPrompt(testConfig, { content });

    // Verify the template was rendered correctly with categoryKey already embedded
    expect(rendered).toContain("technologies");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain(content);
    // No placeholder should exist since factory embeds the value directly
    expect(rendered).not.toContain("{{categoryKey}}");
  });
});

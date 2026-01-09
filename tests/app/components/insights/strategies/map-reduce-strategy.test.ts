import { BASE_PROMPT_TEMPLATE } from "../../../../../src/app/prompts/templates";
import { renderPrompt } from "../../../../../src/app/prompts/prompt-renderer";
import { buildReduceInsightsContentDesc } from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.fragments";
import {
  DATA_BLOCK_HEADERS,
  type PromptDefinition,
} from "../../../../../src/app/prompts/prompt.types";
import { LLMOutputFormat } from "../../../../../src/common/llm/types/llm.types";
import { z } from "zod";

describe("MapReduceInsightStrategy - categoryKey parameter handling", () => {
  it("should embed categoryKey in contentDesc", () => {
    // categoryKey is embedded directly in contentDesc, not as a placeholder for renderPrompt
    const categoryKey = "technologies";
    const schema = z.object({ technologies: z.array(z.object({ name: z.string() })) });

    // Create a reduce prompt definition
    const reducePromptDef: PromptDefinition = {
      label: "Reduce Insights",
      contentDesc: buildReduceInsightsContentDesc(categoryKey),
      instructions: [`a consolidated list of '${categoryKey}'`],
      responseSchema: schema,
      template: BASE_PROMPT_TEMPLATE,
      dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
      wrapInCodeBlock: false,
      outputFormat: LLMOutputFormat.JSON,
    };

    // Verify the categoryKey is embedded in contentDesc
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
    const categoryKey = "technologies";
    const schema = z.object({ technologies: z.array(z.object({ name: z.string() })) });
    const reducePromptDef: PromptDefinition = {
      label: "Reduce Insights",
      contentDesc: buildReduceInsightsContentDesc(categoryKey),
      instructions: [`a consolidated list of '${categoryKey}'`],
      responseSchema: schema,
      template: BASE_PROMPT_TEMPLATE,
      dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
      wrapInCodeBlock: false,
      outputFormat: LLMOutputFormat.JSON,
    };

    const content = JSON.stringify({ technologies: [{ name: "Test" }] }, null, 2);
    const rendered = renderPrompt(reducePromptDef, { content });

    // Verify the template was rendered correctly
    expect(rendered).toContain("technologies");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain(content);
  });

  it("should work with pre-populated contentDesc (simulating inline definition)", () => {
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

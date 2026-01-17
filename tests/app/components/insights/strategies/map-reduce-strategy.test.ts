import { ANALYSIS_PROMPT_TEMPLATE } from "../../../../../src/app/prompts/app-templates";
import { Prompt } from "../../../../../src/common/prompts/prompt";
import { buildReduceInsightsContentDesc } from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.fragments";
import { z } from "zod";

describe("MapReduceInsightStrategy - categoryKey parameter handling", () => {
  it("should embed categoryKey in contentDesc", () => {
    // categoryKey is embedded directly in contentDesc, not as a placeholder for renderPrompt
    const categoryKey = "technologies";
    const schema = z.object({ technologies: z.array(z.object({ name: z.string() })) });

    // Create a reduce prompt definition (JSON mode = responseSchema present)
    const reducePrompt = new Prompt(
      {
        contentDesc: buildReduceInsightsContentDesc(categoryKey),
        instructions: [`a consolidated list of '${categoryKey}'`],
        responseSchema: schema,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      },
      ANALYSIS_PROMPT_TEMPLATE,
    );

    // Verify the categoryKey is embedded in contentDesc
    expect(reducePrompt.contentDesc).toContain(categoryKey);

    // Now render with the definition
    const rendered = reducePrompt.renderPrompt('{"technologies": []}');

    // Verify categoryKey appears in the rendered output
    expect(rendered).toContain("technologies");
    expect(rendered).not.toContain("{{categoryKey}}");
  });

  it("should render reduce prompt with FRAGMENTED_DATA header", () => {
    const categoryKey = "technologies";
    const schema = z.object({ technologies: z.array(z.object({ name: z.string() })) });
    const reducePrompt = new Prompt(
      {
        contentDesc: buildReduceInsightsContentDesc(categoryKey),
        instructions: [`a consolidated list of '${categoryKey}'`],
        responseSchema: schema,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      },
      ANALYSIS_PROMPT_TEMPLATE,
    );

    const content = JSON.stringify({ technologies: [{ name: "Test" }] }, null, 2);
    const rendered = reducePrompt.renderPrompt(content);

    // Verify the template was rendered correctly
    expect(rendered).toContain("technologies");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain(content);
  });

  it("should work with pre-populated contentDesc (simulating inline definition)", () => {
    // This tests the pattern where factory pre-populates the contentDesc
    const categoryKey = "technologies";
    const testPrompt = new Prompt(
      {
        contentDesc: `Test intro with ${categoryKey} in the section below.`,
        instructions: ["a consolidated list"],
        responseSchema: z.object({ technologies: z.array(z.object({ name: z.string() })) }),
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      },
      ANALYSIS_PROMPT_TEMPLATE,
    );

    const content = JSON.stringify({ technologies: [{ name: "Test" }] }, null, 2);
    const rendered = testPrompt.renderPrompt(content);

    // Verify the template was rendered correctly with categoryKey already embedded
    expect(rendered).toContain("technologies");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain(content);
    // No placeholder should exist since factory embeds the value directly
    expect(rendered).not.toContain("{{categoryKey}}");
  });
});

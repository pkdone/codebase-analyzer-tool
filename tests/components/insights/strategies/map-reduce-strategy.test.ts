import { REDUCE_INSIGHTS_TEMPLATE } from "../../../../src/prompts/templates";
import { renderPrompt } from "../../../../src/prompts/prompt";
import { z } from "zod";

describe("MapReduceInsightStrategy - categoryKey parameter handling", () => {
  it("should pass categoryKey through renderPrompt() instead of using String.replace()", () => {
    // Verify that REDUCE_INSIGHTS_TEMPLATE contains the placeholder
    expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{categoryKey}}");

    // Create a test prompt to verify the render method works with categoryKey
    const testConfig = {
      contentDesc: "test",
      instructions: [{ points: ["test"] }],
      responseSchema: z.object({ entities: z.array(z.object({ name: z.string() })) }),
      template: REDUCE_INSIGHTS_TEMPLATE,
    };

    const rendered = renderPrompt(testConfig, {
      categoryKey: "entities",
      content: '{"entities": []}',
    });

    // Verify that categoryKey was replaced correctly
    expect(rendered).toContain("'entities'");
    expect(rendered).not.toContain("{{categoryKey}}");
  });

  it("should use Prompt.render() with categoryKey parameter for template substitution", () => {
    const testConfig = {
      contentDesc: "several JSON objects",
      instructions: [{ points: ["a consolidated list"] }],
      responseSchema: z.object({ entities: z.array(z.object({ name: z.string() })) }),
      template: REDUCE_INSIGHTS_TEMPLATE,
    };

    const content = JSON.stringify({ entities: [{ name: "Test" }] }, null, 2);
    const rendered = renderPrompt(testConfig, { categoryKey: "entities", content });

    // Verify the template was rendered correctly with categoryKey
    expect(rendered).toContain("'entities'");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain(content);
    expect(rendered).not.toContain("{{categoryKey}}");
  });
});

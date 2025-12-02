import { BASE_PROMPT_TEMPLATE } from "../../../../src/prompts/templates";
import { renderPrompt } from "../../../../src/prompts/prompt-renderer";
import { z } from "zod";

describe("MapReduceInsightStrategy - categoryKey parameter handling", () => {
  it("should pass categoryKey through renderPrompt() instead of using String.replace()", () => {
    // Note: categoryKey is now handled by the renderer via the introTextTemplate,
    // not via template placeholders, so we verify it's used in the rendered output instead

    // Create a test prompt to verify the render method works with categoryKey
    const testConfig = {
      introTextTemplate:
        "Test intro with {{categoryKey}} in the section marked '{{dataBlockHeader}}'.",
      instructions: ["test"],
      responseSchema: z.object({ entities: z.array(z.object({ name: z.string() })) }),
      template: BASE_PROMPT_TEMPLATE,
      dataBlockHeader: "FRAGMENTED_DATA" as const,
      wrapInCodeBlock: false,
    };

    const rendered = renderPrompt(testConfig, {
      categoryKey: "entities",
      content: '{"entities": []}',
    });

    // Verify that categoryKey was replaced correctly
    expect(rendered).toContain("entities");
    expect(rendered).not.toContain("{{categoryKey}}");
  });

  it("should use Prompt.render() with categoryKey parameter for template substitution", () => {
    const testConfig = {
      introTextTemplate:
        "Test intro with {{categoryKey}} in the section marked '{{dataBlockHeader}}'.",
      instructions: ["a consolidated list"],
      responseSchema: z.object({ entities: z.array(z.object({ name: z.string() })) }),
      template: BASE_PROMPT_TEMPLATE,
      dataBlockHeader: "FRAGMENTED_DATA" as const,
      wrapInCodeBlock: false,
    };

    const content = JSON.stringify({ entities: [{ name: "Test" }] }, null, 2);
    const rendered = renderPrompt(testConfig, { categoryKey: "entities", content });

    // Verify the template was rendered correctly with categoryKey
    expect(rendered).toContain("entities");
    expect(rendered).toContain("FRAGMENTED_DATA:");
    expect(rendered).toContain(content);
    expect(rendered).not.toContain("{{categoryKey}}");
  });
});

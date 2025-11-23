import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { PROMPT_FRAGMENTS } from "./definitions/fragments";
import { type InstructionSection, type PromptDefinition } from "./prompt.types";

/**
 * Represents a prompt with its template, content, and rendering logic.
 * Encapsulates the prompt building process for better modularity and testability.
 */
export class Prompt {
  private readonly template: string;
  private readonly contentDesc: string;
  private readonly instructions: readonly InstructionSection[];
  private readonly schema: z.ZodType;
  private readonly content: string;

  /**
   * Creates a new Prompt instance.
   *
   * @param promptDefinition - The prompt definition containing all configuration including template
   * @param content - The actual content to analyze
   */
  constructor(promptDefinition: PromptDefinition, content: string) {
    this.template = promptDefinition.template;
    this.contentDesc = promptDefinition.contentDesc;
    this.instructions = promptDefinition.instructions;
    this.schema = promptDefinition.responseSchema;
    this.content = content;
  }

  /**
   * Renders the prompt by filling template placeholders with the provided values.
   * This method handles all prompt formatting, including converting instruction sections to formatted text.
   *
   * @param additionalParams - Optional additional parameters to merge into the template data
   * @returns The fully rendered prompt string
   */
  render(additionalParams: Record<string, string | undefined> = {}): string {
    const instructionsText = this.formatInstructions();

    const templateData = {
      instructions: instructionsText,
      forceJSON: PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
      jsonSchema: JSON.stringify(zodToJsonSchema(this.schema), null, 2),
      contentDesc: this.contentDesc,
      content: this.content,
      // Handle partialAnalysisNote - use nullish coalescing to only default when null/undefined
      partialAnalysisNote: additionalParams.partialAnalysisNote ?? "",
      ...additionalParams, // Merge additional params
    };

    return fillPrompt(this.template, templateData);
  }

  /**
   * Formats instruction sections with optional titles, joining points with newlines.
   * Sections with titles have the title formatted with underscores, then points are listed.
   * Sections without titles list points directly.
   */
  private formatInstructions(): string {
    return this.instructions
      .map((section) => {
        const title = section.title ? `__${section.title}__\n` : "";
        const points = section.points.join("\n");
        return `${title}${points}`;
      })
      .join("\n\n");
  }
}

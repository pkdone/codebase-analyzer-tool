import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
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
  private readonly responseSchema: z.ZodType;

  /**
   * Creates a new Prompt instance.
   *
   * @param promptDefinition - The prompt definition containing all configuration including template
   */
  constructor(promptDefinition: PromptDefinition) {
    this.template = promptDefinition.template;
    this.contentDesc = promptDefinition.contentDesc;
    this.instructions = promptDefinition.instructions;
    this.responseSchema = promptDefinition.responseSchema;
  }

  /**
   * Renders the prompt by filling template placeholders with the provided values.
   * This method handles all prompt formatting, including converting instruction sections to formatted text
   * and generating the JSON schema string from the response schema.
   *
   * @param data - All template variables needed to fill the template, including content
   * @returns The fully rendered prompt string
   */
  render(data: Record<string, unknown>): string {
    const instructionsText = this.formatInstructions();
    const jsonSchemaString = JSON.stringify(zodToJsonSchema(this.responseSchema), null, 2);

    const templateData = {
      ...data, // All template variables are passed in one object
      instructions: instructionsText,
      forceJSON: PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
      jsonSchema: jsonSchemaString,
      contentDesc: this.contentDesc,
      // Handle partialAnalysisNote - use nullish coalescing to only default when null/undefined
      partialAnalysisNote: (data.partialAnalysisNote as string | undefined) ?? "",
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

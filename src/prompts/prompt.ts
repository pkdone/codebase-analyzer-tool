import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { PROMPT_FRAGMENTS } from "./templates/prompt-fragments";

/**
 * Represents a prompt with its template, content, and rendering logic.
 * Encapsulates the prompt building process for better modularity and testability.
 */
export class Prompt {
  private readonly template: string;
  private readonly contentDesc: string;
  private readonly instructions: readonly string[];
  private readonly schema: z.ZodType;
  private readonly codeContent: string;

  /**
   * Creates a new Prompt instance.
   *
   * @param template - The template string with placeholders (e.g., {{contentDesc}}, {{specificInstructions}})
   * @param contentDesc - Description of the content being analyzed
   * @param instructions - Array of instruction strings to be formatted as bullet points
   * @param schema - Zod schema for validation
   * @param codeContent - The actual content to analyze
   */
  constructor(
    template: string,
    contentDesc: string,
    instructions: readonly string[],
    schema: z.ZodType,
    codeContent: string,
  ) {
    this.template = template;
    this.contentDesc = contentDesc;
    this.instructions = instructions;
    this.schema = schema;
    this.codeContent = codeContent;
  }

  /**
   * Renders the prompt by filling template placeholders with the provided values.
   * This method handles all prompt formatting, including converting instruction arrays to bullet points.
   *
   * @returns The fully rendered prompt string
   */
  render(): string {
    const specificInstructions = this.instructions
      .map((instruction) => `* ${instruction}`)
      .join("\n");
    return fillPrompt(this.template, {
      contentDesc: this.contentDesc,
      specificInstructions,
      forceJSON: PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
      jsonSchema: JSON.stringify(zodToJsonSchema(this.schema), null, 2),
      codeContent: this.codeContent,
    });
  }
}

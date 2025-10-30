import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { COMMON_FRAGMENTS } from "./definitions/fragments";
import { type InstructionSection } from "./types/prompt-definition.types";

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
   * @param template - The template string with placeholders (e.g., {{contentDesc}}, {{specificInstructions}})
   * @param contentDesc - Description of the content being analyzed
   * @param instructions - Array of instruction sections to be formatted
   * @param schema - Zod schema for validation
   * @param content - The actual content to analyze
   */
  constructor(
    template: string,
    contentDesc: string,
    instructions: readonly InstructionSection[],
    schema: z.ZodType,
    content: string,
  ) {
    this.template = template;
    this.contentDesc = contentDesc;
    this.instructions = instructions;
    this.schema = schema;
    this.content = content;
  }

  /**
   * Renders the prompt by filling template placeholders with the provided values.
   * This method handles all prompt formatting, including converting instruction sections to formatted text.
   *
   * @returns The fully rendered prompt string
   */
  render(): string {
    const instructionsText = this.formatInstructions();

    return fillPrompt(this.template, {
      instructions: instructionsText,
      forceJSON: COMMON_FRAGMENTS.FORCE_JSON_FORMAT,
      jsonSchema: JSON.stringify(zodToJsonSchema(this.schema), null, 2),
      contentDesc: this.contentDesc,
      content: this.content,
    });
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

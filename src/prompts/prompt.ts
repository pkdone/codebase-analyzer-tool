import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { SOURCES_PROMPT_FRAGMENTS } from "./templates/sources-prompt-fragments";
import { areInstructionSections, type InstructionSection } from "./types/prompt-definition.types";

/**
 * Represents a prompt with its template, content, and rendering logic.
 * Encapsulates the prompt building process for better modularity and testability.
 */
export class Prompt {
  private readonly template: string;
  private readonly contentDesc: string;
  private readonly instructions: readonly string[] | readonly InstructionSection[];
  private readonly schema: z.ZodType;
  private readonly content: string;

  /**
   * Creates a new Prompt instance.
   *
   * @param template - The template string with placeholders (e.g., {{contentDesc}}, {{specificInstructions}})
   * @param contentDesc - Description of the content being analyzed
   * @param instructions - Array of instruction strings to be formatted as bullet points, or array of instruction sections
   * @param schema - Zod schema for validation
   * @param content - The actual content to analyze
   */
  constructor(
    template: string,
    contentDesc: string,
    instructions: readonly string[] | readonly InstructionSection[],
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
   * This method handles all prompt formatting, including converting instruction arrays to bullet points.
   *
   * @returns The fully rendered prompt string
   */
  render(): string {
    const instructionsText = this.formatInstructions();

    return fillPrompt(this.template, {
      instructions: instructionsText,
      forceJSON: SOURCES_PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
      jsonSchema: JSON.stringify(zodToJsonSchema(this.schema), null, 2),
      contentDesc: this.contentDesc,
      content: this.content,
    });
  }

  /**
   * Formats instructions into a string.
   * Supports both string array format and section-based format with titles for better organization.
   */
  private formatInstructions(): string {
    if (areInstructionSections(this.instructions)) {
      return this.formatSectionInstructions(this.instructions);
    }

    // String array format (simple flat list)
    return this.instructions.map((instruction) => `* ${instruction}`).join("\n");
  }

  /**
   * Formats instructions that are organized into sections with optional titles.
   * This provides better structure and readability for complex instruction sets.
   */
  private formatSectionInstructions(sections: readonly InstructionSection[]): string {
    return sections
      .map((section) => {
        const title = section.title ? `\n**${section.title}**\n` : "";
        const points = section.points.map((point) => `* ${point}`).join("\n");
        return `${title}${points}`;
      })
      .join("\n\n");
  }
}

import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { SOURCES_PROMPT_FRAGMENTS } from "./definitions/sources/common-fragments";
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
      forceJSON: SOURCES_PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
      jsonSchema: JSON.stringify(zodToJsonSchema(this.schema), null, 2),
      contentDesc: this.contentDesc,
      content: this.content,
    });
  }

  /**
   * Formats instructions into a string.
   * Handles instruction sections with optional titles, ensuring backward compatibility
   * for sections without titles (legacy flat lists) by adding bullet point prefixes.
   */
  private formatInstructions(): string {
    return this.formatSectionInstructions(this.instructions);
  }

  /**
   * Formats instructions that are organized into sections with optional titles.
   * For sections with titles: title is formatted, points are included as-is.
   * For sections without titles (legacy flat lists): points are formatted with "* " prefix to match old behavior.
   */
  private formatSectionInstructions(sections: readonly InstructionSection[]): string {
    return sections
      .map((section) => {
        const hasTitle = Boolean(section.title);
        const title = hasTitle ? `__${section.title ?? ""}__\n` : "";

        // If section has a title, points are formatted without "* " prefix (they're contextual under the title)
        // If section has no title (legacy flat list), add "* " prefix to each point for backward compatibility
        const points = hasTitle
          ? section.points.join("\n")
          : section.points.map((point) => `* ${point}`).join("\n");

        return `${title}${points}`;
      })
      .join("\n\n");
  }
}

import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { SOURCES_PROMPT_FRAGMENTS } from "./templates/sources-prompt-fragments";
import { areInstructionSections, type InstructionSection } from "./types/prompt-definition.types";
import { DEFAULT_PROMPT_ROLE, PROMPT_CONTENT_HEADERS } from "./templates/master.prompt";

/**
 * Represents a prompt with its template, content, and rendering logic.
 * Encapsulates the prompt building process for better modularity and testability.
 */
export class Prompt {
  private readonly template: string;
  private readonly contentDesc: string;
  private readonly instructions: readonly string[] | readonly InstructionSection[];
  private readonly schema: z.ZodType;
  private readonly codeContent: string;
  private readonly role: string;
  private readonly contentHeader: string;

  /**
   * Creates a new Prompt instance.
   *
   * @param template - The template string with placeholders (e.g., {{contentDesc}}, {{specificInstructions}})
   * @param contentDesc - Description of the content being analyzed
   * @param instructions - Array of instruction strings to be formatted as bullet points, or array of instruction sections
   * @param schema - Zod schema for validation
   * @param codeContent - The actual content to analyze
   * @param role - Optional role for the prompt
   * @param contentHeader - Optional content header for the prompt
   */
  constructor(
    template: string,
    contentDesc: string,
    instructions: readonly string[] | readonly InstructionSection[],
    schema: z.ZodType,
    codeContent: string,
    role?: string,
    contentHeader?: string,
  ) {
    this.template = template;
    this.contentDesc = contentDesc;
    this.instructions = instructions;
    this.schema = schema;
    this.codeContent = codeContent;
    this.role = role ?? DEFAULT_PROMPT_ROLE;
    this.contentHeader = contentHeader ?? PROMPT_CONTENT_HEADERS.CODE;
  }

  /**
   * Sets the role for this prompt.
   */
  withRole(role: string): Prompt {
    return new Prompt(
      this.template,
      this.contentDesc,
      this.instructions,
      this.schema,
      this.codeContent,
      role,
      this.contentHeader,
    );
  }

  /**
   * Sets the content header for this prompt.
   */
  withContentHeader(header: string): Prompt {
    return new Prompt(
      this.template,
      this.contentDesc,
      this.instructions,
      this.schema,
      this.codeContent,
      this.role,
      header,
    );
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
      role: this.role,
      instructions: instructionsText,
      forceJSON: SOURCES_PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
      jsonSchema: JSON.stringify(zodToJsonSchema(this.schema), null, 2),
      contentHeader: this.contentHeader,
      codeContent: this.codeContent,
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

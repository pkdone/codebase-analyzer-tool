import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { COMMON_FRAGMENTS } from "./definitions/fragments";
import { type InstructionSection, type PromptDefinition } from "./types/prompt-definition.types";
import { REDUCE_INSIGHTS_TEMPLATE } from "./templates/app-summaries-templates.prompt";

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
   * Static factory method for creating prompts for source file analysis.
   *
   * @param definition - The prompt definition for the source file type
   * @param content - The source file content to analyze
   * @returns A new Prompt instance configured for source file analysis
   */
  static forSource(definition: PromptDefinition, content: string): Prompt {
    return new Prompt(definition, content);
  }

  /**
   * Static factory method for creating prompts for app summary analysis.
   *
   * @param definition - The prompt definition for the app summary category
   * @param content - The code content to analyze
   * @returns A new Prompt instance configured for app summary analysis
   */
  static forAppSummary(definition: PromptDefinition, content: string): Prompt {
    return new Prompt(definition, content);
  }

  /**
   * Static factory method for creating prompts for the REDUCE phase of map-reduce strategy.
   * This method performs special template manipulation that requires custom logic.
   *
   * @param definition - The prompt definition for consolidating results
   * @param content - The partial results content to consolidate
   * @param categoryKey - The category key for the REDUCE template (e.g., "entities", "technologies")
   * @returns A new Prompt instance configured for reducing partial insights
   */
  static forReduce(definition: PromptDefinition, content: string, categoryKey: string): Prompt {
    const template = REDUCE_INSIGHTS_TEMPLATE.replace("{{categoryKey}}", categoryKey);
    const modifiedDefinition = { ...definition, template };
    return new Prompt(modifiedDefinition, content);
  }

  /**
   * Renders the prompt by filling template placeholders with the provided values.
   * This method handles all prompt formatting, including converting instruction sections to formatted text.
   *
   * @param additionalParams - Optional additional parameters to merge into the template data
   * @returns The fully rendered prompt string
   */
  render(additionalParams: Record<string, string> = {}): string {
    const instructionsText = this.formatInstructions();

    const templateData = {
      instructions: instructionsText,
      forceJSON: COMMON_FRAGMENTS.FORCE_JSON_FORMAT,
      jsonSchema: JSON.stringify(zodToJsonSchema(this.schema), null, 2),
      contentDesc: this.contentDesc,
      content: this.content,
      // Handle partialAnalysisNote - if not provided or empty, use empty string
      partialAnalysisNote: additionalParams.partialAnalysisNote || "",
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

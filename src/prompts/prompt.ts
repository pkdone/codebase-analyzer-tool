import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { COMMON_FRAGMENTS } from "./definitions/fragments";
import { type InstructionSection, type PromptDefinition } from "./prompt.types";

/**
 * Centralized prompt templates for the application
 * Consolidates all prompt templates in one location for better organization
 */

/**
 * Sources prompt template used for capturing source code summaries.
 * This centralizes the common structure for all LLM prompts in the application.
 */
export const SOURCES_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked 'CODE', return a JSON response that contains:

{{instructions}}.

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

CODE:
\`\`\`
{{content}}
\`\`\``;

/**
 * Unified template for app summary insight generation strategies.
 * Used for both single-pass and map-reduce strategies with optional partial analysis note.
 */
export const APP_SUMMARY_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked 'FILE_SUMMARIES', return a JSON response that contains:

{{instructions}}.

{{partialAnalysisNote}}The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

FILE_SUMMARIES:
{{content}}`;

/**
 * Template for consolidating partial insights (REDUCE phase of map-reduce strategy).
 * Used for merging and de-duplicating results from multiple partial analyses.
 */
export const REDUCE_INSIGHTS_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. You have been provided with {{contentDesc}} shown below in the section marked 'FRAGMENTED_DATA', each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized.

The final JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

FRAGMENTED_DATA:
{{content}}`;

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

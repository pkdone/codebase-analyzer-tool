import { z } from "zod";
import { SourceSummaryType } from "../../schemas/source-summaries.schema";
import { DynamicPromptReplaceVars } from "../../llm/processing/prompting/prompt-templator";
import { createPromptFromConfig } from "../../llm/processing/prompting/prompt-templator";

// Base template for detailed file summary prompts
const SOURCES_SUMMARY_CAPTURE_TEMPLATE = `Act as a programmer. Take the {{fileContentDesc}} shown below in the section marked 'CODE' and based on its content, return a JSON response containing data that includes the following:

{{specificInstructions}}

The JSON response must follow this JSON schema:
\`\`\`json
{{jsonSchema}}
\`\`\`

{{forceJSON}}

CODE:
{{codeContent}}`;

/**
 * Represents a file handler that can create prompts and validate responses for a specific file type.
 */
export class FileHandler<T extends SourceSummaryType = SourceSummaryType> {
  private readonly config: DynamicPromptReplaceVars;

  constructor(config: DynamicPromptReplaceVars) {
    this.config = config;
  }

  /**
   * Gets the Zod schema for validating the response.
   */
  get schema(): z.ZodType<T> {
    return this.config.schema as z.ZodType<T>;
  }

  /**
   * Gets the file content description.
   */
  get fileContentDescription(): string {
    return this.config.fileContentDesc;
  }

  /**
   * Gets the specific instructions for this file type.
   */
  get instructions(): string {
    return this.config.instructions;
  }

  /**
   * Gets whether the response contains code.
   */
  get trickySchema(): boolean {
    return this.config.trickySchema;
  }

  /**
   * Creates a prompt for the given file content.
   */
  createPrompt(content: string): string {
    return createPromptFromConfig(SOURCES_SUMMARY_CAPTURE_TEMPLATE, this.config, content);
  }
}

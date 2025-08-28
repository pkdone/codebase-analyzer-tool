import { z } from "zod";
import { DynamicPromptConfig, createPromptFromConfig } from "../../llm/utils/prompt-templator";
import { sourceSummarySchema } from "../../schemas/sources.schema";

/**
 * Type for source summary
 */
export type SourceSummaryType = z.infer<typeof sourceSummarySchema>;

// Base template for detailed file summary prompts
const SOURCES_SUMMARY_CAPTURE_TEMPLATE = `Act as a programmer. Take the {{contentDesc}} shown below in the section marked 'CODE' and based on its content, return a JSON response containing data that includes the following:

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
  // Private members
  private readonly config: DynamicPromptConfig<z.ZodType<T>>;

  /**
   * Constructor
   */
  constructor(config: DynamicPromptConfig<z.ZodType<T>>) {
    this.config = config;
  }

  /**
   * Gets the Zod schema for validating the response.
   * Type-safe due to generic constraint linking and documented safe assertion.
   */
  get schema(): z.ZodType<T> {
    return this.config.schema;
  }

  /**
   * Gets the file content description.
   */
  get contentDescription(): string {
    return this.config.contentDesc;
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
  get hasComplexSchema(): boolean {
    return this.config.hasComplexSchema;
  }

  /**
   * Creates a prompt for the given file content.
   */
  createPrompt(content: string): string {
    return createPromptFromConfig(
      SOURCES_SUMMARY_CAPTURE_TEMPLATE,
      this.config.contentDesc,
      this.config.instructions,
      this.config.schema,
      content,
    );
  }
}

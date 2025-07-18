import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";

// Constant to force the LLM to respond with a JSON object
const FORCE_JSON_RESPONSE_TEXT = `
In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.`;

/**
 * Configuration for prompts that need file type and instructions
 */
export interface DynamicPromptReplaceVars {
  schema: z.ZodType;
  fileContentDesc: string;
  instructions: string;
  trickySchema: boolean;
}

/**
 * Convenience function for creating prompts
 */
export function createPromptFromConfig(
  template: string,
  config: DynamicPromptReplaceVars,
  codeContent: string,
): string {
  return fillPrompt(template, {
    fileContentDesc: config.fileContentDesc,
    specificInstructions: config.instructions,
    forceJSON: FORCE_JSON_RESPONSE_TEXT,
    jsonSchema: JSON.stringify(zodToJsonSchema(config.schema), null, 2),
    codeContent: codeContent,
  });
}

import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";

// Instructions for the LLM to respond with a JSON object
const JSON_OUTPUT_INSTRUCTIONS = `
In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
CRITICAL JSON FORMAT REQUIREMENTS:
- ALL property names MUST be enclosed in double quotes (e.g., "name": "value", NOT name: "value")
- ALL string values MUST be enclosed in double quotes
- Use proper JSON syntax with commas separating properties
- Do not include any unquoted property names or values
- Ensure all brackets, braces, and quotes are properly matched
- COMPLETE ALL PROPERTY NAMES: Never truncate or abbreviate property names (e.g., use "references" not "eferences", "implementation" not "implemen")
- ENSURE COMPLETE RESPONSES: Always provide complete, valid JSON that can be parsed without errors
- AVOID TRUNCATION: If you reach token limits, prioritize completing the JSON structure over adding more detail`;

/**
 * Convenience function for creating prompts
 */
export function createPromptFromConfig(
  template: string,
  contentDesc: string,
  specificInstructions: string,
  schema: z.ZodType,
  codeContent: string,
): string {
  return fillPrompt(template, {
    contentDesc,
    specificInstructions,
    forceJSON: JSON_OUTPUT_INSTRUCTIONS,
    jsonSchema: JSON.stringify(zodToJsonSchema(schema), null, 2),
    codeContent,
  });
}

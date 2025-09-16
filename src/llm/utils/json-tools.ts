import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg } from "../../common/utils/logging";
import { BadResponseContentLLMError } from "../types/llm-errors.types";

/**
 * Type guard to validate that a value conforms to the LLMGeneratedContent type.
 */
function isLLMGeneratedContent(value: unknown): value is LLMGeneratedContent {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return true;
  if (typeof value === "object" && !Array.isArray(value)) return true;
  return false;
}

/**
 * Convert text content to JSON, trimming the content to only include the JSON part and optionally
 * validate it against a Zod schema.
 */
export function convertTextToJSONAndOptionallyValidate<T = Record<string, unknown>>(
  content: LLMGeneratedContent,
  resourceName: string,
  completionOptions: LLMCompletionOptions,
  doWarnOnError = false,
): T {
  if (typeof content !== "string") {
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' is not a string, content`,
      JSON.stringify(content),
    );
  }

  // Find JSON content by looking for balanced braces/brackets, handling nested structures
  let jsonMatch: string | null = null;
  const markdownMatch = /```(?:json)?\s*([{[][\s\S]*?[}\]])\s*```/.exec(content);

  if (markdownMatch) {
    jsonMatch = markdownMatch[1];
  } else {
    // Look for the first opening brace or bracket and find its matching closing one
    const openBraceIndex = content.search(/[{[]/);

    if (openBraceIndex !== -1) {
      const startChar = content[openBraceIndex];
      const endChar = startChar === "{" ? "}" : "]";
      let depth = 0;
      let endIndex = -1;

      for (let i = openBraceIndex; i < content.length; i++) {
        if (content[i] === startChar) depth++;
        else if (content[i] === endChar) {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex !== -1) jsonMatch = content.substring(openBraceIndex, endIndex + 1);
    }
  }

  if (!jsonMatch) {
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' doesn't contain valid JSON content for text`,
      content,
    );
  }

  let jsonContent: unknown;

  try {
    jsonContent = JSON.parse(jsonMatch);
  } catch {
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' cannot be parsed to JSON for text`,
      content,
    );
  }

  const validatedContent = validateSchemaIfNeededAndReturnResponse<T>(
    jsonContent, // Removed the 'as LLMGeneratedContent' cast - pass unknown directly to Zod
    completionOptions,
    resourceName,
    doWarnOnError,
  );

  if (validatedContent === null) {
    const contentTextWithNoNewlines = content.replace(/\n/g, " ");
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' can be turned into JSON but doesn't validate with the supplied JSON schema`,
      contentTextWithNoNewlines,
    );
  }

  // For convertTextToJSONAndOptionallyValidate, we know we're dealing with JSON content,
  // so if validation didn't occur (outputFormat !== JSON or no schema), we can safely cast
  // the JSON content to T since this function is specifically for JSON conversion
  return validatedContent as T;
}

/**
 * Validate the LLM response content against a Zod schema if provided returning null if validation
 * fails (having logged the error).
 */
export function validateSchemaIfNeededAndReturnResponse<T>(
  content: unknown, // Accept unknown values to be safely handled by Zod validation
  completionOptions: LLMCompletionOptions,
  resourceName: string,
  doWarnOnError = false,
): T | LLMGeneratedContent | null {
  if (
    content &&
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {
    // Zod's safeParse can safely handle unknown inputs and provide type-safe output
    const validation = completionOptions.jsonSchema.safeParse(content);

    if (!validation.success) {
      const errorMessage = `Zod schema validation failed for '${resourceName}' so returning null. Validation issues: ${JSON.stringify(validation.error.issues)}`;
      if (doWarnOnError) logErrorMsg(errorMessage);
      return null;
    }

    return validation.data as T; // Cast is now safer after successful validation
  } else {
    // For non-JSON formats (TEXT) or when no schema validation is needed,
    // be more permissive and allow any valid JSON-parsed content
    if (completionOptions.outputFormat === LLMOutputFormat.TEXT) {
      // TEXT format should accept any type, including numbers, for backward compatibility
      return content as LLMGeneratedContent;
    } else {
      if (isLLMGeneratedContent(content)) return content; // Now safe, no cast needed
      logErrorMsg(`Content is not valid LLMGeneratedContent for resource: ${resourceName}`);
      return null;
    }
  }
}

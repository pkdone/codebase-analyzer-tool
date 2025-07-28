import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../../types/llm.types";
import { logErrorMsg } from "../../../common/utils/error-utils";
import { BadResponseContentLLMError } from "../../types/llm-errors.types";

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

  // This regex finds the first '{' or '[' and matches until the corresponding '}' or ']'.
  const jsonRegex = /({[\s\S]*}|\[[\s\S]*\])/;
  const match = jsonRegex.exec(content);

  if (!match) {
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' doesn't contain valid JSON content for text`,
      content,
    );
  }

  let jsonContent: unknown;

  try {
    jsonContent = JSON.parse(match[0]);
  } catch (_error: unknown) {
    void _error;
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
    // When no validation is performed, we assume the content is valid LLMGeneratedContent
    // This is reasonable since JSON.parse output should fit the LLMGeneratedContent type
    return content as LLMGeneratedContent;
  }
}

import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../../llm.types";
import { logErrorMsg } from "../../../common/utils/error-utils";
import { BadResponseContentLLMError } from "../../errors/llm-errors.types";

/**
 * Convert text content to JSON, trimming the content to only include the JSON part and optionally
 * validate it against a Zod schema.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function convertTextToJSONAndOptionallyValidate<T = Record<string, unknown>>(
  content: LLMGeneratedContent,
  resourceName: string,
  completionOptions: LLMCompletionOptions,
  doWarnOnError = false,
): T {
  if (typeof content !== "string") {
    throw new BadResponseContentLLMError(
      "LLM response for resource '${resourceName}' is not a string, content",
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

  let jsonContent: T;

  try {
    jsonContent = JSON.parse(match[0]) as T;
  } catch (_error: unknown) {
    void _error;
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' cannot be parsed to JSON for text`,
      content,
    );
  }

  const validatedContent = validateSchemaIfNeededAndReturnResponse<T>(
    jsonContent as Record<string, unknown>,
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

  return validatedContent;
}

/**
 * Validate the LLM response content against a Zod schema if provided returning null if validation
 * fails (having logged the error).
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function validateSchemaIfNeededAndReturnResponse<T>(
  content: LLMGeneratedContent | null,
  completionOptions: LLMCompletionOptions,
  resourceName: string,
  doWarnOnError = false,
): T | null {
  if (
    content &&
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {
    const validation = completionOptions.jsonSchema.safeParse(content);

    if (!validation.success) {
      const errorMessage = `Zod schema validation failed for '${resourceName}' so returning null. Validation issues: ${JSON.stringify(validation.error.issues)}`;
      if (doWarnOnError) logErrorMsg(errorMessage);
      return null;
    }

    return validation.data as T;
  } else {
    return content as T;
  }
}

import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg } from "../../common/utils/logging";
import { BadResponseContentLLMError } from "../types/llm-errors.types";

/**
 * Attempt to fix malformed JSON by handling common LLM response issues.
 * This function addresses various malformed JSON patterns that LLMs commonly produce.
 */
function attemptJsonSanitization(jsonString: string): string {
  try {
    // Approach: Parse as-is first to see if it's valid, then try simple fixes
    JSON.parse(jsonString);
    return jsonString; // Already valid
  } catch {
    // Try progressive fixes for common issues
    let sanitized = jsonString;
    
    // Fix 1: Handle over-escaped content within JSON string values
    // This is the most common issue with LLM responses containing SQL/code examples
    sanitized = fixOverEscapedStringContent(sanitized);
    
    // Fix 2: Handle truncated JSON by attempting to close open structures
    sanitized = completeTruncatedJSON(sanitized);
    
    return sanitized;
  }
}

/**
 * Fix over-escaped content within JSON string values while preserving JSON structure.
 * This function specifically targets content within double-quoted JSON string values.
 */
function fixOverEscapedStringContent(jsonString: string): string {
  // Use a more comprehensive regex to find JSON string values including field values and array items
  return jsonString.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (_match, content: string) => {
    // Apply over-escaped content fixes to the string content only
    const fixedContent = fixOverEscapedSequences(content);
    return `"${fixedContent}"`;
  });
}

/**
 * Fix over-escaped sequences within a JSON string content.
 * This handles the actual content between quotes, not the JSON structure.
 */
function fixOverEscapedSequences(content: string): string {
  let fixed = content;
  
  // Fix over-escaped newline patterns
  // Pattern: \\\\r\\\\n -> \r\n (8 chars to 4 chars)
  fixed = fixed.replace(/\\\\r\\\\n/g, '\\r\\n');
  
  // Pattern: \\r\\n -> \r\n (4 chars to 4 chars - this should be the correct format)
  fixed = fixed.replace(/\\r\\n/g, '\\r\\n');
  
  // Fix over-escaped quote patterns  
  // Pattern: \\\\" -> \" (4 chars to 2 chars)
  fixed = fixed.replace(/\\\\"/g, '\\"');
  
  // Pattern: \\\\\' -> ' (4 chars to 1 char - just the single quote, not escaped)
  fixed = fixed.replace(/\\\\'/g, "'");
  
  // Pattern: \\' -> ' (3 chars to 1 char - fix triple-backslash single quote)
  fixed = fixed.replace(/\\'/g, "'");
  
  // Fix other over-escaped patterns
  // Pattern: \\\\n -> \n
  fixed = fixed.replace(/\\\\n/g, '\\n');
  
  // Pattern: \\\\t -> \t
  fixed = fixed.replace(/\\\\t/g, '\\t');
  
  // Fix excessive backslashes (more than 4 consecutive backslashes)
  // Pattern: \\\\\\\\+ -> \\\\ (reduce to double backslash)
  fixed = fixed.replace(/\\{8,}/g, '\\\\\\\\');
  fixed = fixed.replace(/\\{6}/g, '\\\\\\\\');
  fixed = fixed.replace(/\\{4}/g, '\\\\');
  
  return fixed;
}

/**
 * Attempt to complete truncated JSON structures.
 */
function completeTruncatedJSON(jsonString: string): string {
  const trimmed = jsonString.trim();
  if (trimmed && !trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    // Count open vs closed braces to estimate what's needed
    let braceDepth = 0;
    let bracketDepth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (const [, char] of Array.from(trimmed).entries()) {
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceDepth++;
        else if (char === '}') braceDepth--;
        else if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth--;
      }
    }
    
    let sanitized = trimmed;
    
    // If the string ends mid-field or with incomplete structure, try to complete it
    if (trimmed.endsWith(',')) {
      // Remove trailing comma and close structure
      sanitized = trimmed.replace(/,\s*$/, '');
    } else if (trimmed.endsWith(':')) {
      // Add empty string value for incomplete field and close structure
      sanitized = trimmed + '""';
    }
    
    // Close open structures
    while (bracketDepth > 0) {
      sanitized += ']';
      bracketDepth--;
    }
    while (braceDepth > 0) {
      sanitized += '}';
      braceDepth--;
    }
    
    return sanitized;
  }
  
  return jsonString;
}

/**
 * Extract JSON content from text and parse it.
 * Handles both markdown-wrapped JSON and raw JSON content.
 * Improved algorithm to handle complex nested content with proper string awareness.
 */
function extractAndParse(textContent: string): unknown {
  // Find JSON content by looking for balanced braces/brackets, handling nested structures
  let jsonMatch: string | null = null;
  const markdownMatch = /```(?:json)?\s*([{[][\s\S]*?[}\]])\s*```/.exec(textContent);

  if (markdownMatch) {
    jsonMatch = markdownMatch[1];
  } else {
    // Look for the first opening brace or bracket and find its matching closing one
    const openBraceIndex = textContent.search(/[{[]/);

    if (openBraceIndex !== -1) {
      const startChar = textContent[openBraceIndex];
      const endChar = startChar === "{" ? "}" : "]";
      let depth = 0;
      let endIndex = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = openBraceIndex; i < textContent.length; i++) {
        const char = textContent[i];

        // Handle escape sequences
        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        // Handle string boundaries
        if (char === '"') {
          inString = !inString;
          continue;
        }

        // Only count braces when not inside a string
        if (!inString) {
          if (char === startChar) {
            depth++;
          } else if (char === endChar) {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          }
        }
      }

      if (endIndex !== -1) {
        jsonMatch = textContent.substring(openBraceIndex, endIndex + 1);
      } else {
        // Handle truncated JSON - extract from opening brace to end of content
        // This allows sanitization logic to attempt completion
        jsonMatch = textContent.substring(openBraceIndex);
      }
    }
  }

  if (!jsonMatch) {
    throw new Error("No JSON content found");
  }

  return JSON.parse(jsonMatch);
}

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

  let jsonContent: unknown;

  try {
    jsonContent = extractAndParse(content);
  } catch (firstError: unknown) {
    if (firstError instanceof Error && firstError.message === "No JSON content found") {
      throw new BadResponseContentLLMError(
        `LLM response for resource '${resourceName}' doesn't contain valid JSON content for text`,
        content,
      );
    }
    
    // Fallback: sanitize the original content and re-extract + parse
    try {
      const sanitizedContent = attemptJsonSanitization(content);
      jsonContent = extractAndParse(sanitizedContent);
      logErrorMsg(`JSON sanitization was applied for resource '${resourceName}' due to malformed LLM response`);
    } catch {
      throw new BadResponseContentLLMError(
        `LLM response for resource '${resourceName}' cannot be parsed to JSON for text`,
        content,
      );
    }
  }

  const validatedContent = validateSchemaIfNeededAndReturnResponse<T>(
    jsonContent, 
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

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
    
    // Fix 1: Handle extremely over-escaped sequences (common LLM issue)
    // More conservative approach: reduce excessive backslashes progressively
    
    // First, handle sequences of 8+ backslashes followed by quotes
    // Convert patterns like \\\\\\\\\\\\\\\\\" to just \"
    const escapedQuote = String.fromCharCode(92, 34); // backslash + quote (\")
    sanitized = sanitized.replace(/\\{8,}"/g, escapedQuote);
    
    // Handle 4+ backslashes + single quotes -> 1 backslash + single quote
    // Convert patterns like \\\\\' or \\\\\\\' to \'
    sanitized = sanitized.replace(/\\{3,}'/g, "\\'");
    
    // Handle 4 backslashes + special chars -> 2 backslashes + special chars
    sanitized = sanitized.replace(/\\\\\\\\r/g, '\\\\r');
    sanitized = sanitized.replace(/\\\\\\\\n/g, '\\\\n'); 
    sanitized = sanitized.replace(/\\\\\\\\t/g, '\\\\t');
    
    // Handle remaining excessive backslash patterns more conservatively
    // Replace 6+ backslashes with 2 backslashes
    sanitized = sanitized.replace(/\\{6,}/g, '\\\\');
    
    // Final fix for remaining improperly escaped quotes within strings
    // Look for patterns like \\\" (3+ backslashes + quote) and fix to \" (proper escape)
    sanitized = sanitized.replace(/\\{3,}"/g, '\\"');
    
    // Fix 2: Handle truncated JSON by attempting to close open structures
    // Check if JSON ends abruptly (common with large responses hitting token limits)
    const trimmed = sanitized.trim();
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
      
      // If the string ends mid-field or with incomplete structure, try to complete it
      if (trimmed.endsWith(',')) {
        // Remove trailing comma and close structure
        sanitized = trimmed.replace(/,\s*$/, '');
      } else if (trimmed.endsWith(':')) {
        // Add empty string value for incomplete field and close structure
        sanitized = trimmed + '""';
      } else {
        // Use the trimmed version as-is
        sanitized = trimmed;
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
    }
    
    // Fix 3: For fields containing complex content (like SQL), improve quote handling
    sanitized = sanitized.replace(/"(codeExample|command)":\s*"([^"]*(?:\\"[^"]*)*)"(?=\s*[,}])/g, (_, fieldName: string, content: string) => {
      // Enhanced approach for code/SQL content
      const tempMarker = '__TEMP_ESCAPED_QUOTE__';
      const fixedContent = content
        .replace(/\\"/g, tempMarker) // Mark already escaped quotes
        .replace(/"/g, '\\"')        // Escape unescaped quotes
        .replace(new RegExp(tempMarker, 'g'), '\\"'); // Restore escaped quotes
      
      return `"${fieldName}": "${fixedContent}"`;
    });
    
    return sanitized;
  }
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

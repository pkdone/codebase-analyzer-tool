import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg } from "../../common/utils/logging";
import { BadResponseContentLLMError } from "../types/llm-errors.types";

interface TableObject {
  name?: string;
  command?: string;
}

interface ParsedJsonWithTables {
  [key: string]: unknown;
  tables?: unknown[];
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

  // Try to extract and parse the JSON content
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
    } catch {
      throw new BadResponseContentLLMError(
        `LLM response for resource '${resourceName}' cannot be parsed to JSON for text`,
        content,
      );
    }
  }

  // Perform Zod schema validation
  let validationIssues: unknown = null;
  const validatedContent = validateSchemaIfNeededAndReturnResponse<T>(
    jsonContent,
    completionOptions,
    resourceName,
    doWarnOnError,
    (issues) => {
      validationIssues = issues;
    },
  );

  if (validatedContent === null) {
    const contentTextWithNoNewlines = content.replace(/\n/g, " ");
    const issuesText = validationIssues ? ` Validation issues: ${JSON.stringify(validationIssues)}` : "";
    throw new BadResponseContentLLMError(
      `LLM response for resource '${resourceName}' can be turned into JSON but doesn't validate with the supplied JSON schema.${issuesText}`,
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
  onValidationIssues?: (issues: unknown) => void,
): T | LLMGeneratedContent | null {
  if (
    content &&
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {
    // Pre-validation heuristic repair: attempt to trim obviously invalid table entries early
    content = attemptContentAutoRepair(content);
    // Zod's safeParse can safely handle unknown inputs and provide type-safe output
    let validation = completionOptions.jsonSchema.safeParse(content);

    if (!validation.success) {
      // Attempt auto-repair for common partially generated patterns (e.g. truncated / malformed table objects)
      const repaired = attemptContentAutoRepair(content);

      if (repaired !== content) {
        validation = completionOptions.jsonSchema.safeParse(repaired);
      }

      if (!validation.success) {
        const issues = validation.error.issues;
        if (onValidationIssues) onValidationIssues(issues);
        const errorMessage = `Zod schema validation failed for '${resourceName}' so returning null. Validation issues: ${JSON.stringify(issues)}`;
        if (doWarnOnError) logErrorMsg(errorMessage);
        return null;
      }

      return validation.data as T; // Successful after repair
    }

    return validation.data as T; // Cast is now safer after successful validation (no repair needed)
  } else if (completionOptions.outputFormat === LLMOutputFormat.TEXT) {
    // TEXT format should accept any type, including numbers, for backward compatibility
    return content as LLMGeneratedContent;
  } else {
    if (isLLMGeneratedContent(content)) return content; // Now safe, no cast needed
    logErrorMsg(`Content is not valid LLMGeneratedContent for resource: ${resourceName}`);
    return null;
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
 * Attempt to fix malformed JSON by handling common LLM response issues.
 * This function addresses various malformed JSON patterns that LLMs commonly produce.
 */
function attemptJsonSanitization(jsonString: string): string {
  // No need to check if already valid - this function is only called when parsing already failed
  // Try progressive fixes for common issues
  let sanitized = jsonString;
  
  // Fix 0: Remove literal control characters that make JSON invalid at the top level
  // This must be done first before any other processing
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  
  // Fix 0.5: Fix literal newlines after backslashes in JSON structure 
  // Pattern: \\\n -> \\n (backslash + literal newline to properly escaped newline)
  sanitized = sanitized.replace(/\\\n/g, '\\n');
  
  // Fix 0.6: Fix escaped Unicode control characters in JSON strings
  // Pattern: \\u0001 -> '' (remove escaped control characters)
  sanitized = sanitized.replace(/\\u000[1-9A-F]/g, '');
  sanitized = sanitized.replace(/\\u001[0-9A-F]/g, '');
  
  // Fix 0.7: Fix remaining null escape patterns in JSON strings
  // Pattern: '\\0' -> '' (remove null escape sequences in string literals)
  sanitized = sanitized.replace(/'\\0'/g, "''");
  
  // Fix 1: Handle over-escaped content within JSON string values
  // This is the most common issue with LLM responses containing SQL/code examples
  sanitized = fixOverEscapedSequences(sanitized);
  
  // Fix 2: Handle structural JSON issues (incomplete objects, invalid field values)
  sanitized = fixStructuralJsonIssues(sanitized);
  
  // Fix 3: Handle truncated JSON by attempting to close open structures
  sanitized = completeTruncatedJSON(sanitized);

  // Final structural pass AFTER truncation completion to remove malformed nested objects
  sanitized = fixStructuralJsonIssues(sanitized);
  
  return sanitized;
}

/**
 * Fix over-escaped sequences within a JSON string content.
 * This handles the actual content between quotes, not the JSON structure.
 */
function fixOverEscapedSequences(content: string): string {
  let fixed = content;
  
  // Apply the exact same patterns that work in the manual test, in the same order
  // Pattern: \\\\\\\' -> ' (5 backslashes + single quote - most specific first)
  fixed = fixed.replace(/\\\\\\'/g, "'");
  
  // Pattern: \\\\\' -> ' (4 backslashes + single quote)  
  fixed = fixed.replace(/\\\\'/g, "'");
  
  // Pattern: \\\' -> ' (3 backslashes + single quote)
  fixed = fixed.replace(/\\'/g, "'");
  
  // Pattern: \\\\\\\'.\\\\\\' -> '.' (5-backslash dot pattern)
  fixed = fixed.replace(/\\\\\\'\\./g, "'.");
  
  // Pattern: \\\\\\'\\\\\\\' -> '' (5-backslash empty quotes)
  // eslint-disable-next-line no-useless-escape
  fixed = fixed.replace(/\\\\\\'\\\\\\\'/g, "''");
  
  // Pattern: \\\'.\\' -> '.' (3-backslash dot pattern) 
  fixed = fixed.replace(/\\'\\./g, "'.");
  
  // Pattern: \\\'\\' -> '' (3-backslash empty quotes)
  // eslint-disable-next-line no-useless-escape
  fixed = fixed.replace(/\\'\\\'/g, "''");
  
  // Fix over-escaped null characters (handle both 4 and 5 backslash patterns)
  // Pattern: \\\\\\0 -> \\0 (reduce 5-backslash null to proper null escape)
  fixed = fixed.replace(/\\\\\\0/g, '\\0');
  
  // Pattern: \\\\0 -> \\0 (reduce 4-backslash null to proper null escape)  
  fixed = fixed.replace(/\\\\0/g, '\\0');
  
  // Clean up orphaned backslashes
  fixed = fixed.replace(/\\\\\s*,/g, ',');   // Double backslash before comma
  fixed = fixed.replace(/\\\\\s*\)/g, ')');  // Double backslash before paren
  fixed = fixed.replace(/\\,/g, ',');        // Single backslash before comma
  fixed = fixed.replace(/\\\)/g, ')');       // Single backslash before paren
  
  return fixed;
}

/**
 * Fix structural JSON issues like incomplete objects and invalid field values.
 * This handles issues where the JSON structure is malformed due to incomplete generation.
 */
function fixStructuralJsonIssues(jsonString: string): string {
  try {
    // Attempt to parse and fix known structural issues
    // Note: We need to see if the JSON is parseable cos this is called after sanitization fixes
    const parsed: unknown = JSON.parse(jsonString);
    
    // Validate and fix incomplete table objects in the tables array
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 
        'tables' in parsed && Array.isArray((parsed as Record<string, unknown>).tables)) {
      // Now we can safely cast after validation
      const typedParsed = parsed as ParsedJsonWithTables;
      if (typedParsed.tables) {
        typedParsed.tables = typedParsed.tables.filter((table: unknown): table is TableObject => {
        // Remove table objects that are incomplete or have invalid names
        if (!table || typeof table !== 'object') {
          return false; // Remove non-object entries
        }
        
        const tableObj = table as TableObject;
        
        // Remove entries with invalid table names (like "tables;")
        if (!tableObj.name || typeof tableObj.name !== 'string' || 
            tableObj.name.includes(';') || tableObj.name.length < 2) {
          return false;
        }
        
        // Remove entries missing the command field
        if (!tableObj.command || typeof tableObj.command !== 'string') {
          return false;
        }
        
          return true; // Keep valid table objects
        });
      }
      
      return JSON.stringify(typedParsed);
    }
    
    return JSON.stringify(parsed);    
  } catch {
    // If parsing fails, return the original string - final extraction will handle it
    return jsonString;
  }
}

/**
 * Attempt to auto-repair common validation issues (currently focuses on removing malformed
 * table objects missing required properties). Returns the (possibly) modified content.
 */
function attemptContentAutoRepair(content: unknown): unknown {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return content;
  const clone: Record<string, unknown> = { ...(content as Record<string, unknown>) };
  let mutated = false;

  if (Array.isArray(clone.tables)) {
    const tables = clone.tables as unknown[];

  interface PartialTable { [k: string]: unknown; name?: unknown; command?: unknown }
    const isValidTable = (t: unknown): t is TableObject => {
      if (!t || typeof t !== 'object' || Array.isArray(t)) return false;
      const pt = t as PartialTable;
      if (typeof pt.name !== 'string' || pt.name.length === 0) return false;
      if (pt.name.includes(';')) return false; // invalid - semicolon suggests mis-split
      if (typeof pt.command !== 'string' || pt.command.length < 10) return false; // too short to be real DDL
      // Heuristic: very obviously truncated commands (ending mid-keyword)
      const truncatedPatterns = /(CREAT$|CREATE TABL$|DEFAULT CHARSET=UT|ENGINE=InnoDB DEFAULT CHARSET=UTF8MB4;\\".*?\\".*?)/i;
      if (truncatedPatterns.test(pt.command)) return false;
      return true;
    };

    const repairedTables: TableObject[] = tables.filter(isValidTable);
    // Only mutate if we actually fixed something (removed invalid entries)
    if (repairedTables.length !== tables.length) {
      clone.tables = repairedTables;
      mutated = true;
    }
  }

  // Apply similar auto-repair heuristics for storedProcedures and triggers for parity
  const sanitizeProceduresOrTriggers = (items: unknown[]): unknown[] => {
    interface PartialPT { [k: string]: unknown; name?: unknown; purpose?: unknown; complexity?: unknown; complexityReason?: unknown; linesOfCode?: unknown }
    const VALID_COMPLEXITIES = new Set(['LOW', 'MEDIUM', 'HIGH']);
    const MIN_PURPOSE_LEN = 20; // Purpose should be at least a meaningful sentence fragment
    const MIN_REASON_LEN = 10; // Short but non-trivial
    return items.filter((it) => {
      if (!it || typeof it !== 'object' || Array.isArray(it)) return false;
      const pt = it as PartialPT;
      if (typeof pt.name !== 'string' || pt.name.length === 0) return false;
      if (pt.name.includes(';')) return false; // very unlikely valid identifier
      if (typeof pt.purpose !== 'string' || pt.purpose.length < MIN_PURPOSE_LEN) return false;
      if (typeof pt.complexity !== 'string' || !VALID_COMPLEXITIES.has(pt.complexity)) return false;
      if (typeof pt.complexityReason !== 'string' || pt.complexityReason.length < MIN_REASON_LEN) return false;
      if (typeof pt.linesOfCode !== 'number' || pt.linesOfCode <= 0 || !Number.isFinite(pt.linesOfCode)) return false;
      return true;
    });
  };

  interface CloneWithDbArrays {
    storedProcedures?: unknown[];
    triggers?: unknown[];
  }
  const typed = clone as CloneWithDbArrays;

  if (Array.isArray(typed.storedProcedures)) {
    const original = typed.storedProcedures;
    const repaired = sanitizeProceduresOrTriggers(original);
    if (repaired.length !== original.length) {
      typed.storedProcedures = repaired;
      mutated = true;
    }
  }

  if (Array.isArray(typed.triggers)) {
    const original = typed.triggers;
    const repaired = sanitizeProceduresOrTriggers(original);
    if (repaired.length !== original.length) {
      typed.triggers = repaired;
      mutated = true;
    }
  }

  // Synthesize missing databaseIntegration for SQL summaries (parity with required schema fields)
  if (!('databaseIntegration' in clone)) {
    // Heuristic signals
    const hasTables = Array.isArray(clone.tables) && (clone.tables as unknown[]).length > 0;
    const hasProcs = Array.isArray((clone as { storedProcedures?: unknown[] }).storedProcedures) &&
      ((clone as { storedProcedures?: unknown[] }).storedProcedures?.length ?? 0) > 0;
    const hasTriggers = Array.isArray((clone as { triggers?: unknown[] }).triggers) &&
      ((clone as { triggers?: unknown[] }).triggers?.length ?? 0) > 0;
    const implementationText = typeof clone.implementation === 'string' ? clone.implementation : '';
    const purposeText = typeof clone.purpose === 'string' ? clone.purpose : '';
    const hasDml = /INSERT\s+INTO\s+/i.test(implementationText);
    const hasCreateTable = /CREATE\s+TABLE/i.test(implementationText) || hasTables;

    // Mechanism inference precedence (default DDL if tables else adapt)
    let mechanism = 'DDL';
    if (hasTriggers) mechanism = 'TRIGGER';
    else if (hasProcs) mechanism = 'STORED-PROCEDURE';
    else if (hasDml && !hasCreateTable) mechanism = 'DML';
    else if (!hasCreateTable && !hasDml) mechanism = 'SQL';

    // Derive a tiny code example from first table/proc/trigger if available
    let codeExample = 'n/a';
    const firstTable = hasTables ? (clone.tables as unknown[])[0] as { command?: unknown } : undefined;
    if (firstTable && typeof firstTable === 'object' && typeof firstTable.command === 'string') {
      const lines = firstTable.command.split(/\n/).slice(0, 6); // cap at 6 lines per spec
      codeExample = lines.join('\n');
    } else if (implementationText) {
      // Fallback: extract first 3 non-empty lines from implementation sans backticks
      const implLines = implementationText.replace(/`/g, '').split(/\n/).filter(l => l.trim().length > 0).slice(0, 3);
      if (implLines.length > 0) codeExample = implLines.join('\n');
    }

    clone.databaseIntegration = {
      mechanism,
      description: `Inferred automatically from generated summary signals (tables:${hasTables}, procs:${hasProcs}, triggers:${hasTriggers}, DML:${hasDml}). Field was missing from original LLM output. ${purposeText ? 'Context: ' + purposeText.slice(0, 140) + '...' : ''}`,
      codeExample,
    };
    mutated = true;
  }

  return mutated ? clone : content;
}

/**
 * Attempt to complete truncated JSON structures.
 */
function completeTruncatedJSON(jsonString: string): string {
  const trimmed = jsonString.trim();
  if (trimmed && !trimmed.endsWith('}') && !trimmed.endsWith(']')) {
    // Count open vs closed braces and track if we're inside a string
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
    
    // If we're still inside a string at the end, close it appropriately
    if (inString) {
      // Check if this looks like a truncated SQL CREATE TABLE statement
      const lastPart = sanitized.substring(Math.max(0, sanitized.length - 200));
      if ((lastPart.includes('TABLE IF NOT EXISTS') || lastPart.includes('CREATE TABLE')) && 
          (lastPart.includes('DEFAULT ') || lastPart.includes('tinyint') || lastPart.includes('BIGINT'))) {
        // This looks like a truncated CREATE TABLE statement - close string cleanly
        const trimmedEnd = sanitized.trim();
        if (trimmedEnd.endsWith(',')) {
          // Remove trailing comma and close string properly
          const lastCommaIndex = sanitized.lastIndexOf(',');
          if (lastCommaIndex !== -1) {
            sanitized = sanitized.substring(0, lastCommaIndex) + '"';
          } else {
            sanitized += '"';
          }
        } else {
          // Just close the string
          sanitized += '"';
        }
  } else {
        // Generic string completion
        sanitized += '"';
      }
    }
    
    // Close open structures in the correct order
    // For JSON with nested objects in arrays, we need to close objects before arrays
    
    // If we have both braces and brackets, close them in nested order
    if (braceDepth > 0 && bracketDepth > 0) {
      // Close one object (table object), then array, then remaining objects
      sanitized += '}';
      braceDepth--;
      
      while (bracketDepth > 0) {
        sanitized += ']';
        bracketDepth--;
      }
      
      while (braceDepth > 0) {
        sanitized += '}';
        braceDepth--;
      }
    } else {
      // Standard closing
      while (bracketDepth > 0) {
        sanitized += ']';
        bracketDepth--;
      }
      while (braceDepth > 0) {
        sanitized += '}';
        braceDepth--;
      }
    }
    
    return sanitized;
  }
  
  return jsonString;
}

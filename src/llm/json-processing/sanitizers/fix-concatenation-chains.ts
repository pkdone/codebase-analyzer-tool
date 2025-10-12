import type { Sanitizer } from "./sanitizers-types";

/**
 * Fixes concatenation chains in LLM-generated JSON.
 *
 * ## Problem Statement
 *
 * LLMs sometimes output JavaScript/Java-style string concatenation expressions instead
 * of valid JSON string literals. For example:
 * - Input:  { "path": BASE_PATH + "/file.ts" }
 * - Output: { "path": "/file.ts" }
 *
 * ## Approach
 *
 * This sanitizer uses a simplified, conservative approach that handles only the most
 * obvious and safe cases:
 *
 * 1. **Identifier-only chains**: Replace with empty string
 *    - Pattern: { "key": VAR_A + VAR_B }
 *    - Result: { "key": "" }
 *
 * 2. **Identifier(s) followed by literal**: Keep only the literal
 *    - Pattern: { "key": BASE_PATH + "src/file.ts" }
 *    - Result: { "key": "src/file.ts" }
 *
 * 3. **Literal followed by identifier**: Keep only the literal
 *    - Pattern: { "key": "MyClass" + SUFFIX }
 *    - Result: { "key": "MyClass" }
 *
 * ## Safety
 *
 * This implementation deliberately avoids:
 * - Complex multi-step iterations that can cause false positives
 * - Modifying content inside valid JSON strings (strings containing "+")
 * - Handling complex expressions (nested, ternary, function calls, etc.)
 *
 * The goal is to fix common LLM mistakes without risking corruption of valid JSON.
 */

/**
 * Matches identifier-only concatenation chains and replaces with empty string.
 * Pattern: "key": IDENTIFIER + IDENTIFIER + ...
 * Only matches when there are no string literals in the chain.
 */
const IDENTIFIER_ONLY_CHAIN =
  /(:\s*)([A-Za-z_][\w.()]*(?:\s*\+\s*[A-Za-z_][\w.()]*)+)(?=\s*[,}\n])/g;

/**
 * Matches identifier(s) followed by a string literal.
 * Pattern: "key": IDENTIFIER + ... + "literal"
 * Keeps only the final string literal.
 */
const IDENTIFIER_THEN_LITERAL = /(:\s*)(?:[A-Za-z_][\w.()]*\s*\+\s*)+"([^"\n]*)"/g;

/**
 * Matches one or more string literals followed by identifier(s).
 * Pattern: "key": "literal" + ["literal" +] ... + IDENTIFIER + ...
 * Keeps only the first string literal.
 * This pattern must match multiple literals potentially followed by an identifier.
 */
const LITERAL_THEN_IDENTIFIER =
  /(:\s*)"([^"\n]*)"\s*(?:\+\s*"[^"\n]*"\s*)*\+\s*[A-Za-z_][\w.()]*[^,}\n]*/g;

/**
 * Matches consecutive string literal concatenations (no identifiers).
 * Pattern: "key": "literal1" + "literal2" + ...
 * Merges all literals into a single one.
 * This regex looks for a colon followed by at least two string literals joined by +
 * Uses a greedy quantifier to match all consecutive literals
 */
const CONSECUTIVE_LITERALS = /(:\s*)"[^"\n]*"(?:\s*\+\s*"[^"\n]*")+/g;

/**
 * Simplified concatenation chain sanitizer.
 * Applies three safe transformations in sequence, with diagnostics.
 */
export const concatenationChainSanitizer: Sanitizer = (input) => {
  // Quick exit if no potential concatenation patterns
  if (!input.includes("+") || !input.includes('"')) {
    return { content: input, changed: false };
  }

  const diagnostics: string[] = [];
  let result = input;
  let totalChanges = 0;

  // Step 1: Replace identifier-only chains with empty string
  result = result.replace(IDENTIFIER_ONLY_CHAIN, (_match, prefix) => {
    diagnostics.push("Replaced identifier-only chain with empty string");
    totalChanges++;
    return `${prefix}""`;
  });

  // Step 2: Keep only literal when identifiers precede it
  result = result.replace(
    IDENTIFIER_THEN_LITERAL,
    (_match: string, prefix: string, literal: string) => {
      diagnostics.push(
        `Kept literal "${literal.substring(0, 30)}${literal.length > 30 ? "..." : ""}" from identifier chain`,
      );
      totalChanges++;
      return `${prefix}"${literal}"`;
    },
  );

  // Step 3: Keep only literal when identifiers follow it
  result = result.replace(
    LITERAL_THEN_IDENTIFIER,
    (_match: string, prefix: string, literal: string) => {
      diagnostics.push(
        `Removed trailing identifiers after literal "${literal.substring(0, 30)}${literal.length > 30 ? "..." : ""}"`,
      );
      totalChanges++;
      return `${prefix}"${literal}"`;
    },
  );

  // Step 4: Merge consecutive string literals (no identifiers)
  // This runs AFTER identifier handling to avoid merging literals that have identifiers mixed in
  result = result.replace(CONSECUTIVE_LITERALS, (match: string, prefix: string) => {
    // Extract all string literals from the match
    const literalMatches = match.match(/"[^"\n]*"/g);
    if (!literalMatches || literalMatches.length < 2) {
      return match; // No change needed
    }

    // Remove quotes and merge all literals
    const merged = literalMatches.map((lit) => lit.slice(1, -1)).join("");
    diagnostics.push(`Merged ${literalMatches.length} consecutive string literals`);
    totalChanges++;
    return `${prefix}"${merged}"`;
  });

  if (totalChanges === 0) {
    return { content: input, changed: false };
  }

  return {
    content: result,
    changed: true,
    description: `Fixed ${totalChanges} concatenation chain${totalChanges !== 1 ? "s" : ""}`,
    diagnostics,
  };
};

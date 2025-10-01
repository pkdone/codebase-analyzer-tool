import type { Sanitizer } from "./sanitizers-types";

/**
 * Shared regular expressions for fixing concatenation chains in LLM-generated JSON.
 *
 * These regexes address a common failure mode where LLMs output JavaScript/Java-style
 * string concatenation expressions instead of valid JSON string literals. For example,
 * the LLM might output: { "path": BASE_PATH + "/file.ts" } instead of { "path": "/file.ts" }
 */

/**
 * Matches a JSON property value that starts with one or more identifier concatenations
 * followed by a string literal.
 *
 * Pattern: { "key": IDENTIFIER + IDENTIFIER + "literal" }
 * Strategy: Keep only the final string literal, discard all leading identifiers.
 *
 * Example - Before: { "path": BASE_PATH + DIR + "src/main.ts" }
 * Example - After:  { "path": "src/main.ts" }
 *
 * Regex breakdown:
 * - (:\s*) = Capture group: colon and optional whitespace after property key
 * - (?:[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*)+ = Non-capturing group: one or more identifiers followed by +
 * - "([^"\n]*)" = Capture group: the final string literal
 */
const IDENT_LEADING_WITH_LITERAL_REGEX = /(:\s*)(?:[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*)+"([^"\n]*)"/g;

/**
 * Matches a JSON property value that starts with a string literal and captures any
 * trailing content (which may include concatenation operators or identifiers).
 *
 * Pattern: { "key": "literal"<trailing stuff> }
 * Strategy: Used to identify and trim trailing concatenation attempts after a valid literal.
 *
 * Example - Before: { "name": "MyClass" + SUFFIX }
 * Example - After:  { "name": "MyClass" }
 *
 * Regex breakdown:
 * - (:\s*) = Capture group: colon and optional whitespace
 * - "([^"\n]*)" = Capture group: the string literal content
 * - ([^,}\n]*) = Capture group: any trailing content until comma, brace, or newline
 */
const FIRST_LITERAL_WITH_TAIL_REGEX = /(:\s*)"([^"\n]*)"([^,}\n]*)/g;

/**
 * Matches a JSON property value that consists solely of concatenated identifiers
 * (no string literals at all).
 *
 * Pattern: { "key": IDENTIFIER + IDENTIFIER + ... }
 * Strategy: Replace entire chain with an empty string "", as we have no literal value to preserve.
 *
 * Example - Before: { "path": BASE_PATH + DIRECTORY + FILE_NAME }
 * Example - After:  { "path": "" }
 *
 * Regex breakdown:
 * - ("[^"]+"\s*:\s*) = Capture group: the property key with colon
 * - ([A-Za-z_][A-Za-z0-9_.()]*) = First identifier
 * - (?:\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*)+ = One or more additional identifiers with + operators
 * - (?=\s*[},\n]) = Lookahead: must be followed by comma, brace, or newline
 */
const IDENT_ONLY_CHAIN_REGEX =
  /("[^"]+"\s*:\s*)([A-Za-z_][A-Za-z0-9_.()]*)(?:\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*)+(?=\s*[},\n])/g;

/**
 * Matches any simple concatenation chain segment (used as a detection pattern).
 *
 * Pattern: "literal" + ("literal" | IDENTIFIER)
 * Strategy: Used in a while loop guard to detect if any concatenation chains remain.
 *
 * Example matches:
 * - "hello" + "world"
 * - "path" + VARIABLE
 *
 * Regex breakdown:
 * - "[^"\n]*" = A string literal
 * - \s*\+\s* = Plus operator with optional whitespace
 * - (?:"[^"\n]*"|[A-Za-z_][A-Za-z0-9_.()]*) = Either another string literal or an identifier
 */
const SIMPLE_CHAIN_SEGMENT_REGEX = /"[^"\n]*"\s*\+\s*(?:"[^"\n]*"|[A-Za-z_][A-Za-z0-9_.()]*)/;

/**
 * Light collapse used early (pre strategy) to maximize early parse success.
 */
export function lightCollapseConcatenationChains(raw: string): string {
  if (!raw.includes("+") || !raw.includes('"')) return raw;
  const simpleChain = SIMPLE_CHAIN_SEGMENT_REGEX;
  let updated = raw;
  // Identifier-only chains -> empty string
  updated = updated.replace(IDENT_ONLY_CHAIN_REGEX, (_m, pfx) => `${pfx}""`);
  // Identifier-only chains at end of object or before newline
  updated = updated.replace(
    /(:\s*)([A-Za-z_][A-Za-z0-9_.()]*\s*(?:\+\s*[A-Za-z_][A-Za-z0-9_.()]*)+)(?=\s*[}\n])/g,
    (_m, pfx) => `${pfx}""`,
  );
  // Identifier-leading chains ending with literal -> keep literal
  updated = updated.replace(IDENT_LEADING_WITH_LITERAL_REGEX, (_m, pfx, lit) => `${pfx}"${lit}"`);
  // Trim after first literal if identifiers appear later
  updated = updated.replace(
    FIRST_LITERAL_WITH_TAIL_REGEX,
    (m: string, pfx: string, lit: string, tail: string) => {
      if (!tail || typeof tail !== "string" || !tail.includes("+")) {
        return m; // no concatenation
      }
      if (/[+]\s*[A-Za-z_][A-Za-z0-9_.()]*/.test(tail)) {
        return `${pfx}"${lit}"`;
      }
      return m;
    },
  );
  let safety = 0;

  while (simpleChain.test(updated) && safety < 50) {
    safety += 1;
    // Identifier-leading simple chains: key: IDENT + "literal" -> keep literal only
    updated = updated.replace(
      /(:\s*)[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*"([^"\n]*)"/g,
      (_m, pfx, lit) => `${pfx}"${lit}"`,
    );
    // Collapse chains with multiple literals before an identifier to only the first literal
    updated = updated.replace(
      /"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,12}\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b[^,}\]]*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const first = reFirst.exec(match);
        return first ? first[0] : match;
      },
    );
    // Collapse any literal + identifier (+ literals) sequence to first literal
    updated = updated.replace(/"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b/g, (match) => {
      const reFirst = /^"[^"\n]*"/;
      const firstLit = reFirst.exec(match);
      return firstLit ? firstLit[0] : match;
    });
    // After collapsing, strip any remaining literal+identifier(+literal) sequences to just the first literal
    updated = updated.replace(
      /(:\s*)"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
      (full, pfx) => {
        const lit = /"[^"\n]*"/.exec(full);
        return lit ? `${pfx}${lit[0]}` : full;
      },
    );
    // Merge pure literal-only limited chains
    updated = updated.replace(/"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,6}(?=\s*[,}\]])/g, (chain) => {
      const tokens = chain
        .split(/\s*\+\s*/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (!tokens.length) return chain;
      const merged = tokens
        .map((t) => {
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            return t.substring(1, t.length - 1);
          }
          return t;
        })
        .join("");
      return `"${merged}"`;
    });
  }

  // Final pass: any chain with an identifier anywhere: "lit" + IDENT (+ "lit" ... ) -> "lit"
  updated = updated.replace(
    /"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
    (m) => {
      const first = /"[^"\n]*"/.exec(m);
      return first ? first[0] : m;
    },
  );
  return updated;
}

/**
 * Full normalization used in heavier sanitation pathway.
 */
export function normalizeConcatenationChains(input: string): string {
  if (!input.includes("+") || !input.includes('"')) return input;
  const simpleChain = SIMPLE_CHAIN_SEGMENT_REGEX;
  let updated = input;
  // Identifier-only chains -> empty string
  updated = updated.replace(IDENT_ONLY_CHAIN_REGEX, (_m, pfx) => `${pfx}""`);
  // Identifier-only chains at end of object or before newline
  updated = updated.replace(
    /(:\s*)([A-Za-z_][A-Za-z0-9_.()]*\s*(?:\+\s*[A-Za-z_][A-Za-z0-9_.()]*)+)(?=\s*[}\n])/g,
    (_m, pfx) => `${pfx}""`,
  );
  // Identifier-leading chains ending with literal -> keep literal
  updated = updated.replace(IDENT_LEADING_WITH_LITERAL_REGEX, (_m, pfx, lit) => `${pfx}"${lit}"`);
  // Trim after first literal if identifiers appear later
  updated = updated.replace(
    FIRST_LITERAL_WITH_TAIL_REGEX,
    (m: string, pfx: string, lit: string, tail: string) => {
      if (!tail || typeof tail !== "string" || !tail.includes("+")) {
        return m;
      }
      if (/[+]\s*[A-Za-z_][A-Za-z0-9_.()]*/.test(tail)) {
        return `${pfx}"${lit}"`;
      }
      return m;
    },
  );
  let guard = 0;

  while (simpleChain.test(updated) && guard < 80) {
    guard += 1;
    // Identifier-leading simple chains
    updated = updated.replace(
      /(:\s*)[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*"([^"\n]*)"/g,
      (_m, pfx, lit) => `${pfx}"${lit}"`,
    );
    // Identifier-leading chains inside normalization (same simple collapse)
    updated = updated.replace(/(:\s*)[A-Za-z_][A-Za-z0-9_.()]*\s*\+\s*"[^"\n]*"/g, (full, pfx) => {
      const reLit = /"[^"\n]*"/;
      const lit = reLit.exec(full);
      return lit ? `${pfx}${lit[0]}` : full;
    });
    // Collapse chains with multiple literals before an identifier
    updated = updated.replace(
      /"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,20}\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b[^,}\]]*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const first = reFirst.exec(match);
        return first ? first[0] : match;
      },
    );
    // Collapse simple literal + identifier (+ trailing literals) sequences
    updated = updated.replace(
      /"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const first = reFirst.exec(match);
        return first ? first[0] : match;
      },
    );
    // Literal + identifier (+ literals) collapse within key context
    updated = updated.replace(
      /(:\s*)"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
      (full, pfx) => {
        const lit = /"[^"\n]*"/.exec(full);
        return lit ? `${pfx}${lit[0]}` : full;
      },
    );
    // Additional collapse for mixed chains where identifier appears after intermediate literals
    updated = updated.replace(
      /"[^"\n]*"(?:\s*\+\s*"[^"\n]*")+\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*[^,}\]]*/g,
      (match) => {
        const reFirst = /^"[^"\n]*"/;
        const firstLit = reFirst.exec(match);
        return firstLit ? firstLit[0] : match;
      },
    );
    // Merge pure literal chains (allow slightly longer)
    updated = updated.replace(/"[^"\n]*"(?:\s*\+\s*"[^"\n]*"){1,10}(?=\s*[,}\]])/g, (chain) => {
      const tokens = chain
        .split(/\s*\+\s*/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (!tokens.length) return chain;
      const merged = tokens
        .map((t) => {
          if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
            return t.substring(1, t.length - 1);
          }
          return t;
        })
        .join("");
      return `"${merged}"`;
    });
  }

  // Final cleanup: chains with identifier anywhere collapse to first literal
  updated = updated.replace(
    /"[^"\n]*"\s*\+\s*[A-Za-z_][A-Za-z0-9_.()]*\b(?:\s*\+\s*"[^"\n]*")*/g,
    (m) => {
      const first = /"[^"\n]*"/.exec(m);
      return first ? first[0] : m;
    },
  );
  return updated;
}

/** Optional sanitizer interface wrapper for heavier pipeline inclusion (not yet toggled). */
export const concatenationChainSanitizer: Sanitizer = (input) => {
  const result = normalizeConcatenationChains(input);
  if (result !== input) {
    return { content: result, changed: true, description: "Normalized concatenation chains" };
  }
  return { content: input, changed: false };
};

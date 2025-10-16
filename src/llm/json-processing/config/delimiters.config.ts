/**
 * Centralized delimiter and structural character constants used across JSON sanitization.
 * Having these in one place eliminates magic strings and makes future enhancements
 * (e.g., adding support for single quotes in relaxed modes) easier.
 */
export const DELIMITERS = Object.freeze({
  OPEN_BRACE: "{",
  CLOSE_BRACE: "}",
  OPEN_BRACKET: "[",
  CLOSE_BRACKET: "]",
  DOUBLE_QUOTE: '"',
  BACKSLASH: "\\",
  COMMA: ",",
  COLON: ":",
  SPACE: " ",
  TAB: "\t",
  NEWLINE: "\n",
  CARRIAGE_RETURN: "\r",
});

export type DelimiterKey = keyof typeof DELIMITERS;

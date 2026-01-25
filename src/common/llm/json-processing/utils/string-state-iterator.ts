/**
 * Utilities for tracking string state while iterating through JSON content.
 *
 * JSON parsing often requires tracking whether we're currently inside a string literal
 * to determine how to handle certain characters (e.g., whether a backslash is an escape
 * sequence or literal, whether a control character should be escaped or removed).
 *
 * This module provides a generator function that handles the common state tracking
 * logic, yielding character-by-character information about the current parsing state.
 */

/**
 * Information about a character's position and state within JSON content.
 */
export interface StringStateInfo {
  /** The current character being processed */
  readonly char: string;
  /** The character code of the current character */
  readonly charCode: number;
  /** The index of the character in the original string */
  readonly index: number;
  /** Whether this character is inside a JSON string literal */
  readonly inString: boolean;
  /**
   * Whether this character is escaped (preceded by an odd number of backslashes).
   * Only meaningful when `inString` is true.
   */
  readonly isEscaped: boolean;
  /**
   * The next character in the string, or undefined if at the end.
   * Useful for lookahead when processing escape sequences.
   */
  readonly nextChar: string | undefined;
  /** The original input string being iterated */
  readonly content: string;
}

/**
 * Generator function that iterates through a string while tracking JSON string state.
 *
 * This function handles the complexity of determining whether we're inside a string
 * literal by:
 * - Tracking when we encounter unescaped quote characters
 * - Counting preceding backslashes to determine if quotes/backslashes are escaped
 * - Properly handling edge cases like consecutive backslashes
 *
 * ## Usage
 *
 * ```typescript
 * let output = "";
 * for (const state of iterateWithStringState(content)) {
 *   if (state.inString) {
 *     // Handle character inside string
 *     if (state.char === '\\' && state.nextChar === '0') {
 *       output += '\\u0000'; // Convert \0 to valid JSON
 *       // Note: you need to track index advancement yourself
 *     }
 *   } else {
 *     // Handle character outside string
 *     output += state.char;
 *   }
 * }
 * ```
 *
 * ## Important Notes
 *
 * - The generator yields every character sequentially
 * - When you need to skip characters (e.g., after processing an escape sequence),
 *   you must manage that externally by checking the index
 * - The `isEscaped` property only indicates if the current character follows a backslash
 *   that was itself not escaped; it doesn't handle multi-character escape sequences
 *
 * @param content - The JSON content to iterate through
 * @yields StringStateInfo for each character in the content
 */
export function* iterateWithStringState(
  content: string,
): Generator<StringStateInfo, void, unknown> {
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const charCode = char.charCodeAt(0);
    const nextChar = i + 1 < content.length ? content[i + 1] : undefined;

    // Determine if current character is escaped
    const isEscaped = escapeNext;

    // If we just processed an escape, reset the flag
    if (escapeNext) {
      escapeNext = false;
    } else if (inString && char === "\\") {
      // Inside a string, backslash escapes the next character
      escapeNext = true;
    }

    // Handle string boundary detection
    if (char === '"' && !isEscaped) {
      // An unescaped quote toggles string state
      // But we need to verify it's actually unescaped by counting preceding backslashes
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && content[j] === "\\") {
        backslashCount++;
        j--;
      }
      // Even number of backslashes means the quote is not escaped
      if (backslashCount % 2 === 0) {
        // Yield with current state BEFORE toggling
        yield {
          char,
          charCode,
          index: i,
          inString,
          isEscaped,
          nextChar,
          content,
        };
        inString = !inString;
        continue;
      }
    }

    yield {
      char,
      charCode,
      index: i,
      inString,
      isEscaped,
      nextChar,
      content,
    };
  }
}

/**
 * Creates a string state tracker that can be manually advanced.
 *
 * This is useful when you need more control over iteration, such as when
 * processing multi-character escape sequences and needing to skip characters.
 *
 * ## Usage
 *
 * ```typescript
 * const tracker = createStringStateTracker(content);
 * let output = "";
 * let i = 0;
 *
 * while (i < content.length) {
 *   const state = tracker.getStateAt(i);
 *
 *   if (state.inString && content[i] === '\\' && content[i + 1] === '0') {
 *     output += '\\u0000';
 *     i += 2; // Skip both characters
 *     tracker.advanceTo(i);
 *     continue;
 *   }
 *
 *   output += content[i];
 *   i++;
 *   tracker.advance();
 * }
 * ```
 *
 * @param content - The JSON content to track state for
 * @returns A StringStateTracker object
 */
export function createStringStateTracker(content: string): StringStateTracker {
  return new StringStateTrackerImpl(content);
}

/**
 * Interface for a manual string state tracker.
 */
export interface StringStateTracker {
  /** The current position in the content */
  readonly position: number;

  /** Whether we're currently inside a string */
  readonly inString: boolean;

  /** The total length of the content */
  readonly length: number;

  /**
   * Gets the current string state without advancing the position.
   * @returns Current state information, or undefined if past end of content
   */
  getCurrentState(): StringStateInfo | undefined;

  /**
   * Gets the string state at a specific index.
   * Note: This recomputes state from the beginning, so it can be slow for random access.
   * @param index - The index to get state for
   * @returns State information at the index, or undefined if index is out of bounds
   */
  getStateAt(index: number): StringStateInfo | undefined;

  /**
   * Advances the tracker by one character and returns the new state.
   * @returns The state after advancing, or undefined if at end
   */
  advance(): StringStateInfo | undefined;

  /**
   * Advances the tracker to a specific index.
   * @param index - The index to advance to
   */
  advanceTo(index: number): void;
}

/**
 * Implementation of the StringStateTracker interface.
 */
class StringStateTrackerImpl implements StringStateTracker {
  private _position = 0;
  private _inString = false;
  private _escapeNext = false;
  private readonly _content: string;

  constructor(content: string) {
    this._content = content;
  }

  get position(): number {
    return this._position;
  }

  get inString(): boolean {
    return this._inString;
  }

  get length(): number {
    return this._content.length;
  }

  getCurrentState(): StringStateInfo | undefined {
    if (this._position >= this._content.length) {
      return undefined;
    }
    return this._createStateInfo(this._position);
  }

  getStateAt(index: number): StringStateInfo | undefined {
    if (index < 0 || index >= this._content.length) {
      return undefined;
    }

    // If requesting current or future position, we can use current state
    if (index >= this._position) {
      // Advance to the requested position
      while (this._position < index) {
        this._advanceInternal();
      }
      return this._createStateInfo(index);
    }

    // If requesting past position, we need to recompute from beginning
    // This is expensive but maintains correctness
    const savedPosition = this._position;
    const savedInString = this._inString;
    const savedEscapeNext = this._escapeNext;

    this._position = 0;
    this._inString = false;
    this._escapeNext = false;

    while (this._position < index) {
      this._advanceInternal();
    }

    const result = this._createStateInfo(index);

    // Restore state
    this._position = savedPosition;
    this._inString = savedInString;
    this._escapeNext = savedEscapeNext;

    return result;
  }

  advance(): StringStateInfo | undefined {
    if (this._position >= this._content.length) {
      return undefined;
    }
    this._advanceInternal();
    return this.getCurrentState();
  }

  advanceTo(index: number): void {
    if (index < this._position) {
      // Need to reset and recompute
      this._position = 0;
      this._inString = false;
      this._escapeNext = false;
    }
    while (this._position < index && this._position < this._content.length) {
      this._advanceInternal();
    }
  }

  private _advanceInternal(): void {
    if (this._position >= this._content.length) {
      return;
    }

    const char = this._content[this._position];

    if (this._escapeNext) {
      this._escapeNext = false;
    } else if (this._inString && char === "\\") {
      this._escapeNext = true;
    } else if (char === '"') {
      // Check if quote is escaped by counting preceding backslashes
      let backslashCount = 0;
      let j = this._position - 1;
      while (j >= 0 && this._content[j] === "\\") {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) {
        this._inString = !this._inString;
      }
    }

    this._position++;
  }

  private _createStateInfo(index: number): StringStateInfo {
    const char = this._content[index];
    return {
      char,
      charCode: char.charCodeAt(0),
      index,
      inString: this._inString,
      isEscaped: this._escapeNext,
      nextChar: index + 1 < this._content.length ? this._content[index + 1] : undefined,
      content: this._content,
    };
  }
}

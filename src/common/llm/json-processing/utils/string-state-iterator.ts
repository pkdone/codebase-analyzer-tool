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

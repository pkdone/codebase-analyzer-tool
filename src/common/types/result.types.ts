/**
 * A discriminated union type representing either a successful result with a value
 * or a failed result with an error. This pattern enforces explicit error handling
 * and eliminates the ambiguity of null returns.
 *
 * This is the generic `Result` type for general-purpose use. For LLM operations
 * that need to track execution metadata (which model succeeded in a fallback chain),
 * use the specialized {@link LLMResult} type from the LLM module.
 *
 * @template T - The type of the success value
 * @template E - The type of the error (defaults to Error)
 *
 * @see {@link file://../llm/types/llm-result.types.ts | LLMResult} - For LLM-specific results with model metadata
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, Error> {
 *   if (b === 0) {
 *     return err(new Error("Division by zero"));
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export type Result<T, E = Error> = OkResult<T> | ErrResult<E>;

/**
 * Represents a successful result containing a value.
 */
export interface OkResult<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Represents a failed result containing an error.
 */
export interface ErrResult<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Creates a successful Result containing the given value.
 *
 * @param value - The success value to wrap
 * @returns An OkResult containing the value
 *
 * @example
 * ```typescript
 * const result = ok(42);
 * // result.ok === true
 * // result.value === 42
 * ```
 */
export function ok<T>(value: T): OkResult<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result containing the given error.
 *
 * @param error - The error to wrap
 * @returns An ErrResult containing the error
 *
 * @example
 * ```typescript
 * const result = err(new Error("Something went wrong"));
 * // result.ok === false
 * // result.error.message === "Something went wrong"
 * ```
 */
export function err<E>(error: E): ErrResult<E> {
  return { ok: false, error };
}

/**
 * Type guard that checks if a Result is successful (Ok).
 *
 * @param result - The Result to check
 * @returns True if the result is Ok, false otherwise
 *
 * @example
 * ```typescript
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   // TypeScript knows result.value exists here
 *   console.log(result.value);
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is OkResult<T> {
  return result.ok;
}

/**
 * Type guard that checks if a Result is failed (Err).
 *
 * @param result - The Result to check
 * @returns True if the result is Err, false otherwise
 *
 * @example
 * ```typescript
 * const result = divide(10, 0);
 * if (isErr(result)) {
 *   // TypeScript knows result.error exists here
 *   console.error(result.error);
 * }
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is ErrResult<E> {
  return !result.ok;
}

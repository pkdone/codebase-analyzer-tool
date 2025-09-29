/**
 * Interface representing the result of a sanitizer operation.
 */
export interface SanitizerResult {
  content: string;
  changed: boolean;
  description?: string;
}

/**
 * Type definition for a sanitizer function.
 */
export type Sanitizer = (input: string) => SanitizerResult;

/**
 * Interface representing the result of a sanitizer operation.
 */
export interface SanitizerResult {
  content: string;
  changed: boolean;
  description?: string;
  /**
   * Optional array of diagnostic messages providing details about specific
   * patterns matched and changes made by this sanitizer.
   * Useful for debugging JSON processing issues.
   */
  diagnostics?: string[];
}

/**
 * Type definition for a sanitizer function.
 */
export type Sanitizer = (input: string) => SanitizerResult;

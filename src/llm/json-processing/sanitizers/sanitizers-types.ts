export interface SanitizerResult {
  content: string;
  changed: boolean;
  description?: string;
}

export type Sanitizer = (input: string) => SanitizerResult;

export interface ParsingOutcome {
  parsed: unknown;
  steps: string[];
  resilientDiagnostics?: string;
}

export interface SanitizationStepLog {
  step: string;
  detail?: string;
}

export interface SchemaValidationIssueSummary {
  issues: unknown;
}

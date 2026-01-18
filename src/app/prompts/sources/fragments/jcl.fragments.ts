/**
 * JCL (Job Control Language)-specific instruction fragments.
 */
export const JCL_SPECIFIC_FRAGMENTS = {
  EXEC_STATEMENTS: "Extract all EXEC statements to identify programs/procedures called",
  DD_STATEMENTS: "Identify DD statements for file I/O",
  COND_PARAMETERS: "Note COND parameters that indicate job dependencies",
  SORT_UTILITIES: "Look for SORT, IEBGENER, or custom program calls",
} as const;

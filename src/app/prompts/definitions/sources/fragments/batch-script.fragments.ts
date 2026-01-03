/**
 * Batch script-specific instruction fragments.
 */
export const BATCH_SCRIPT_SPECIFIC_FRAGMENTS = {
  TASK_SCHEDULER: "Look for Windows Task Scheduler references (schtasks, AT commands)",
  DATABASE_OPS: "Identify database operations (sqlcmd, osql, BCP)",
  NETWORK_OPS: "Note network operations (NET USE, COPY to UNC paths)",
  SERVICE_OPS: "Identify service operations (NET START, SC commands)",
} as const;

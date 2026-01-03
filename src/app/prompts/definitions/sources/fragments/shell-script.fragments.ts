/**
 * Shell script-specific instruction fragments.
 */
export const SHELL_SCRIPT_SPECIFIC_FRAGMENTS = {
  CRON_EXPRESSIONS:
    "Look for cron expressions in comments like '# Cron: 0 2 * * *' or systemd timer references",
  DATABASE_OPS: "Identify database operations (mysql, psql, mongo commands)",
  EXTERNAL_API_CALLS: "Note any external API calls (curl, wget)",
} as const;

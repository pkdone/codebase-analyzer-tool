/**
 * Default date/time format options for display purposes.
 */
const DEFAULT_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/**
 * Format a date for display in reports and UI.
 *
 * When a locale is specified, uses Intl.DateTimeFormat for locale-specific formatting.
 * When no locale is specified, returns an ISO string format for locale neutrality.
 *
 * @param date - The date to format. Defaults to the current date/time.
 * @param locale - The locale to use for formatting (e.g., "en-GB", "en-US").
 *                 If not provided, returns ISO format (locale-neutral).
 * @param options - Intl.DateTimeFormat options. Defaults to standard date-time format.
 * @returns The formatted date string
 *
 * @example
 * // Default (current date, ISO format)
 * formatDateForDisplay()
 * // => "2024-01-25T12:30:00.000Z"
 *
 * @example
 * // With locale (DD/MM/YYYY, HH:mm:ss format for en-GB)
 * formatDateForDisplay(new Date(), "en-GB")
 * // => "25/01/2024, 12:30:00"
 *
 * @example
 * // With custom date and locale
 * formatDateForDisplay(new Date("2024-01-25"), "en-US")
 * // => "01/25/2024, 00:00:00"
 */
export function formatDateForDisplay(
  date: Date = new Date(),
  locale?: string,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT_OPTIONS,
): string {
  if (locale === undefined) {
    // Return ISO format for locale neutrality when no locale specified
    return date.toISOString();
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Format date for logging purposes.
 * Uses ISO string format for consistency and parseability.
 *
 * @param date - The date to format. Defaults to the current date/time.
 * @returns ISO 8601 formatted date string
 */
export function formatDateForLogging(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Format date for use in filenames.
 * Replaces colons and dots with hyphens for filesystem compatibility.
 *
 * @param date - The date to format. Defaults to the current date/time.
 * @returns Filesystem-safe date string
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().replaceAll(/[:.]/g, "-");
}

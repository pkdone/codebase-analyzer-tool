// Reusable formatter instances to avoid recreating them on each call
const displayFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit',
  hour12: false
});

/**
 * Format date for display in reports and UI.
 * Uses consistent format: "DD/MM/YYYY, HH:mm:ss"
 */
export function formatDateForDisplay(): string {
  return displayFormatter.format(new Date());
}

/**
 * Format date for logging purposes.
 * Uses ISO string format for consistency and parseability.
 */
export function formatDateForLogging(): string {
  return new Date().toISOString();
}

/**
 * Format date for use in filenames.
 * Replaces colons and dots with hyphens for filesystem compatibility.
 */
export function formatDateForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}


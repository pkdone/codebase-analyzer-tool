/**
 * Utility class for collecting diagnostic messages during JSON sanitization.
 * Encapsulates the common pattern of tracking diagnostics with a configurable limit.
 *
 * This eliminates the repetitive pattern of:
 *   `if (diagnostics.length < processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY) { diagnostics.push(...) }`
 *
 * Usage:
 *   const collector = new DiagnosticCollector(20);
 *   collector.add("Fixed something");
 *   return { diagnostics: collector.getAll() };
 */
export class DiagnosticCollector {
  private readonly diagnostics: string[] = [];

  /**
   * Creates a new DiagnosticCollector with a maximum number of messages to collect.
   * @param maxDiagnostics Maximum number of diagnostic messages to store
   */
  constructor(private readonly maxDiagnostics: number) {}

  /**
   * Adds a diagnostic message if the limit hasn't been reached.
   * @param message The diagnostic message to add
   * @returns true if the message was added, false if the limit was reached
   */
  add(message: string): boolean {
    if (this.diagnostics.length >= this.maxDiagnostics) {
      return false;
    }
    this.diagnostics.push(message);
    return true;
  }

  /**
   * Returns all collected diagnostic messages.
   * @returns A new array containing all collected messages
   */
  getAll(): string[] {
    return [...this.diagnostics];
  }
}

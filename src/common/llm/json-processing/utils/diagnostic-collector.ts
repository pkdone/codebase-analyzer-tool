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
 *   collector.addConditional(someCondition, "Conditionally fixed");
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
   * Returns the current count of diagnostic messages.
   */
  get count(): number {
    return this.diagnostics.length;
  }

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
   * Conditionally adds a diagnostic message if the condition is true and limit not reached.
   * @param condition The condition to check before adding
   * @param message The diagnostic message to add
   * @returns true if the message was added, false otherwise
   */
  addConditional(condition: boolean, message: string): boolean {
    if (!condition) {
      return false;
    }
    return this.add(message);
  }

  /**
   * Returns all collected diagnostic messages.
   * @returns A new array containing all collected messages
   */
  getAll(): string[] {
    return [...this.diagnostics];
  }

  /**
   * Checks if the collector has reached its maximum capacity.
   */
  hasReachedLimit(): boolean {
    return this.diagnostics.length >= this.maxDiagnostics;
  }

  /**
   * Checks if the collector is empty.
   */
  isEmpty(): boolean {
    return this.diagnostics.length === 0;
  }

  /**
   * Clears all collected diagnostics.
   */
  clear(): void {
    this.diagnostics.length = 0;
  }
}

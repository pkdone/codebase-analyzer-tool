import pLimit from "p-limit";
import { logErrorMsgAndDetail } from "./logging";

/**
 * Result summary for concurrent processing operations.
 */
export interface ProcessingResult {
  successes: number;
  failures: number;
}

/**
 * Process a list of items concurrently with a specified concurrency limit.
 * Handles error logging and provides summary statistics.
 *
 * @param items Array of items to process
 * @param processor Function to process each item
 * @param concurrency Maximum number of concurrent operations
 * @param itemName Descriptive name for items (e.g., "file", "question") used in logging
 * @returns Promise resolving to processing statistics
 */
export async function processItemsConcurrently<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number,
  itemName: string,
): Promise<ProcessingResult> {
  const limit = pLimit(concurrency);
  const tasks = items.map(async (item) => limit(async () => processor(item)));
  const results = await Promise.allSettled(tasks);
  const { successes, failures } = results.reduce(
    (acc, result, index) => {
      if (result.status === 'fulfilled') {
        acc.successes++;
      } else {
        acc.failures++;
        logErrorMsgAndDetail(`Failed to process ${itemName}: ${String(items[index])}`, result.reason);
      }
      return acc;
    },
    { successes: 0, failures: 0 }
  );
  console.log(
    `Processed ${items.length} ${itemName}s. Succeeded: ${successes}, Failed: ${failures}`,
  );
  
  if (failures > 0) {
    console.warn(
      `Warning: ${failures} ${itemName}s failed to process. Check logs for details.`,
    );
  }

  return { successes, failures };
}

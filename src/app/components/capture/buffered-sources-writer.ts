import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { SourceRecord } from "../../repositories/sources/sources.model";
import { repositoryTokens } from "../../di/tokens";
import { logErr } from "../../../common/utils/logging";

/** Default batch size for bulk database inserts */
const DEFAULT_BATCH_SIZE = 200;

/**
 * A buffered writer for source records that batches inserts for improved performance.
 *
 * This class encapsulates the buffering pattern for database inserts, providing:
 * - Automatic batching of records up to a configurable batch size
 * - Graceful fallback to individual inserts on batch failure
 * - Clear separation between orchestration logic and database optimization
 *
 * ## Usage Pattern
 * ```typescript
 * const writer = new BufferedSourcesWriter(repository);
 * for (const record of records) {
 *   await writer.queueRecord(record); // Automatically flushes when batch size is reached
 * }
 * await writer.flush(); // Flush any remaining records
 * ```
 *
 * ## Thread Safety
 * This class is NOT thread-safe. Each instance maintains its own buffer state
 * and should be used within a single async operation context. For concurrent
 * file processing, use a single instance and ensure `queueRecord` calls are serialized
 * at the buffer level (not the file processing level).
 */
@injectable()
export class BufferedSourcesWriter {
  /** Buffer for collecting records to batch insert */
  private recordBuffer: SourceRecord[] = [];

  /**
   * Constructor.
   * @param sourcesRepository - Repository for storing source file data
   * @param batchSize - Number of records to accumulate before auto-flushing (default: 200)
   */
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    private readonly batchSize: number = DEFAULT_BATCH_SIZE,
  ) {}

  /**
   * Get the current number of buffered records.
   * Useful for testing and monitoring.
   */
  get bufferedCount(): number {
    return this.recordBuffer.length;
  }

  /**
   * Queue a record into the buffer. Automatically flushes when batch size is reached.
   *
   * @param record - The source record to queue
   */
  async queueRecord(record: SourceRecord): Promise<void> {
    this.recordBuffer.push(record);

    if (this.recordBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Flush all buffered records to the database.
   * Should be called after all records have been added to ensure no data is lost.
   *
   * If batch insert fails, falls back to individual inserts to maximize data persistence.
   */
  async flush(): Promise<void> {
    if (this.recordBuffer.length === 0) return;

    const batch = [...this.recordBuffer];
    this.recordBuffer = [];

    try {
      await this.sourcesRepository.insertSources(batch);
    } catch (error: unknown) {
      // If batch insert fails, fall back to individual inserts
      logErr(`Batch insert failed, falling back to individual inserts`, error);

      for (const record of batch) {
        try {
          await this.sourcesRepository.insertSource(record);
        } catch (insertError: unknown) {
          logErr(`Failed to insert record for: ${record.filepath}`, insertError);
        }
      }
    }
  }

  /**
   * Reset the buffer without flushing.
   * Useful for starting a new batch operation.
   */
  reset(): void {
    this.recordBuffer = [];
  }
}

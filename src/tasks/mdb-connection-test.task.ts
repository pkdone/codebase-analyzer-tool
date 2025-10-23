import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "./task.types";
import type { SourcesRepository } from "../repositories/sources/sources.repository.interface";
import { TOKENS } from "../tokens";

/**
 * Task to test the MongoDB connection.
 */
@injectable()
export class MongoConnectionTestTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
  ) {}

  /**
   * Execute the task - tests the MongoDB connection.
   */
  async execute(): Promise<void> {
    await this.testConnection();
  }

  private async testConnection(): Promise<void> {
    const result = await this.sourcesRepository.getProjectFilesPaths(this.projectName);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
}

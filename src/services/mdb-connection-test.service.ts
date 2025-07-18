import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Service } from "../lifecycle/service.types";
import type { SourcesRepository } from "../repositories/source/sources.repository.interface";
import { TOKENS } from "../di/tokens";

/**
 * Service to test the MongoDB connection.
 */
@injectable()
export class MDBConnectionTestService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
  ) {}

  /**
   * Execute the service - tests the MongoDB connection.
   */
  async execute(): Promise<void> {
    await this.testConnection();
  }

  private async testConnection(): Promise<void> {
    const result = await this.sourcesRepository.getProjectFilesPaths(this.projectName);
    console.log("Result:", JSON.stringify(result, null, 2));
  }
}

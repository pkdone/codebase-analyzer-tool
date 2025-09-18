import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import type { ProjectedTopLevelJavaClassDependencies } from "../../../repositories/source/sources.model";
import { TOKENS } from "../../../di/tokens";

/**
 * Data provider responsible for aggregating code structure information for reports.
 * Handles class dependencies, architectural patterns, and code organization.
 */
@injectable()
export class CodeStructureDataProvider {
  constructor(
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Returns a list of top-level Java classes (classes not depended on by other classes).
   */
  async getTopLevelJavaClasses(
    projectName: string,
  ): Promise<ProjectedTopLevelJavaClassDependencies[]> {
    return this.sourcesRepository.getProjectTopLevelJavaClasses(projectName);
  }
}

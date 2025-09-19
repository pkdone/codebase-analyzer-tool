import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/source/sources.repository.interface";
import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../../repositories/source/sources.model";
import { TOKENS } from "../../../di/tokens";
import { convertToHierarchical } from "../utils/dependency-tree-builder";

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
   * Returns a list of top-level Java classes with hierarchical dependency structure.
   */
  async getTopLevelJavaClasses(
    projectName: string,
  ): Promise<HierarchicalTopLevelJavaClassDependencies[]> {
    const flatData: ProjectedTopLevelJavaClassDependencies[] =
      await this.sourcesRepository.getProjectTopLevelJavaClasses(projectName);
    return flatData.map(
      (
        classData: ProjectedTopLevelJavaClassDependencies,
      ): HierarchicalTopLevelJavaClassDependencies => convertToHierarchical(classData),
    );
  }
}

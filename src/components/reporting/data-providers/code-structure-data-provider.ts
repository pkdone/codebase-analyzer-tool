import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../../repositories/sources/sources.model";
import { repositoryTokens } from "../../../di/repositories.tokens";
import { convertToHierarchical } from "../utils/dependency-tree-builder";
import { fileTypeMappingsConfig } from "../../../config/file-types.config";

/**
 * Data provider responsible for aggregating code structure information for reports.
 * Handles class dependencies, architectural patterns, and code organization.
 */
@injectable()
export class CodeStructureDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Returns a list of top-level Java classes with hierarchical dependency structure.
   */
  async getTopLevelJavaClasses(
    projectName: string,
  ): Promise<HierarchicalTopLevelJavaClassDependencies[]> {
    const flatData: ProjectedTopLevelJavaClassDependencies[] =
      await this.sourcesRepository.getTopLevelClassDependencies(
        projectName,
        fileTypeMappingsConfig.JAVA_FILE_TYPE,
      );
    return flatData.map(
      (
        classData: ProjectedTopLevelJavaClassDependencies,
      ): HierarchicalTopLevelJavaClassDependencies => convertToHierarchical(classData),
    );
  }
}

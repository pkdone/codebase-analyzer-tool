/**
 * Repository layer tokens grouped for cohesion.
 */
export const repositoryTokens = {
  SourcesRepository: Symbol("ISourcesRepository"),
  AppSummariesRepository: Symbol("IAppSummariesRepository"),
} as const;

export type RepositoryToken = keyof typeof repositoryTokens;

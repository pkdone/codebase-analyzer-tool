/**
 * Repository layer tokens grouped for cohesion.
 */
import { TOKENS } from "../tokens";

export const repositoryTokens = {
  SourcesRepository: TOKENS.SourcesRepository,
  AppSummariesRepository: TOKENS.AppSummariesRepository,
} as const;

export type RepositoryToken = keyof typeof repositoryTokens;

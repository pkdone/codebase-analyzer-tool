/**
 * Repository layer tokens grouped for cohesion.
 */
import { TOKENS } from "../tokens";

export const repositoryTokens = {
  SourcesRepository: TOKENS.SourcesRepository,
  AppSummaryRepository: TOKENS.AppSummaryRepository,
} as const;

export type RepositoryToken = keyof typeof repositoryTokens;

import { z } from "zod";
import { sourceConfigMap } from "./sources.config";
import type { CanonicalFileType } from "../../../components/capture/config/file-types.config";

// Type assertion helper - the schemas in sourceConfigMap are created via
// sourceSummarySchema.pick() which always produces ZodObject, but TypeScript
// needs a cast because the interface types responseSchema as z.ZodType.
type ZodObjectType = z.ZodObject<z.ZodRawShape>;

/**
 * Strongly-typed mapping of canonical file types to their Zod schemas.
 * This preserves type information for compile-time inference, unlike the
 * PromptDefinition.responseSchema which is typed as z.ZodType.
 *
 * This mirrors the pattern used in app-summaries.schema.ts for appSummaryCategorySchemas,
 * enabling strong type safety throughout the file summarization call chain.
 *
 * Schemas are now derived directly from sourceConfigMap.responseSchema, eliminating
 * the intermediate schemaFields array and providing explicit, type-safe schema definitions.
 *
 * Use this mapping when you need TypeScript to infer the correct return type
 * based on a file type key, rather than getting a generic z.ZodType.
 */
export const sourcePromptSchemas = {
  java: sourceConfigMap.java.responseSchema as ZodObjectType,
  javascript: sourceConfigMap.javascript.responseSchema as ZodObjectType,
  sql: sourceConfigMap.sql.responseSchema as ZodObjectType,
  xml: sourceConfigMap.xml.responseSchema as ZodObjectType,
  jsp: sourceConfigMap.jsp.responseSchema as ZodObjectType,
  markdown: sourceConfigMap.markdown.responseSchema as ZodObjectType,
  csharp: sourceConfigMap.csharp.responseSchema as ZodObjectType,
  ruby: sourceConfigMap.ruby.responseSchema as ZodObjectType,
  maven: sourceConfigMap.maven.responseSchema as ZodObjectType,
  gradle: sourceConfigMap.gradle.responseSchema as ZodObjectType,
  ant: sourceConfigMap.ant.responseSchema as ZodObjectType,
  npm: sourceConfigMap.npm.responseSchema as ZodObjectType,
  python: sourceConfigMap.python.responseSchema as ZodObjectType,
  "dotnet-proj": sourceConfigMap["dotnet-proj"].responseSchema as ZodObjectType,
  nuget: sourceConfigMap.nuget.responseSchema as ZodObjectType,
  "ruby-bundler": sourceConfigMap["ruby-bundler"].responseSchema as ZodObjectType,
  "python-pip": sourceConfigMap["python-pip"].responseSchema as ZodObjectType,
  "python-setup": sourceConfigMap["python-setup"].responseSchema as ZodObjectType,
  "python-poetry": sourceConfigMap["python-poetry"].responseSchema as ZodObjectType,
  "shell-script": sourceConfigMap["shell-script"].responseSchema as ZodObjectType,
  "batch-script": sourceConfigMap["batch-script"].responseSchema as ZodObjectType,
  jcl: sourceConfigMap.jcl.responseSchema as ZodObjectType,
  default: sourceConfigMap.default.responseSchema as ZodObjectType,
} as const satisfies Record<CanonicalFileType, ZodObjectType>;

/**
 * Type representing the strongly-typed file-type-to-schema mapping.
 * Use with z.infer<SourcePromptSchemas[FileType]> to get the inferred type for a file type.
 */
export type SourcePromptSchemas = typeof sourcePromptSchemas;

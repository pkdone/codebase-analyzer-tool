import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

export const dotnetprojPrompt: SourcePromptTemplate = {
  contentDesc: ".NET project file (.csproj, .vbproj, .fsproj)",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema.pick({
    purpose: true,
    implementation: true,
    dependencies: true,
  }),
  instructions: [
    {
      title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
      points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.DOTNET],
    },
  ],
};

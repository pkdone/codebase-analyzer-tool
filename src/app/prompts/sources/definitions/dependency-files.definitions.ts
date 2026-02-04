import { DEPENDENCY_EXTRACTION_FRAGMENTS } from "../fragments";
import { createDependencyConfig, type SourceConfigEntry } from "./source-config-factories";

/**
 * Literal type for dependency file types.
 * These are the canonical file types handled by the dependency configuration factory.
 */
export type DependencyFileType =
  | "maven"
  | "gradle"
  | "ant"
  | "npm"
  | "dotnet-proj"
  | "nuget"
  | "ruby-bundler"
  | "python-pip"
  | "python-setup"
  | "python-poetry"
  | "makefile";

/**
 * Source prompt definitions for dependency management files.
 * These use the createDependencyConfig factory to ensure consistent instruction patterns.
 *
 * The `satisfies Record<DependencyFileType, ...>` pattern enforces that:
 * 1. All file types defined in DependencyFileType must have corresponding entries
 * 2. No invalid file type keys can be added (compile-time error for typos)
 * 3. The literal key types for each entry are preserved
 */
export const dependencyFileDefinitions = {
  maven: createDependencyConfig(
    "the Maven POM (Project Object Model) build file",
    DEPENDENCY_EXTRACTION_FRAGMENTS.MAVEN,
  ),
  gradle: createDependencyConfig(
    "the Gradle build configuration file",
    DEPENDENCY_EXTRACTION_FRAGMENTS.GRADLE,
  ),
  ant: createDependencyConfig("the Apache Ant build.xml file", DEPENDENCY_EXTRACTION_FRAGMENTS.ANT),
  npm: createDependencyConfig(
    "the npm package.json or lock file",
    DEPENDENCY_EXTRACTION_FRAGMENTS.NPM,
  ),
  "dotnet-proj": createDependencyConfig(
    "the .NET project file (.csproj, .vbproj, .fsproj)",
    DEPENDENCY_EXTRACTION_FRAGMENTS.DOTNET,
  ),
  nuget: createDependencyConfig(
    "the NuGet packages.config file (legacy .NET)",
    DEPENDENCY_EXTRACTION_FRAGMENTS.NUGET,
  ),
  "ruby-bundler": createDependencyConfig(
    "the Ruby Gemfile or Gemfile.lock",
    DEPENDENCY_EXTRACTION_FRAGMENTS.RUBY_BUNDLER,
  ),
  "python-pip": createDependencyConfig(
    "the Python requirements.txt or Pipfile",
    DEPENDENCY_EXTRACTION_FRAGMENTS.PYTHON_PIP,
  ),
  "python-setup": createDependencyConfig(
    "the Python setup.py file",
    DEPENDENCY_EXTRACTION_FRAGMENTS.PYTHON_SETUP,
  ),
  "python-poetry": createDependencyConfig(
    "the Python pyproject.toml (Poetry)",
    DEPENDENCY_EXTRACTION_FRAGMENTS.PYTHON_POETRY,
  ),
  makefile: createDependencyConfig(
    "the C/C++ build configuration (CMake or Makefile)",
    DEPENDENCY_EXTRACTION_FRAGMENTS.MAKEFILE,
  ),
} satisfies Record<DependencyFileType, SourceConfigEntry>;

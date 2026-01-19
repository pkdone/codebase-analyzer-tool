import { DEPENDENCY_EXTRACTION_FRAGMENTS } from "../fragments";
import { createDependencyConfig, type SourceConfigEntry } from "./source-config-factories";

/**
 * Source prompt definitions for dependency management files.
 * These use the createDependencyConfig factory to ensure consistent instruction patterns.
 *
 * The `satisfies` pattern validates that the object conforms to the Record structure
 * while preserving the literal key types for each entry.
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
} satisfies Record<string, SourceConfigEntry>;

import { SOURCES_PROMPT_FRAGMENTS } from "../sources.fragments";
import { createDependencyConfig, type SourceConfigEntry } from "./shared-utilities";

/**
 * Source prompt definitions for dependency management files.
 * These use the createDependencyConfig factory to ensure consistent instruction patterns.
 */
export const dependencyFileDefinitions: Record<string, SourceConfigEntry> = {
  maven: createDependencyConfig(
    "the Maven POM (Project Object Model) build file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAVEN,
  ),
  gradle: createDependencyConfig(
    "the Gradle build configuration file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.GRADLE,
  ),
  ant: createDependencyConfig(
    "the Apache Ant build.xml file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.ANT,
  ),
  npm: createDependencyConfig(
    "the npm package.json or lock file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NPM,
  ),
  "dotnet-proj": createDependencyConfig(
    "the .NET project file (.csproj, .vbproj, .fsproj)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.DOTNET,
  ),
  nuget: createDependencyConfig(
    "the NuGet packages.config file (legacy .NET)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NUGET,
  ),
  "ruby-bundler": createDependencyConfig(
    "the Ruby Gemfile or Gemfile.lock",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.RUBY_BUNDLER,
  ),
  "python-pip": createDependencyConfig(
    "the Python requirements.txt or Pipfile",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_PIP,
  ),
  "python-setup": createDependencyConfig(
    "the Python setup.py file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_SETUP,
  ),
  "python-poetry": createDependencyConfig(
    "the Python pyproject.toml (Poetry)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_POETRY,
  ),
  makefile: createDependencyConfig(
    "the C/C++ build configuration (CMake or Makefile)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAKEFILE,
  ),
};

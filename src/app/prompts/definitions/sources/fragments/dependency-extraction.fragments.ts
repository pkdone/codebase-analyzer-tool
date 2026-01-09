/**
 * Dependency extraction instruction fragments for various build and package management systems.
 */
export const DEPENDENCY_EXTRACTION_FRAGMENTS = {
  MAVEN: `A comprehensive list of dependencies declared in this POM file - for each dependency extract:
  * name (artifactId)
  * groupId
  * version (resolve properties if possible, e.g., \${spring.version})
  * scope (compile, test, runtime, provided, import, system)
  * type (jar, war, pom, etc.)
  Note: Extract dependencies from both <dependencies> and <dependencyManagement> sections`,
  GRADLE: `A comprehensive list of dependencies declared - for each dependency extract:
  * name (artifact name after the colon, e.g., for 'org.springframework:spring-core:5.3.9' the name is 'spring-core')
  * groupId (group before the colon, e.g., 'org.springframework')
  * version (version number, or 'latest' if using dynamic versions)
  * scope (implementation, api, testImplementation, runtimeOnly, etc. - map these to standard Maven scopes)
  Handle both Groovy DSL and Kotlin DSL syntax`,
  ANT: `A comprehensive list of dependencies declared - for each dependency extract:
  * name (jar file name or artifact name)
  * groupId (organization or project name if specified)
  * version (extract from jar filename if versioned, e.g., 'commons-lang3-3.12.0.jar' -> version: '3.12.0')
  * scope (compile, test, runtime based on classpath definitions)
  Look for dependencies in <classpath>, <path>, <pathelement>, and <ivy:dependency> elements`,
  NPM: `A comprehensive list of dependencies - for each dependency extract:
  * name (package name)
  * version (semver version, remove ^ and ~ prefixes)
  * scope (dependencies = 'compile', devDependencies = 'test', peerDependencies = 'provided')
  Extract from both dependencies and devDependencies sections`,
  DOTNET: `A comprehensive list of PackageReference dependencies - for each dependency extract:
  * name (package name from Include attribute)
  * version (Version attribute value)
  * scope (compile for regular, test if in test project based on SDK type)
  Look for <PackageReference> elements in modern SDK-style projects`,
  NUGET: `A comprehensive list of package dependencies - for each package extract:
  * name (id attribute)
  * version (version attribute)
  * scope (compile, or test if targetFramework suggests test package)
  Parse all <package> elements in the configuration`,
  RUBY_BUNDLER: `A comprehensive list of gem dependencies - for each gem extract:
  * name (gem name)
  * version (specified version or version from Gemfile.lock, remove ~> and >= prefixes)
  * scope (default is 'compile', :development = 'test', :test = 'test')
  * groupId (use 'rubygems' as a standard groupId)
  Parse gem declarations including version constraints`,
  PYTHON_PIP: `A comprehensive list of package dependencies - for each package extract:
  * name (package name before == or >= or ~=)
  * version (version specifier, remove operators like ==, >=, ~=)
  * scope (default is 'compile', dev dependencies in Pipfile have scope 'test')
  * groupId (use 'pypi' as standard groupId)
  Handle various version specifiers: ==, >=, <=, ~=, and ranges`,
  PYTHON_SETUP: `A comprehensive list of dependencies from install_requires - for each package extract:
  * name (package name)
  * version (version from string, remove operators)
  * scope ('compile' for install_requires, 'test' for tests_require or extras_require['test'])
  * groupId (use 'pypi' as standard groupId)`,
  PYTHON_POETRY: `A comprehensive list of dependencies from [tool.poetry.dependencies] - for each dependency extract:
  * name (dependency key name)
  * version (version constraint, remove ^ and ~ prefixes)
  * scope ('compile' for dependencies, 'test' for dev-dependencies)
  * groupId (use 'pypi' as standard groupId)`,
  MAKEFILE: `A comprehensive list of dependencies from this C/C++ build configuration file. Handle CMake, Makefile, and Autotools syntax:
  FOR CMAKE (CMakeLists.txt):
  * find_package(PackageName VERSION) - extract package name, version, and REQUIRED/OPTIONAL
  * target_link_libraries(target PRIVATE|PUBLIC lib1 lib2) - extract linked library names
  * FetchContent_Declare(name GIT_REPOSITORY url GIT_TAG tag) - extract external project name and version/tag
  * ExternalProject_Add() - extract external project dependencies
  * pkg_check_modules(PREFIX REQUIRED pkg1 pkg2) - extract pkg-config package names
  * find_library(VAR NAMES libname) - extract library being searched
  FOR MAKEFILE (Makefile, GNUmakefile, Makefile.am):
  * LIBS or LDLIBS variables - extract library names (strip -l prefix, e.g., -lpthread -> pthread)
  * LDFLAGS with -l flags - extract library dependencies
  * pkg-config calls in shell commands - extract package names
  * Direct .a or .so references - extract library names
  FOR AUTOTOOLS (configure.ac, configure.in):
  * PKG_CHECK_MODULES(PREFIX, package >= version) - extract package name and version constraint
  * AC_CHECK_LIB(library, function) - extract library name
  * AC_CHECK_HEADERS([header.h]) - note as header dependency (optional: include if relevant)
  * AC_SEARCH_LIBS(function, libraries) - extract library names from the list
  * AM_PATH_* macros (e.g., AM_PATH_PYTHON) - extract package requirements
  * AX_* macros from autoconf-archive - extract relevant dependencies
  For each dependency provide:
  * name: library or package name
  * version: version if specified (or null if not available)
  * scope: 'compile' for linked libraries, 'test' for test-only dependencies
  * groupId: use 'system' for system libraries, 'pkg-config' for PKG_CHECK_MODULES packages, or 'autoconf' for AC_CHECK_* macros`,
} as const;

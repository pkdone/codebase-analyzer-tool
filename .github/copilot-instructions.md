# Coding Standards and Architectural Conventions

This document outlines the inferred coding standards, architectural patterns, and formatting conventions for the project. It is intended to help new developers contribute to the project with a consistent style and understanding of its structure.

## 1. Language(s) and Framework(s) Identification

*   **Primary Language:** TypeScript
*   **Runtime Environment:** Node.js
*   **Package Manager:** npm
*   **Major Libraries & Frameworks:**
    *   **LLM Interaction:**
        *   `openai` (for OpenAI and Azure OpenAI SDKs)
        *   `@google-cloud/aiplatform`, `@google-cloud/vertexai` (for Google Cloud Vertex AI)
        *   `@aws-sdk/client-bedrock-runtime` (for AWS Bedrock)
    *   **Database:** `mongodb` (MongoDB Node.js Driver)
    *   **Configuration:** `dotenv` (for environment variable management, often via `.env` file), `zod` (for environment variable validation and schema definition)
    *   **Testing:** `jest`, `ts-jest`
    *   **Linting:** `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
    *   **Model Context Protocol:** `@modelcontextprotocol/sdk` (for MCP server implementation)
    *   **Dependency Injection:** `tsyringe`, `reflect-metadata`    
    *   **Asynchronous Utilities:** `p-limit`, `p-retry`

## 2. Formatting and Style Conventions

*   **Indentation:**
    *   Spaces are used for indentation.
    *   **2 spaces** per indentation level is the prevalent style (e.g., `src/capture-sources.ts`, `src/codebaseDBLoader/codebase-loader.ts`).
*   **Line Endings & Spacing:**
    *   **Line Endings:** LF (Unix-style). The `.gitattributes` file specifies `* -crlf` which normalizes line endings to LF in the repository.
    *   **Blank Lines:**
        *   One blank line is used between top-level constructs (import blocks, functions, classes).
        *   One blank line between methods within a class.
        *   Blank lines are within functions/methods when multi-line if/else or for/while clauses occur (before and after that group)
    *   **Line Length:** 100 characters.
    *   **Trailing Commas:** Preferred in multi-line array and object literals where applicable (e.g., in some `config` files). The `eslint.config.mjs` includes `tseslint.configs.stylisticTypeChecked`, which typically encourages trailing commas. 
*   **Braces and Parentheses:**
    *   **Braces:** Opening braces (`{`) are placed on the **same line** as the declaration or control structure statement (a K&R style variant). This applies to functions, classes, methods, `if/else`, `for`, `while`, `try/catch/finally` blocks.
        ```typescript
        async function exampleFunction() {
            if (condition) {
                // ...
            } else {
                // ...
            }
        }
        ```
    *   **Parentheses:** Standard usage for function calls, control structure conditions, and grouping expressions. Spaces are generally used around operators within parentheses for readability (e.g., `(a + b)`).
*   **Import/Module Ordering:**
    *   Imports are grouped logically rather than strictly alphabetically. The general observed order is:
        1.  Third-party libraries (e.g., `mongodb`, `openai`).
        2.  Local project modules, often further grouped by their origin:
            *   Configuration files (e.g., `../config/database.config`)
            *   Type definitions (e.g., `../types/llm.types`)
            *   Utility functions (e.g., `../utils/fs-utils`)
            *   Other local modules (e.g., `./llm-router`, `../codebaseDBLoader/db-initializer`)
    *   Relative paths (`./`, `../`) are used for local module imports.
*   **Commenting:**
    *   **JSDoc-style comments (`/** ... */`)** are used for documenting classes, methods, functions, interfaces, and exported types. These often include a brief description, and `@param` / `@returns` tags where applicable.
    *   **Single-line comments (`//`)** are used for inline explanations or brief notes.
    *   ESLint disable/enable comments (`/* eslint-disable ... */`, `/* eslint-enable ... */`) are used for temporarily bypassing linting rules, particularly noted in `NOTES.txt` for prototyping.

## 3. Naming Conventions

*   **Variables & Parameters:** `camelCase` (e.g., `srcDirPath`, `mongoClient`, `llmRouter`, `projectName`).
*   **Functions/Methods:** `camelCase` (e.g., `main`, `loadIntoDB`, `getProjectNameFromPath`, `buildSourceFileListSummaryList`).
*   **Classes/Interfaces/Type Aliases:** `PascalCase` (e.g., `CodebaseToDBLoader`, `DBInitializer`, `LLMRouter`, `EnvVars`, `LLMProviderImpl`).
*   **Constants:** `UPPER_SNAKE_CASE` for true constants, especially those defined in configuration files or as module-level constants (e.g., `CODEBASE_DB_NAME`, `UTF8_ENCODING`, `AZURE_OPENAI_LLM_API_KEY_KEY`). Environment variable names also follow this convention.
*   **Enums:** Enum names are `PascalCase`, and enum members are `UPPER_SNAKE_CASE` (e.g., `LLMPurpose.EMBEDDINGS`, `LLMResponseStatus.COMPLETED`).
*   **Files and Directories:**
    *   **TypeScript files (`.ts`):** Use `kebab-case.ts` (e.g., `capture-sources.ts`, `llm-router.ts`).
    *   **Configuration files:** `camelCase.config.ts` (e.g., `database.config.ts`).
    *   **Type definition files:** `camelCase.types.ts` (e.g., `env.types.ts`).
    *   **Test files:** `kebab-case.test.ts` for unit tests, `kebab-case.int.test.ts` for integration tests.
    *   **Prompt files (`.prompt`):** `kebab-case.prompt` (e.g., `java-file-summary.prompt`).
    *   **Directories:**
        *   Directories under `src/` are `camelCase` (e.g., `codebaseDBLoader`, `insightGenerator`).

## 4. Architectural Patterns and Code Structure

*   **Overall Architecture:**
        *   The project is a **collection of command-line interface (CLI) tools** designed for analyzing codebases using Large Language Models (LLMs).
        *   The core of the project follows a **Layered Architecture**. This is evident from the separation of concerns into distinct directories: `repositories` (Data Access Layer), `components` and `tasks` (Business/Application Layer), `llm` (LLM Service Layer), and `cli` (Presentation/Entry-point Layer).
        *   **Dependency Injection (DI)** is a core principle, implemented using `tsyringe` to manage dependencies between layers and components, promoting loose coupling.
        *   A **Manifest-Driven** approach is used for LLM providers, allowing for pluggable and configurable LLM implementations without changing core logic.
        *   An emerging **Service-Oriented** component is present with `start-mcp-server.ts`, which implements a server using the Model Context Protocol (MCP) to expose insights.
*   **Directory Structure:**
    *   `src/`: Contains all core TypeScript source code.
        *   `cli/`: Entry points for the command-line tools (e.g., `1-capture-codebase.ts`).
        *   `common/`: Shared utilities and factories, particularly for MongoDB (`mdb/`) and general-purpose functions (`utils/`).
        *   `components/`: Contains the core business logic components, organized by feature.
            *   `api/mcpServing/`: Implements the MCP server for exposing insights.
            *   `capture/`: Logic for parsing source code and loading it into the database.
            *   `insights/`: Modules for generating higher-level insights from the data.
            *   `querying/`: Logic for ad-hoc querying of the codebase.
            *   `reporting/`: Components for generating HTML and JSON reports.
        *   `config/`: Application-wide configuration constants (e.g., database names, file paths).
        *   `di/`: Dependency Injection setup using `tsyringe`, including token definitions and registration modules.
        *   `env/`: Handles loading, validation (using Zod), and bootstrapping of environment variables.
        *   `lifecycle/`: Manages the application execution lifecycle, including startup, task execution, and graceful shutdown.
        *   `llm/`: The LLM interaction layer.
            *   `core/`: The central `LLMRouter`, execution pipeline, and strategies for retry, fallback, and prompt adaptation.
            *   `providers/`: Contains specific implementations for various LLM providers (OpenAI, Azure, Bedrock, VertexAI), each with its own manifest file.
            *   `types/`: Type definitions specific to the LLM layer.
        *   `repositories/`: The data access layer, defining interfaces and implementations for interacting with MongoDB.
        *   `schemas/`: Centralized Zod schemas for validating data structures like source file summaries and application summaries.
        *   `tasks/`: Concrete, injectable classes that implement the `Task` interface and orchestrate the high-level logic for each CLI command.
    *   `input/`: Contains input files for the tools, such as prompt templates (`.prompt`) and requirements.
    *   `dist/`: Output directory for compiled JavaScript files.
    *   `docs/`: Contains example output files (JSON, HTML).
    *   `tests/`: Contains all unit (`.test.ts`) and integration (`.int.test.ts`) tests.
*   **Database Use:**
    *   **Database:** MongoDB.
    *   **Interaction Pattern:**
        *   The native `mongodb` Node.js driver is used.
        *   A `MongoDBClientFactory` (`src/common/mdb/mdb-client-factory.ts`), managed via DI, handles client connections.
        *   `DBInitializerTask` (`src/tasks/db-initializer.task.ts`) is responsible for creating collections (`sources`, `appsummaries`) and indexes, including standard indexes and Atlas Vector Search indexes on `contentVector` and `summaryVector` fields.
        *   The **Repository Pattern** is used to abstract data access logic (e.g., `SourcesRepository`, `AppSummariesRepository`).
        *   Queries involve standard MongoDB find operations as well as `$vectorSearch` aggregation pipelines for semantic search.
*   **Data Fetching & API Interaction:**
    *   **LLM APIs:** Interactions with various LLM provider APIs are abstracted through the `LLMRouter` and specific provider implementations in `src/llm/providers/`. These implementations use the official SDKs for each cloud provider.
    *   **MCP Server:** The `McpHttpServer` sets up a raw Node.js `http` server to handle Server-Sent Events (SSE) for the Model Context Protocol.

## 5. Language-Specific Idioms and Best Practices (TypeScript)

*   **Functions:**
    *   **`async function`** is predominantly used for top-level functions and class methods, especially those involving I/O or API calls.
    *   Arrow functions (`=>`) are used where syntactically appropriate, such as in callbacks for array methods.
    *   **Type Hints:** Extensively used for function parameters, variables, and class members, leveraging TypeScript's static typing capabilities. Return types are often explicitly stated for public-facing methods for clarity.
*   **Object-Oriented vs. Functional:**
    *   The project employs a **hybrid approach**.
    *   **Object-Oriented Programming (OOP)** is central to the architecture, with classes used for services (`LLMRouter`), repositories (`SourcesRepositoryImpl`), tasks (`CodebaseCaptureTask`), and LLM provider implementations. Abstraction (`AbstractLLM`) and Dependency Injection (`tsyringe`) are key principles.
    *   **Functional Programming (FP)** influences are seen in utility modules (`src/common/utils/`) which often export pure or near-pure functions. Immutability is encouraged through `readonly` properties and `as const` assertions in configuration files.
*   **Error Handling:**
    *   **`try...catch` blocks** are the standard for handling exceptions, especially around I/O and API calls.
    *   **Custom Error Classes** are defined in `src/llm/types/llm-errors.types.ts` (e.g., `BadResponseContentLLMError`, `BadConfigurationLLMError`) to provide specific error information.
    *   **Utility Functions** in `src/common/utils/error-utils.ts` provide helpers for consistent error logging.
    *   The `LLMRouter` and its associated strategies (`RetryStrategy`, `FallbackStrategy`) implement sophisticated error handling for LLM calls, including retries and model switching.
*   **Asynchronous Programming:**
    *   **`async/await`** is the preferred and consistently used idiom for managing asynchronous operations.
    *   **`p-limit`** is used for managing concurrency when making many API calls (e.g., in `CodebaseToDBLoader`).
    *   **`p-retry`** is used within the `RetryStrategy` to handle retries with backoff for LLM calls.
*   **Language Standards Versions:**
    *   **TypeScript:** The project uses a modern version of TypeScript (`^5.7.3` in `package.json`).
    *   **ECMAScript:** `tsconfig.json` specifies `target: "ES2023"` and `lib: ["ES2023"]`, indicating the use of modern JavaScript features.
    *   **Module System:** `module: "NodeNext"` and `moduleResolution: "nodenext"` are used, aligning with modern Node.js ESM practices.
    *   **Strict Mode:** `strict: true` is enabled in `tsconfig.json`, along with several other strictness flags, promoting robust and type-safe code.
    *   **Modern Features Used:**
        *   `readonly` properties for immutability.
        *   `as const` for creating literal types from objects/arrays (common in config files).
        *   Optional chaining (`?.`) and nullish coalescing (`??`).
        *   Extensive use of interfaces and type aliases.
        *   Enums for defining sets of named constants.
        *   ES Modules syntax (`import`/`export`).
        *   Decorators for Dependency Injection (`@injectable`, `@inject`).

## 6. Dependency and Configuration Management

*   **Dependencies:**
    *   Managed using `npm` via `package.json` and `package-lock.json`.
    *   Dependencies are pragmatic choices for specific functionalities (LLM SDKs, DB driver, testing, DI, etc.). General utility libraries like `lodash` are avoided in favor of focused, single-purpose libraries (`p-limit`, `p-retry`).
    *   The `overrides` section in `package.json` is used to enforce specific versions of transitive dependencies, as noted in `NOTES.txt`.
*   **Configuration:**
    *   **Environment Variables:** Managed using `.env` files and loaded by the `dotenv` library.
    *   **Schema Validation:** Environment variables are validated against a Zod schema. The base schema is in `src/env/env.types.ts` and is dynamically extended by provider manifests, providing runtime validation and type safety.
    *   **Configuration Files:** Static configuration objects are defined in TypeScript files within `src/config/` (e.g., `database.config.ts`, `app.config.ts`).
    *   **LLM Provider Manifests:** Each LLM provider has a `.manifest.ts` file which declaratively defines its models, required environment variables (via a Zod schema), and factory function. This is a key architectural pattern for pluggability.

## 7. Testing and Documentation

*   **Testing Philosophy:**
    *   The project employs both **unit tests** and **integration tests**.
    *   **Unit Tests:** Files ending with `.test.ts` (e.g., `tests/common/utils/text-utils.test.ts`).
    *   **Integration Tests:** Files ending with `.int.test.ts` (e.g., `tests/features/api/mcpServing/mcp-http-server.int.test.ts`). These test interactions between modules or with external systems.
    *   **Testing Framework:** Jest (`jest`, `ts-jest`).
    *   **Test Execution:**
        *   `npm test`: Runs unit tests.
        *   `npm test:int`: Runs integration tests.
        *   `npm test:verbose`: Runs unit tests with verbose output.
    *   `jest.config.js` configures Jest to separate unit and integration tests. `jest.setup.js` is used to mock environment variables for tests.
*   **Documentation Style:**
    *   **Code Comments:** JSDoc-style comments (`/** ... */`) are used for public APIs.
    *   **README.md:** Provides a comprehensive project overview, setup instructions, and usage guidelines.
    *   **NOTES.txt:** Contains informal developer notes, ideas, and troubleshooting tips.
    *   **EXAMPLE.env:** Serves as a template for the required `.env` configuration file.

## 8. Validation

*   **Compiling/Building:**
    *   **Command:** `npm run build` (or `npm run compile`).
    *   **Tool:** TypeScript Compiler (`tsc`).
    *   **Configuration:** `tsconfig.json` defines compiler options.
    *   **Output:** Compiled JavaScript files are placed in the `dist/` directory. The build process also includes a `copy-templates` step.
*   **Linting:**
    *   **Command:** `npm run lint`.
    *   **Tool:** ESLint (`eslint`).
    *   **Configuration:** `eslint.config.mjs`. It extends `eslint.configs.recommended`, `tseslint.configs.strictTypeChecked`, and `tseslint.configs.stylisticTypeChecked`, and includes custom rules like enforcing member ordering and `readonly` properties.
*   **Formatting:**
    *   **Command:** `npm run format`.
    *   **Tool:** Prettier.
*   **Comprehensive Validation:**
    *   **Command:** `npm run validate`.
    *   **Action:** This script runs a sequence of checks: `npm run build && npm run lint && npm run test && npm run test:int`. This is the recommended command for developers to run before committing changes.

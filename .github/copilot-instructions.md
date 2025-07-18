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

## 2. Formatting and Style Conventions

*   **Indentation:**
    *   Spaces are used for indentation.
    *   **2 spaces** per indentation level is the prevalent style (e.g., `src/capture-sources.ts`, `src/codebaseDBLoader/codebase-loader.ts`).
*   **Line Endings & Spacing:**
    *   **Line Endings:** LF (Unix-style). The `.gitattributes` file specifies `* -crlf` which normalizes line endings to LF in the repository.
    *   **Blank Lines:**
        *   Typically, one blank line is used between top-level constructs (import blocks, functions, classes).
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
    *   The project is primarily a **collection of command-line interface (CLI) tools** designed for analyzing codebases using Large Language Models (LLMs).
    *   These tools share common services for LLM interaction, database operations, and utility functions, suggesting a **Layered Architecture** for these shared components. Dependency Injection (DI) using `tsyringe` is employed to manage these services.
    *   An emerging **service-oriented component** is present with `insights-mcp-server.ts`, which implements a server using the Model Context Protocol (MCP) to expose insights.
    *   **Rationale:** Each main `.ts` file in `src/` (e.g., `capture-sources.ts`, `generate-insights.ts`, `query-codebase.ts`) acts as an entry point for a specific task. They utilize shared modules from `llm/`, `utils/`, `config/`, `types/`, and `di/`. The MCP server component indicates an extension towards providing data via a defined protocol.
*   **Directory Structure:**
    *   `src/`: Contains all core TypeScript source code.
        *   `codebaseDBLoader/`: Logic for parsing source code and loading its metadata and content into MongoDB. Includes its own `prompts/` sub-directory.
        *   `config/`: Application-wide configuration constants (e.g., database names, LLM parameters, file system paths).
        *   `di/`: Dependency Injection setup using `tsyringe`. Contains token definitions (`tokens.ts`), container setup (`container.ts`), and registration modules.
        *   `env/`: (Now part of `lifecycle/`) Handles loading, validation (using Zod), and bootstrapping of environment variables.
        *   `insightGenerator/`: Modules responsible for generating higher-level insights from the data stored in MongoDB, often using LLMs. Includes its own `prompts/` sub-directory.
        *   `insightsServer/`: Implements server-side logic for exposing generated insights, currently via the MCP framework.
        *   `lifecycle/`: Manages service execution lifecycle, including environment setup and graceful shutdown.
        *   `llm/`: Core LLM interaction layer.
            *   `providers/`: Contains specific implementations for various LLM providers (OpenAI, Azure OpenAI, AWS Bedrock models, Google Vertex AI). Each provider has its own sub-directory containing the LLM logic (`*-llm.ts`) and a manifest file (`*.manifest.ts`) for auto-discovery and configuration.
                *   `base/`: (Now `abstract-llm.ts` directly under `providers/`) Abstract base class for LLM provider implementations.
            *   `response-processing/`: Utilities for processing LLM responses, including error pattern parsing and prompt adaptation.
            *   `router-tracking/`: Utilities for logging and tracking LLM router statistics.
            *   `llm-router.ts`: Central component for routing LLM requests, handling retries, model switching, and logging.
            *   `llm-service.ts`: Manages auto-discovery and instantiation of LLM providers based on manifests.
        *   `mcpFramework/`: Components for implementing the Model Context Protocol server.
        *   `mdb/`: MongoDB related utilities, including the client factory and general utils.
        *   `promptTemplating/`: Utilities for loading prompt templates and substituting variables.
        *   `services/`: Contains the core application services that are run as CLI tools or servers.
        *   `talkToCodebase/`: Modules for querying the codebase using natural language questions, leveraging vector search and LLMs for RAG. Includes its own `prompts/` sub-directory.
        *   `types/`: TypeScript type definitions, interfaces, and enums used across the project.
        *   `utils/`: Common utility functions (e.g., file system operations, text manipulation, error handling, control flow).
    *   `input/`: Contains input files for the tools, such as prompt templates and lists of questions/requirements.
        *   `requirements/`: Specific, detailed prompts for generating codebase analysis reports.
    *   `dist/`: Output directory for compiled JavaScript files (generated by `tsc`).
    *   `output/`: (Inferred) Directory for output files generated by tools like `one-shot-inline-insights.ts`.
*   **Database Use:**
    *   **Database:** MongoDB.
    *   **Interaction Pattern:**
        *   The `mongodb` Node.js driver is used directly.
        *   A `MongoDBClientFactory` (`src/mdb/mdb-client-factory.ts`), managed via DI, handles MongoDB client connections.
        *   `DBInitializer` (`src/codebaseDBLoader/db-initializer.ts`) is responsible for creating necessary collections and indexes, including standard indexes and Atlas Vector Search indexes (on `contentVector` and `summaryVector` fields).
        *   Data is inserted into collections like `sources` (for individual file metadata and embeddings) and `appsummaries` (for aggregated project-level insights).
        *   Queries involve standard MongoDB find operations as well as `$vectorSearch` aggregation pipelines for semantic search (e.g., in `CodeQuestioner`).
*   **State Management:**
    *   Not applicable in the traditional sense of a UI application.
    *   Application "state" for the CLI tools is primarily managed through:
        *   Environment variables (`.env` files).
        *   Configuration files (`src/config/`).
        *   Command-line arguments (implicitly, though not explicitly shown in detail).
*   **Data Fetching & API Interaction:**
    *   **LLM APIs:** Interactions with various LLM provider APIs (OpenAI, Azure, AWS Bedrock, GCP Vertex AI) are abstracted through the `LLMRouter` and specific provider implementations in `src/llm/providers/`. These implementations use the official SDKs for each cloud provider.
    *   **MCP Server:** The `insights-mcp-server.ts` sets up an HTTP server using Node.js's `http` module to handle Server-Sent Events (SSE) for the Model Context Protocol, as defined by the `@modelcontextprotocol/sdk`.

## 5. Language-Specific Idioms and Best Practices (TypeScript)

*   **Functions:**
    *   **`async function`** is predominantly used for top-level functions and class methods, especially those involving I/O or LLM calls.
    *   Arrow functions (`=>`) are used where syntactically appropriate (e.g., callbacks for array methods, concise function expressions), but less so for defining class methods or top-level functions.
    *   **Type Hints:** Extensively used for function parameters, variables, and class members, leveraging TypeScript's static typing capabilities. Prefers not to explicitly state the return type of a function if it can be inferred by TypeScript, but does so when necessary for clarity.
*   **Object-Oriented vs. Functional:**
    *   The project employs a **hybrid approach**.
    *   **Object-Oriented Programming (OOP)** is evident in the use of classes for services (`LLMRouter`, `MongoDBClientFactory`), data loaders (`CodebaseToDBLoader`), specific LLM provider implementations, and server components. Abstraction and encapsulation are key principles (e.g., `AbstractLLM`). Dependency Injection (`tsyringe`) is used to manage class instances.
    *   **Functional Programming (FP)** influences are seen in utility modules (`src/utils/`) which often export pure or near-pure functions. Immutability is encouraged by `readonly` properties and `as const` assertions in configuration.
*   **Error Handling:**
    *   **`try...catch` blocks** are standard for handling exceptions, especially around I/O operations and API calls.
    *   **Custom Error Classes:** Defined in `src/types/llm-errors.types.ts` (e.g., `BadResponseContentLLMError`, `BadConfigurationLLMError`) to provide more specific error information for LLM-related issues.
    *   **Utility Functions:** `src/utils/error-utils.ts` provides helper functions (`logErrorMsgAndDetail`, `getErrorText`) for consistent error logging.
    *   **Promise Rejection Handling:** Top-level scripts often use `.catch(console.error)` on the main promise chain, managed by the `runService` utility.
    *   The `LLMRouter` implements sophisticated error handling for LLM calls, including retries and model switching based on error types or response statuses.
*   **Asynchronous Programming:**
    *   **`async/await`** is the preferred and consistently used idiom for managing asynchronous operations, making asynchronous code resemble synchronous code for better readability.
    *   `Promise.all` is used for concurrent execution of independent promises.
    *   A custom `promiseAllThrottled` utility (`src/utils/control-utils.ts`) is used to manage concurrency when making many API calls (e.g., processing multiple files).
*   **Language Standards Versions:**
    *   **TypeScript:** The project uses a modern version of TypeScript (e.g., `^5.7.3` in `package.json`).
    *   **ECMAScript:** `tsconfig.json` specifies `target: "ES2023"` and `lib: ["ES2023"]`, indicating the use of modern JavaScript features.
    *   **Module System:** `module: "NodeNext"` and `moduleResolution: "nodenext"` are used, aligning with modern Node.js ESM practices where possible, while still producing CommonJS compatible output for Node.js execution.
    *   **Strict Mode:** `strict: true` is enabled in `tsconfig.json`, along with several other strictness flags (`noFallthroughCasesInSwitch`, `noImplicitOverride`, `useUnknownInCatchVariables`, etc.), promoting robust and type-safe code.
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
    *   Dependencies are chosen for specific functionalities (LLM SDKs, MongoDB driver, testing, linting, DI, etc.).
    *   The `overrides` section in `package.json` (e.g., for `whatwg-url`) is used to enforce specific versions of transitive dependencies, often as a workaround for issues (as noted in `NOTES.txt`).
    *   There isn't a strong philosophy of "minimal dependencies" vs. "batteries included"; rather, dependencies are pragmatic choices for the tasks at hand. General utility libraries like `lodash` are not broadly used, but specific, focused utilities are.
*   **Configuration:**
    *   **Environment Variables:** Managed using `.env` files (e.g., `.env`, `EXAMPLE.env`) and loaded by the `dotenv` library.
    *   **Schema Validation:** Environment variables are validated against a Zod schema defined in `src/types/env.types.ts` (`baseEnvVarsSchema`) and dynamically extended by provider manifests in `src/di/registration-modules/env-registration.ts`. This provides runtime validation and type safety for environment configuration.
    *   **Configuration Files:** Structured configuration objects are defined in TypeScript files within the `src/config/` directory (e.g., `database.config.ts`, `llm.config.ts`, `prompts.config.ts`). These often use `as const` for type safety and immutability.
    *   **LLM Provider Manifests:** Each LLM provider has a `.manifest.ts` file (e.g., `src/llm/providers/openai/azure-openai/azure-openai.manifest.ts`) which declaratively defines its models, required environment variables (via a Zod schema), and factory function. These are auto-discovered by `LLMService`.

## 7. Testing and Documentation

*   **Testing Philosophy:**
    *   The project employs both **unit tests** and **integration tests**.
    *   **Unit Tests:** Files ending with `.test.ts` (e.g., `src/utils/utils.test.ts`, `src/llm/llm.test.ts`).
    *   **DO NOT EXECUTE: Integration Tests:** Files ending with `.int.test.ts` (e.g., `src/insightsServer/insights-data.int.test.ts`, `src/promptTemplating/prompt-builder.int.test.ts`). These likely test interactions between modules or with external systems like a database (though mocks might still be used for some external parts).
    *   **Testing Framework:** Jest (`jest`, `ts-jest`).
    *   **Test Execution:**
        *   `npm test`: Runs unit tests (ignores `.int.test.ts` files).
        *   `npm test:verbose`: Runs unit tests with verbose output.
        *   `npm test:int`: Runs integration tests specifically.
    *   `jest.config.js` configures Jest, including `testPathIgnorePatterns` to separate unit and integration tests and ignore `node_modules` and `dist`.
*   **Documentation Style:**
    *   **Code Comments:** JSDoc-style comments (`/** ... */`) are used for public APIs (classes, methods, functions, types).
    *   **README.md:** Provides a comprehensive project overview, prerequisites, setup instructions, how to run/debug different tools, how to run tests, and guidelines for contributing (e.g., "Process for Adding LLM Providers").
    *   **NOTES.txt:** Contains informal developer notes, ideas for future work, troubleshooting tips, and temporary workarounds.
    *   **EXAMPLE.env:** Serves as a template for the required `.env` configuration file.

## 8. Validation

*   **Compiling/Building:**
    *   **Command:** `npm run compile` or `npm run build` (they are aliases).
    *   **Tool:** TypeScript Compiler (`tsc`).
    *   **Configuration:** `tsconfig.json` defines compiler options, including `target: "ES2023"`, `module: "NodeNext"`, `strict: true`, `outDir: "./dist"`, and `rootDir: "./src"`.
    *   **Output:** Compiled JavaScript files are placed in the `dist/` directory.
*   **Linting:**
    *   **Command:** `npm run lint`
    *   **Tool:** ESLint (`eslint`).
    *   **Configuration:** `eslint.config.mjs`.
        *   Uses `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`.
        *   Extends `eslint.configs.recommended`, `tseslint.configs.strictTypeChecked`, and `tseslint.configs.stylisticTypeChecked`.
        *   Ignores `*js` (ESLint primarily targets `.ts` files), `dist/**`, and `node_modules/**`.
        *   **Specific Enforced Rules (Examples):**
            *   `@typescript-eslint/explicit-member-accessibility`: `["error", { "accessibility": "no-public" }]` (forbids explicit `public` keyword).
            *   `@typescript-eslint/member-ordering`: `"error"` (enforces consistent class member order).
            *   `@typescript-eslint/prefer-readonly`: `"error"`.
            *   `@typescript-eslint/promise-function-async`: `"error"`.
            *   `@typescript-eslint/require-array-sort-compare`: `"error"`.
            *   `@typescript-eslint/switch-exhaustiveness-check`: `"error"`.
            *   `@typescript-eslint/restrict-template-expressions`: Configured to allow numbers and booleans in template literals.
*   **Comprehensive Validation:**
    *   **Command:** `npm run validate`
    *   **Action:** This script runs a sequence of checks: `npm run compile && npm run lint && npm run test && npm run test:int`.
    *   Developers should run this command before committing changes to ensure code quality and correctness.
*   **Formatting:**
    *   **Command:** `npm run format`.
    *   **Tool:** Prettier.
    *   **Action:** Automatically formats all `.ts` and `.tsx` files according to the rules in `.prettierrc.json`.    

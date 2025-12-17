
# Coding Standards and Architectural Conventions

This document outlines the inferred coding standards, architectural patterns, and formatting conventions for the project. It is intended to help new developers contribute to the project with a consistent style and understanding of its structure.

## 1. Language(s) and Framework(s) Identification

*   **Primary Language:** TypeScript (v5.7.3 or higher, as per `package.json` and `tsconfig.json`)
*   **Runtime Environment:** Node.js (v20.0.0 or higher, as per `package.json` `engines` field)
*   **Package Manager:** npm
*   **Major Libraries & Frameworks:**
    *   **LLM Interaction:**
        *   `openai` (for OpenAI and Azure OpenAI SDKs)
        *   `@google-cloud/aiplatform`, `@google-cloud/vertexai` (for Google Cloud Vertex AI)
        *   `@aws-sdk/client-bedrock-runtime` (for AWS Bedrock)
    *   **Database:** `mongodb` (MongoDB Node.js Driver)
    *   **Configuration & Validation:** `dotenv` (for `.env` file loading), `zod` (for environment variable and data schema validation)
    *   **Dependency Injection:** `tsyringe`, `reflect-metadata`
    *   **Testing:** `jest`, `ts-jest`
    *   **Linting & Formatting:** `eslint`, `@typescript-eslint/eslint-plugin`, `prettier`
    *   **Asynchronous Utilities:** `p-limit` (for concurrency control), `p-retry` (for resilient operations)
    *   **Templating:** `ejs` (for HTML report templating)

## 2. Formatting and Style Conventions

The project uses a combination of Prettier for automated formatting and ESLint for stylistic and quality rules, ensuring a highly consistent code style.

*   **Indentation:**
    *   **2 spaces** are used for indentation. This is consistent across all TypeScript, JavaScript, and configuration files (`tsconfig.json`, `eslint.config.mjs`).
*   **Line Endings & Spacing:**
    *   **Line Endings:** LF (Unix-style) is the standard.
    *   **Blank Lines:** A single blank line is used to separate top-level constructs (imports, functions, classes) and methods within classes. Blank lines are also used sparingly within functions to group related blocks of logic.
    *   **Line Length:** While not strictly enforced by a linter rule, the code style aims for a line length of approximately **100-120 characters** to maintain readability.
    *   **Trailing Commas:** Trailing commas are preferred in multi-line object literals, array literals, and import/export lists, as is common practice with Prettier.
*   **Braces and Parentheses:**
    *   **Braces:** The opening brace (`{`) is placed on the **same line** as the corresponding statement or declaration (e.g., `class MyClass {`, `if (condition) {`). This is a variant of the K&R style.
        ```typescript
        // From: src/app/lifecycle/application-runner.ts
        export function runApplication(taskToken: symbol): void {
            // ...
        }
        ```
    *   **Parentheses:** Standard use for function calls and control structures. Spaces are used around operators inside parentheses for readability (e.g., `(a + b)`).
*   **Import/Module Ordering:**
    *   Imports are ordered logically, not alphabetically. The standard pattern is:
        1.  Node.js built-in modules (e.g., `path`).
        2.  Third-party libraries (e.g., `tsyringe`, `mongodb`).
        3.  Local project modules, using relative paths (`../`, `./`). These are often further grouped by their layer or feature (e.g., config, types, utils, components).
*   **Commenting:**
    *   **JSDoc (`/** ... */`):** Used for documenting exported classes, methods, functions, and types. This format is preferred for anything that forms a public API for a module.
    *   **Single-line (`//`):** Used for brief, single-line explanations or to clarify a specific line of code.
    *   **ESLint Directives (`/* eslint-disable ... */`):** Used sparingly to bypass linting rules, with a clear intention, as noted in `NOTES.txt` for prototyping purposes.

## 3. Naming Conventions

*   **Variables & Parameters:** `camelCase` (e.g., `mongoClient`, `llmRouter`, `projectName`).
*   **Functions/Methods:** `camelCase` (e.g., `runApplication`, `generateAndStoreInsights`).
*   **Classes, Interfaces, Type Aliases:** `PascalCase` (e.g., `CodebaseToDBLoader`, `Task`, `EnvVars`, `LLMProvider`).
*   **Constants:** `UPPER_SNAKE_CASE` for module-level constants and configuration values (e.g., `CODEBASE_DB_NAME`, `MAX_CONCURRENCY`). Environment variable keys also follow this convention.
*   **Enums:** `PascalCase` for the enum name and `UPPER_SNAKE_CASE` for its members (e.g., `LLMResponseStatus.COMPLETED`).
*   **Files and Directories:**
    *   **TypeScript Files:** `kebab-case.ts` (e.g., `application-runner.ts`, `llm-router.ts`).
    *   **Specialized Files:** Suffixes are used to denote purpose, such as `*.config.ts`, `*.types.ts`, `*.test.ts`, and `*.int.test.ts`.
    *   **Prompt Files:** `kebab-case.prompt` or `questions.prompts`.
    *   **Directories:** `kebab-case` is used for directories containing multiple files (e.g., `src/components/reporting/data-providers`), while standard names (`src`, `tests`, `input`) are used for top-level folders.

## 4. Architectural Patterns and Code Structure

*   **Overall Architecture:**
    *   The project is a **CLI toolkit** for code analysis, built on a **Layered Architecture**. This is evident from the clear separation of concerns into `repositories` (Data Access), `components` (Business Logic/Services), `llm` (External Service Abstraction), and `cli` (Presentation/Entry Points).
    *   **Dependency Injection (DI)** is a fundamental principle, implemented with `tsyringe`. This promotes loose coupling and testability by allowing components to declare their dependencies rather than creating them.
    *   A **Manifest-Driven** approach is used for LLM providers. Each provider is defined by a manifest file (`.manifest.ts`) that declaratively specifies its configuration, models, and factory function, making the system highly pluggable and extensible.
*   **Directory Structure:**  (TODO: not some folders have chanegd to go under `app1)
    *   `src/`: Contains all TypeScript source code.
        *   `cli/`: Entry points for each command-line tool.
        *   `common/`: Shared utilities, especially for MongoDB (`mdb/`) and general-purpose functions (`utils/`).
        *   `components/`: The core business logic, organized by feature (e.g., `capture`, `insights`, `reporting`).
        *   `config/`: Application-wide, static configuration constants.
        *   `di/`: Dependency Injection setup, including tokens and registration modules.
        *   `env/`: Environment variable loading, validation (with Zod), and bootstrapping.
        *   `lifecycle/`: Manages the application's execution flow, including startup and graceful shutdown.
        *   `llm/`: The LLM abstraction layer, containing the `LLMRouter`, provider implementations, and strategies for retry/fallback.
        *   `repositories/`: The Data Access Layer, abstracting MongoDB interactions.
        *   `schemas/`: Centralized Zod schemas for data validation.
        *   `tasks/`: High-level, injectable classes that orchestrate the work for each CLI command.
    *   `input/`: Contains input files like prompt templates.
    *   `dist/`: Output directory for compiled JavaScript.
    *   `docs/`: Contains example output files and documentation assets.
    *   `tests/`: Contains all unit (`.test.ts`) and integration (`.int.test.ts`) tests.
*   **Database Use:**
    *   **Database:** MongoDB, specifically leveraging MongoDB Atlas for its Vector Search capabilities.
    *   **Interaction Pattern:**
        *   The native `mongodb` driver is used.
        *   A `MongoDBClientFactory` is managed via DI to handle connections.
        *   The **Repository Pattern** is strictly followed to abstract data access logic (e.g., `SourcesRepository`, `AppSummariesRepository`).
        *   The `DatabaseInitializer` task is responsible for setting up collections and indexes, including vector search indexes on `contentVector` and `summaryVector` fields.
        *   Queries consist of standard MongoDB operations and `$vectorSearch` aggregation pipelines for semantic search.
*   **Data Fetching & API Interaction:**
    *   **LLM APIs:** All interactions with external LLM APIs are centralized and abstracted through the `LLMRouter`. Specific provider implementations in `src/llm/providers/` use the official SDKs for each service (e.g., `openai`, `@aws-sdk/client-bedrock-runtime`).

## 5. Language-Specific Idioms and Best Practices (TypeScript)

*   **Functions:**
    *   **`async function`** is the standard for any function involving I/O, API calls, or other asynchronous operations.
    *   Arrow functions (`=>`) are used for callbacks and where a concise function expression is suitable.
    *   **Type Hints:** TypeScript's static typing is used extensively. All function parameters, variables, and return types for public methods are explicitly typed to ensure code quality and clarity.
*   **Object-Oriented vs. Functional:**
    *   The project follows a **hybrid approach**, leveraging the strengths of both paradigms.
    *   **Object-Oriented:** The core architecture is built on classes, interfaces, and dependency injection (`tsyringe`). This is seen in services (`LLMRouter`), repositories (`SourcesRepositoryImpl`), and tasks (`CodebaseCaptureTask`).
    *   **Functional:** Utility modules (`src/common/utils/`) favor pure or near-pure functions. Immutability is encouraged through `readonly` properties and `as const` assertions, especially in configuration files.
*   **Error Handling:**
    *   **`try...catch` blocks** are used for handling synchronous and asynchronous errors, particularly around I/O and API calls.
    *   **Custom Error Classes** (e.g., `BadResponseContentLLMError`) are defined to provide specific, typed error information.
    *   The `LLMRouter` and its associated strategies (`RetryStrategy`, `FallbackStrategy`) implement a sophisticated, resilient error-handling mechanism for LLM API calls, including retries with backoff and model failover.
*   **Asynchronous Programming:**
    *   **`async/await`** is the exclusive and preferred idiom for managing asynchronous code, making it clean and readable.
    *   **`p-limit`** is used to manage concurrency and prevent overwhelming external APIs with too many parallel requests (e.g., in `CodebaseToDBLoader`).
    *   **`p-retry`** is used within the `RetryStrategy` to automatically retry failed LLM calls with exponential backoff.
*   **Language Standards Versions:**
    *   **TypeScript:** The project is configured for a modern version of TypeScript (`^5.7.3`), as seen in `package.json`.
    *   **ECMAScript:** The `tsconfig.json` `target` is `ES2023`, and `module` is `NodeNext`, indicating the use of modern JavaScript features and the Node.js ES module system.
    *   **Strict Mode:** `strict: true` is enabled in `tsconfig.json`, enforcing a high level of type safety.
    *   **Modern Features Used:** `readonly` properties, `as const` assertions, optional chaining (`?.`), nullish coalescing (`??`), ES Modules (`import`/`export`), and decorators (`@injectable`, `@inject`) for DI.

## 6. Dependency and Configuration Management

*   **Dependencies:**
    *   Managed via `npm` with `package.json` and `package-lock.json`.
    *   The project favors focused, single-purpose libraries (e.g., `p-limit`, `zod`) over large, general-purpose utility libraries like `lodash`.
    *   The `overrides` field in `package.json` is used to enforce specific versions of transitive dependencies, indicating a proactive approach to dependency management.
*   **Configuration:**
    *   **Environment Variables:** Configuration is primarily managed through a `.env` file, loaded by `dotenv`. `EXAMPLE.env` serves as a template.
    *   **Schema Validation:** Environment variables are validated at runtime using `zod`. The base schema is extended dynamically by LLM provider manifests, ensuring that only the necessary variables for the selected provider are required and validated.
    *   **Static Configuration:** Immutable, static configuration is defined in `*.config.ts` files within `src/config/`.
    *   **LLM Provider Manifests:** A key pattern where each LLM provider defines its models, required environment variables, and factory function in a `.manifest.ts` file, making the system highly pluggable.

## 7. Testing and Documentation

*   **Testing Philosophy:**
    *   The project has a robust testing strategy with both **unit tests** and **integration tests**.
    *   **Unit Tests:** Files ending in `.test.ts` focus on individual components in isolation.
    *   **Integration Tests:** Files ending in `.int.test.ts` test the interaction between multiple components or with external systems like a real database connection.
    *   **Testing Framework:** Jest is used, configured via `jest.config.js` and `ts-jest`.
    *   **Test Execution:**
        *   `npm test`: Runs all unit tests.
        *   `npm test:int`: Runs all integration tests.
        *   `npm test:verbose`: Runs unit tests with detailed output.
*   **Documentation Style:**
    *   **Code Comments:** JSDoc (`/** ... */`) is used to document the public API of classes, methods, and functions.
    *   **Project Documentation:** `README.md` provides a comprehensive guide to setup, usage, and architecture.
    *   **Developer Notes:** `NOTES.txt` contains informal notes, future ideas, and troubleshooting tips.
    *   **Configuration Template:** `EXAMPLE.env` clearly documents all required environment variables.

## 8. Validation

*   **Compiling/Building:**
    *   **Command:** `npm run build`
    *   **Process:** The TypeScript Compiler (`tsc`) compiles `.ts` files into JavaScript, placing them in the `dist/` directory as configured in `tsconfig.json`.
*   **Linting:**
    *   **Command:** `npm run lint`
    *   **Tool:** ESLint, configured via `eslint.config.mjs`.
    *   **Rules:** Enforces strict, type-checked rules, including `prefer-readonly` and member ordering, to maintain high code quality.
*   **Formatting:**
    *   **Command:** `npm run format`
    *   **Tool:** Prettier is used to automatically format the code, ensuring a consistent style.
*   **Comprehensive Validation:**
    *   **Command:** `npm run validate`
    *   **Action:** This is the primary pre-commit/pre-push script. It runs a full sequence of `build`, `lint`, `test`, and `test:int` to ensure the codebase is in a healthy state.

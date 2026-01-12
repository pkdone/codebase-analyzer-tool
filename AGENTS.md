# Coding Standards and Architectural Conventions

This document outlines the inferred coding standards, architectural patterns, and formatting conventions for the **Codebase Analyzer Tools (CAT)** project. It is intended to guide new developers in contributing to the project with a consistent style and understanding of its structure.

## 1. Language(s) and Framework(s) Identification

*   **Primary Language:** TypeScript (Targeting ES2023, NodeNext module resolution).
*   **Runtime Environment:** Node.js (>=20.0.0).
*   **Package Manager:** npm.
*   **Core Frameworks & Libraries:**
    *   **Dependency Injection:** `tsyringe` (used strictly within `src/app/`, avoided in `src/common/`).
    *   **Validation:** `zod` (used for Environment variables, LLM JSON response validation, and internal data structures).
    *   **Database:** `mongodb` (Native Node.js driver).
    *   **LLM SDKs:** `openai`, `@google-cloud/vertexai`, `@aws-sdk/client-bedrock-runtime`.
    *   **Templating:** `ejs` (for HTML report generation).
    *   **Testing:** `jest` with `ts-jest`.
    *   **Linting/Formatting:** `eslint` (with strict type-checking rules) and `prettier`.

## 2. Formatting and Style Conventions

The project enforces strict formatting via Prettier and code quality via ESLint.

*   **Indentation:** 2 spaces.
*   **Line Endings:** LF (Unix-style).
*   **Quotes:** Double quotes (`"`) are preferred for strings and imports.
*   **Braces:** Opening braces (`{`) are placed on the same line as the control statement or function declaration (K&R style).
*   **Semicolons:** Always used at the end of statements.
*   **Import Ordering:**
    1.  Node.js built-in modules (e.g., `path`, `fs`).
    2.  Third-party libraries (e.g., `tsyringe`, `zod`).
    3.  Internal modules (relative paths).
*   **Commenting:**
    *   **JSDoc (`/** ... */`):** Mandatory for classes, interfaces, and public methods. Must describe the purpose and parameters.
    *   **Inline (`//`):** Used sparingly for complex logic clarification.
*   **Linting Rules:**
    *   **Strictness:** The project uses `@typescript-eslint/strict-type-checked`.
    *   **Fixing Errors:** **For any reported linting errors, fix the problem properly, rather than cheating with an added `eslint-disable` comment.**
    *   **Visibility:** Explicit access modifiers (e.g., `public`) are generally avoided in favor of TypeScript defaults, but `private` and `protected` are used.

## 3. Naming Conventions

*   **Variables & Functions:** `camelCase` (e.g., `runApplication`, `mongoClient`).
*   **Classes & Interfaces:** `PascalCase` (e.g., `CodebaseToDBLoader`, `LLMRouter`).
*   **Constants:** `UPPER_SNAKE_CASE` for global constants and configuration values (e.g., `DEFAULT_VECTOR_DIMENSIONS`).
*   **Filenames:** `kebab-case` (e.g., `application-runner.ts`, `llm-router.ts`).
*   **Directories:** `kebab-case` (e.g., `data-providers`, `quality-metrics`).
*   **Specific Suffixes:**
    *   Interfaces often do *not* use an `I` prefix (e.g., `Task`, not `ITask`), though some repository interfaces do.
    *   Implementations often use `Impl` suffix (e.g., `SourcesRepositoryImpl`).

## 4. Architectural Patterns and Code Structure

### Overall Architecture
The project follows a **Layered Architecture** combined with **Dependency Injection (DI)** and a **Command Pattern** for CLI tasks.

*   **Refactoring Philosophy:** **When refactoring, don’t try to support backwards compatibility - change all dependent code that needs changing to support the newly refactored code.**

### Directory Structure & Responsibilities

*   **`src/common/` (The Portable Layer):**
    *   Contains generic utilities, file system operations, and the core LLM abstraction layer.
    *   **Crucial Rule:** Code in this directory **must not use `tsyringe`** or any other dependency injection framework. It is designed to be portable to other projects. Dependencies are injected manually via constructor injection or factory functions (e.g., `llm-factory.ts`).
*   **`src/app/` (The Application Layer):**
    *   Contains application-specific business logic, DI configuration, and database repositories.
    *   **`di/`:** Handles `tsyringe` container registration.
    *   **`repositories/`:** Implements the **Repository Pattern** for MongoDB access.
    *   **`components/`:** Domain logic (e.g., `capture`, `insights`, `reporting`).
    *   **`tasks/`:** Implements the **Command Pattern**. Each CLI tool maps to a specific Task class (e.g., `CodebaseCaptureTask`).
*   **`input/`:** Contains prompt templates and configuration files.
*   **`tests/`:** Contains Unit and Integration tests.

### Database Use
*   **Database:** MongoDB (Atlas).
*   **Pattern:** Repository Pattern. Data access logic is encapsulated in `src/app/repositories`.
*   **Vector Search:** The application heavily utilizes MongoDB Atlas Vector Search. Index definitions are managed in code (`database-initializer.ts`).
*   **Schema:** Data validation is enforced via `zod` schemas which are converted to MongoDB JSON Schema validators.

### Data Fetching & API Interaction
*   **LLM Interaction:** Centralized through the `LLMRouter` in `src/common/llm`.
*   **Manifest Pattern:** LLM providers are configured via "Manifests" (e.g., `openai.manifest.ts`), allowing pluggable support for OpenAI, Vertex AI, Bedrock, etc., without changing core logic.
*   **Resilience:** Uses `p-retry` for API calls and `p-limit` for concurrency control.

## 5. Language-Specific Idioms and Best Practices

*   **Asynchronous Programming:**
    *   **`async/await`** is used exclusively.
    *   **Concurrency:** `Promise.all` or `Promise.allSettled` combined with `p-limit` is the preferred idiom for processing collections of files or LLM requests to avoid rate limiting.
*   **Error Handling:**
    *   Custom error classes (e.g., `AppError`, `LLMError`) are used.
    *   Errors are caught at the top-level task execution (`application-runner.ts`) or within specific strategies (e.g., `RetryStrategy`).
    *   `unknown` is used in catch blocks (e.g., `catch (error: unknown)`), requiring type narrowing or utility functions like `formatError` to handle.
*   **Object-Oriented vs. Functional:**
    *   **Hybrid approach.** Core architecture uses OOP (Classes) for DI and state management (Repositories, Services).
    *   Data transformations and utilities often use functional patterns (pure functions).
*   **Type Safety:**
    *   `zod` is the standard for runtime validation.
    *   `as const` assertions are used frequently for configuration objects to narrow types.

## 6. Dependency and Configuration Management

*   **Dependencies:** Managed via `package.json`. The project prefers specific, smaller libraries (e.g., `p-limit`, `fast-glob`) over monolithic utility belts where possible.
*   **Configuration:**
    *   **Environment Variables:** Managed via `.env` and `dotenv`.
    *   **Validation:** All environment variables are validated using `zod` schemas in `src/app/env/`.
    *   **Manifests:** LLM-specific configuration is decoupled into provider manifests.

## 7. Testing and Documentation

*   **Testing Philosophy:**
    *   **Unit Tests (`*.test.ts`):** Test individual components/functions in isolation.
    *   **Integration Tests (`*.int.test.ts`):** Test interactions with the database or external services.
    *   **Guidance:** **For each significant application feature change / addition you make, add appropriate new unit tests for this change.**
*   **Running Tests:**
    *   `npm test`: Runs unit tests.
    *   `npm test:int`: Runs integration tests.
*   **Documentation:**
    *   Code is self-documenting via descriptive naming.
    *   Complex logic requires JSDoc.
    *   `README.md` covers setup and architecture.

## 8. Validation and Build Process

*   **Compiling:** `npm run build` (Compiles TS to `dist/` and copies templates).
*   **Linting:** `npm run lint` (Runs ESLint).
*   **Full Validation Workflow:**
    *   The project enforces a strict validation cycle.
    *   **Guidance:** **When you have completed application refactoring work, to validate the changes, ensure you execute `npm run validate`, and then fix any reported errors, before running the command again repeatedly, with you fixing reported errors each time, until no more errors are reported.**
    *   The `npm run validate` command executes: Build -> Lint -> Unit Tests -> Integration Tests.

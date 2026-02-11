# Coding Standards and Architectural Conventions

This document outlines the inferred coding standards, architectural patterns, and formatting conventions for the **Codebase Analyzer Tools (CAT)** project. 

## 1. Language(s) and Framework(s) Identification

*   **Primary Language:** **TypeScript** (Targeting ES2023/NodeNext).
*   **Runtime Environment:** **Node.js** (Engine >= 20.0.0).
*   **Core Frameworks & Libraries:**
    *   **Dependency Injection:** `tsyringe` (Used strictly within `src/app`).
    *   **Validation:** `zod` (Used for schema definition, environment variable validation, and LLM response parsing).
    *   **Database:** `mongodb` (Native Node.js driver).
    *   **LLM Integration:** Custom abstraction layer supporting `@anthropic-ai/sdk`, `@google-cloud/vertexai`, `@aws-sdk/client-bedrock-runtime`, and `openai`.
    *   **Templating:** `ejs` (For report generation).
    *   **Testing:** `jest` (Unit and Integration testing).

---

## 2. Formatting and Style Conventions

### Indentation
*   **Style:** Spaces.
*   **Size:** 2 spaces.

### Line Endings & Spacing
*   **Line Endings:** Unix style (`\n`).
*   **Blank Lines (Control Structures):**
    *   **Rule:** For `if`, `for`, and `while` statements that use `{` `}` to delimit their code blocks, ensure there is a blank line both **before** and **after** the block.
    *   **Exceptions:**
        *   No blank line needed before if the preceding line is an opening `{`, a closing `}`, a comment, or an existing blank line.
        *   No blank line needed after the closing `}` if followed by a closing `}`, `else`, `catch`, `finally`, or a comment.
        *   Single-line statements (e.g., `if (x) return;`) that do not use braces are exempt.

### Braces and Parentheses
*   **Style:** K&R style (1TBS). The opening brace `{` goes on the same line as the control statement or function declaration.
*   **Single-line blocks:** Allowed for simple returns or continues (e.g., `if (!input) return;`), but complex logic should be wrapped in braces.

### Import/Module Ordering
*   **Barrel Files:** **Avoid creating barrel index files** (files that only re-export other files) unless absolutely necessary.
*   **Import Order:**
    1.  External libraries (e.g., `tsyringe`, `zod`, `fs`).
    2.  Internal shared modules (`../../common/...`).
    3.  Internal app modules (`../components/...`, `../config/...`).
    4.  Relative imports (`./utils`).
*   **Type Imports:** Use `import type { ... }` when importing interfaces or types to assist with tree-shaking and compilation.

### Commenting
*   **JSDoc:** Required for classes, interfaces, and public methods. Comments should explain the *intent* and *behavior*, not just repeat the name.
*   **Inline Comments:** Use `//` for implementation details within functions.
*   **ESLint Comments:** **Strictly Prohibited.** Fix the underlying linting error properly. Do not use `// eslint-disable...` comments to suppress errors.

---

## 3. Naming Conventions

### Variables
*   **Style:** `camelCase`.
*   **Boolean Flags:** Should be prefixed with `is`, `has`, `should` (e.g., `isInString`, `hasChanges`).

### Functions/Methods
*   **Style:** `camelCase`.
*   **Async:** Methods returning Promises do not strictly require an `Async` suffix, but the implementation must use `async/await`.

### Classes/Components
*   **Style:** `PascalCase`.
*   **Interfaces:** `PascalCase`. **Do not** use the `I` prefix (e.g., use `SourcesRepository`, not `ISourcesRepository`).

### Constants
*   **Style:** `UPPER_SNAKE_CASE` for global/module-level constants (e.g., `DEFAULT_BATCH_SIZE`).
*   **Readonly Objects:** `camelCase` is acceptable for configuration objects exported as constants (e.g., `databaseConfig`).

### Files and Directories
*   **Style:** `kebab-case`.
*   **Examples:** `codebase-capture-orchestrator.ts`, `json-processing.config.ts`.
*   **Test Files:** Must end in `.test.ts` (unit) or `.int.test.ts` (integration).

---

## 4. Architectural Patterns and Code Structure

### Overall Architecture
The project follows a **Layered, Task-Based Architecture** with a strict separation between the Application Core (`src/app`) and Shared Utilities (`src/common`).

1.  **Entry Points (Tasks):** The application execution is driven by specific Tasks (e.g., `CodebaseCaptureTask`, `ReportGenerationTask`) located in `src/app/tasks`.
2.  **Dependency Injection:** The `src/app` layer relies heavily on `tsyringe` for wiring dependencies.
3.  **Domain Logic:** Encapsulated in "Components" (e.g., `src/app/components/capture`) and "Repositories".

### Directory Structure & Rules
*   **`src/app/`**: Contains application-specific business logic, DI container configuration, and task orchestrators.
*   **`src/common/`**:
    *   **Purpose:** Generic code potentially useful to multiple projects (LLM handling, file system ops, JSON parsing).
    *   **Strict Rule:** Code in `src/common/` **must not use "tsyringe"** or any other dependency injection framework. Dependencies must be passed via constructor injection to ensure portability.
*   **`src/app/repositories/`**: Implements the Repository Pattern to abstract MongoDB interactions.
*   **`src/app/di/`**: Centralized Dependency Injection registration.

### Database Use
*   **Database:** MongoDB.
*   **Pattern:** Repository Pattern. All database access is encapsulated within Repository classes (e.g., `SourcesRepository`).
*   **Schema:** `zod` is used to define data models and generate JSON schemas for MongoDB validation (`$jsonSchema`).
*   **Vector Search:** The application utilizes MongoDB Atlas Vector Search. Index definitions are managed in code (`src/app/components/database/database-initializer.ts`).

### State Management
*   **Scope:** State is generally transient per Task execution.
*   **Configuration:** Global configuration is managed via Singleton injection of config objects (e.g., `OutputConfig`, `DatabaseConfig`).

### Data Fetching & API Interaction
*   **LLM Interaction:** All LLM interactions are routed through `LLMRouter` (`src/common/llm/llm-router.ts`). This abstraction handles provider selection, retries, and fallback logic.
*   **External APIs:** Use `fetch` or specific SDK clients (e.g., `@aws-sdk`, `@google-cloud`).

---

## 5. Language-Specific Idioms and Best Practices

### Functions
*   **Preference:** Explicit named functions are preferred for top-level exports. Arrow functions are preferred for callbacks and inline logic.
*   **Typing:** Strict typing is enforced. Avoid `any`. Use `unknown` if the type is truly ambiguous and perform type narrowing (guards) before use.

### Object-Oriented vs. Functional
*   **Hybrid Approach:**
    *   **Services/Repositories:** Use Classes to leverage Dependency Injection.
    *   **Utilities/Helpers:** Use pure functions (Functional programming style) where state is not required, especially in `src/common`.

### Error Handling
*   **Pattern:** Use custom Error classes extending `AppError` (e.g., `LLMError`, `DatabaseError`).
*   **Result Type:** For operations where failure is a valid business state (not an exception), use the `Result<T, E>` discriminated union pattern (`ok(val)` / `err(error)`).
*   **Async Errors:** Use `try...catch` blocks within async functions.

### Asynchronous Programming
*   **Idiom:** `async/await` is mandatory. Avoid raw `.then()/.catch()` chains unless interfacing with legacy libraries that require it.
*   **Concurrency:** Use `Promise.all` or `Promise.allSettled` for parallel operations. Use `p-limit` (via `LlmConcurrencyService`) to throttle concurrent LLM requests.

### Language Standards
*   **Version:** ES2023 / NodeNext.
*   **Features:**
    *   Use `readonly` for immutable properties.
    *   Use `satisfies` operator for type validation without widening.
    *   Use `Object.hasOwn()` instead of `hasOwnProperty`.
    *   Use `structuredClone` for deep copying.

---

## 6. Dependency and Configuration Management

### Dependencies
*   **Management:** `package.json`.
*   **Philosophy:** Prefer robust, typed libraries (`zod`, `tsyringe`).
*   **Common Library:** Truly reusable code belongs in `src/common` and must remain dependency-framework agnostic.

### Configuration
*   **Environment:** Managed via `.env` files loaded by `dotenv`.
*   **Validation:** Environment variables are validated using `zod` schemas in `src/app/env/env.types.ts` before the application starts.
*   **Injection:** Configuration values are injected into classes via DI tokens (e.g., `@inject(configTokens.FileProcessingRules)`).

---

## 7. Testing and Documentation

### Testing Philosophy
*   **Framework:** Jest.
*   **Requirement:** For each significant application feature change or addition, **add appropriate new unit tests**.
*   **Structure:**
    *   Unit tests: `*.test.ts` (colocated or in `tests/`).
    *   Integration tests: `*.int.test.ts`.
*   **Execution:** Run tests via `npm test` or `npm run validate`.

### Documentation Style
*   **Code Comments:** JSDoc for all exported members.
*   **Self-Documenting Code:** Variable and function names should be descriptive enough to minimize the need for inline comments.

---

## 8. Validation and Refactoring Workflow

### Compiling/Building
*   **Command:** `npm run build`
*   **Process:** Compiles TypeScript via `tsc` and copies EJS templates to the `dist` folder.

### Linting
*   **Command:** `npm run lint`
*   **Framework:** ESLint with TypeScript configuration.

### Validation Workflow (Mandatory)
When you have completed application refactoring work or added features:
1.  **Execute:** `npm run validate` (This runs build, lint, unit tests, and integration tests).
2.  **Fix:** Fix **any** reported errors.
3.  **Repeat:** Run the command again until **no errors are reported**.

### Refactoring Guidelines
*   **Backwards Compatibility:** **Do not** try to support backwards compatibility. Change all dependent code that needs changing to support the newly refactored code immediately.
*   **Clean Code:** Remove unused imports and dead code. Ensure `eslint` rules are satisfied without suppression.

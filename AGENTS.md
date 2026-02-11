# Coding Standards and Architectural Conventions

This document outlines the inferred coding standards, architectural patterns, and formatting conventions for the **Codebase Analyzer Tools (CAT)** project. 

## 1. Language(s) and Framework(s) Identification

This project is a **Polyglot Enterprise System** utilizing a diverse set of technologies tailored to specific subsystems. Contributors must adhere to the idioms specific to the language of the module they are working on.

*   **Primary Languages:**
    *   **C# (.NET):** Used for core backend logic, data access, and repository layers.
    *   **Java (J2EE/Jakarta EE):** Used for legacy enterprise beans, components, and web application frameworks.
    *   **Kotlin:** Used for modern domain entities and Spring-based components.
    *   **Ruby:** Used for scripting, data seeding, and maintenance tasks (ActiveRecord integration).
    *   **TypeScript:** Used for utility scripts and likely frontend/Node.js logic.
    *   **Python:** Used for data analysis, algorithm comparison, and machine learning tasks.
    *   **XML:** Used heavily for build configuration (Ant) and deployment descriptors.

*   **Key Frameworks & Libraries:**
    *   **Backend:** NopCommerce (C#), Spring Data JPA (Kotlin), EJB/J2EE (Java), Ruby on Rails/ActiveRecord (Ruby).
    *   **Data Science:** Pandas, Scikit-learn, Matplotlib (Python).
    *   **Build & Tooling:** Ant (Java), NPM (TypeScript/JS), MSBuild (implied for C#).

---

## 2. Formatting and Style Conventions

### Indentation
Indentation varies by language to adhere to community standards. You must configure your editor to detect the language and apply the following:
*   **2 Spaces:** Java, Ruby, TypeScript, XML.
*   **4 Spaces:** C#, Kotlin, Python.
*   **Tabs:** Do not use tabs. Use spaces for alignment.

### Line Endings & Spacing
*   **Blank Lines:**
    *   Use blank lines to separate logical groups of code within functions.
    *   **Control Structure Spacing (Strict Rule):** For `if`, `for`, and `while` statements using `{` `}` blocks:
        *   Ensure a blank line exists **before** the opening block (unless preceded by `{`, `}`, a comment, or a blank line).
        *   Ensure a blank line exists **after** the closing block (unless followed by `}`, `else`, `catch`, `finally`, or a comment).
        *   *Note:* Single-line statements (e.g., `if (x) return;`) are exempt.
*   **Trailing Commas:** Do not use trailing commas in parameter lists (Java/C#). Adhere to standard JSON/TS practices where applicable.

### Braces and Parentheses
*   **C#:** Use **Allman style** (opening brace on a new line).
    ```csharp
    public void Method()
    {
        // code
    }
    ```
*   **Java, Kotlin, TypeScript:** Use **K&R style** (opening brace on the same line).
    ```java
    public void method() {
        // code
    }
    ```
*   **Ruby:** Use `do...end` blocks for multi-line closures.

### Import/Module Ordering
*   **C#:** System namespaces first, followed by third-party libraries, then project namespaces (`Nop.*`).
*   **TypeScript/ES Modules:** External libraries first, followed by internal relative imports.
*   **Java/Kotlin:** Standard `java.*`/`javax.*` imports first, followed by framework imports (`org.springframework`), then local packages.

### Commenting
*   **C#:** Use XML Documentation comments (`///`) for public APIs, classes, and interfaces.
*   **Java:** Use Javadoc (`/** ... */`) for classes and methods.
*   **Ruby/Python:** Use hash (`#`) for inline comments and block explanations.
*   **TypeScript:** Use JSDoc (`/** ... */`) for exported functions.
*   **General:** Comments should explain *why*, not *what*.

---

## 3. Naming Conventions

### Variables
*   **C#:** `camelCase` for local variables and parameters. `_camelCase` for private fields (e.g., `_eventPublisher`).
*   **Java/Kotlin/TypeScript:** `camelCase` (e.g., `streetName1`, `createdBy`).
*   **Ruby/Python:** `snake_case` (e.g., `sepal_length`, `cv_results`).

### Functions/Methods
*   **C#:** `PascalCase` (e.g., `GetByIdAsync`, `Insert`).
*   **Java/Kotlin/TypeScript:** `camelCase` (e.g., `getStreetName1`, `readAndFilterLines`).
*   **Ruby/Python:** `snake_case` (e.g., `refresh!`, `train_test_split`).

### Classes/Components
*   **All Languages:** `PascalCase` (e.g., `EntityRepository`, `AddressEJB`, `Refresher`).
*   **Abstract Classes:** Prefix with `Abstract` (e.g., `AbstractAuditingEntity`) or suffix with base type.

### Constants
*   **General:** `UPPER_SNAKE_CASE` (e.g., `serialVersionUID`).

### Files and Directories
*   **C#/Java/Kotlin:** `PascalCase` matching the class name (e.g., `AddressEJB.java`, `EntityRepository.cs`).
*   **TypeScript:** `kebab-case` (e.g., `file-content-utils.ts`).
*   **Ruby/Python:** `snake_case` (e.g., `001_refresh.rb`, `compare-algos.py`).

---

## 4. Architectural Patterns and Code Structure

### Overall Architecture
The system follows a **Layered, Component-Based Architecture**.
*   **Core/Domain Layer:** Contains entities and business logic (e.g., `AbstractAuditingEntity`, `AddressEJB`).
*   **Data Access Layer:** Implements the Repository Pattern (e.g., `EntityRepository`) to abstract database interactions.
*   **Common/Utility Layer:** Shared logic agnostic of specific business domains.

### Directory Structure & Key Rules
*   **`src/common/`:**
    *   **Purpose:** Code here must be generic and reusable across multiple projects.
    *   **Constraint:** Code in this directory **must not** use "tsyringe" or any other dependency injection framework internally. It must remain portable.
*   **Barrel Files:** Avoid creating barrel index files (files that only re-export other files) unless absolutely necessary.
*   **`components/`:** Used in the Java/Ant structure to separate functional modules (e.g., `address`, `cart`).

### Database Use
*   **Pattern:** Object-Relational Mapping (ORM).
*   **Implementations:**
    *   **C#:** Entity Framework (implied by `IQueryable` and `Table` properties).
    *   **Java/Kotlin:** JPA (Java Persistence API) with Hibernate.
    *   **Ruby:** ActiveRecord.
*   **Transactions:** Explicit transaction scopes are used for bulk operations (e.g., `TransactionScope` in C#).

### Data Fetching & Caching
*   **Repository Pattern:** All data access should go through repositories.
*   **Caching:** The C# architecture explicitly implements a multi-level caching strategy (Static Cache vs. Short Term Cache vs. Distributed/Redis).
    *   *Guideline:* Always consider cache invalidation keys when fetching entities.

---

## 5. Language-Specific Idioms and Best Practices

### Asynchronous Programming
*   **C#:** Prefer `async/await` for all I/O bound operations. Method names must end with `Async` (e.g., `GetAllAsync`).
*   **TypeScript:** Use `async/await` over raw Promises.
*   **Ruby:** Thread safety is managed manually using `Mutex` for shared resources.

### Error Handling
*   **Exceptions:** Use `try...catch` blocks.
*   **Ruby:** Handle specific errors (e.g., `rescue StandardError`).
*   **C#:** Argument validation is enforced (e.g., `ArgumentNullException.ThrowIfNull`).

### Refactoring Guidelines
*   **Backwards Compatibility:** Do **not** maintain backwards compatibility when refactoring. Change all dependent code to support the newly refactored logic immediately.
*   **Validation:** After refactoring, you must execute the validation script.
    *   **Command:** `npm run validate`
    *   **Process:** Run the command -> Fix reported errors -> Repeat until 0 errors are reported.

### Linting and Code Quality
*   **Strict Compliance:** For any reported linting errors, fix the underlying problem.
*   **Prohibition:** Do **not** use comments (e.g., `// eslint-disable...`) to suppress linting errors.

---

## 6. Dependency and Configuration Management

### Dependencies
*   **Java:** Managed via `build.xml` (Ant) and likely external library folders (`lib/`).
*   **TypeScript/JS:** Managed via `package.json` (NPM).
*   **Python:** Imports indicate standard data science stack (`pandas`, `sklearn`).

### Configuration
*   **C#:** Uses `AppSettings` object injected via constructor (Strongly typed configuration).
*   **Java:** Uses XML deployment descriptors (`sun-j2ee-ri.xml`).

---

## 7. Testing and Documentation

### Testing Philosophy
*   **Requirement:** For **every** significant application feature change or addition, you must add appropriate new unit tests.
*   **Frameworks:**
    *   **Python:** `cross_val_score` indicates statistical validation.
    *   **C#:** Unit testing framework implied (likely xUnit or NUnit based on .NET standards).
    *   **Java:** JUnit (standard for this era of J2EE).

### Documentation Style
*   **APIs:** Public methods in repositories and services must have documentation explaining parameters and return values.
*   **License Headers:** Java files require the standard Sun Microsystems/Oracle license header.

---

## 8. Validation and Build

### Compiling/Building
*   **Java:** Run `ant core` to build components or `ant all` for full build and docs.
*   **TypeScript:** Transpilation handled via NPM scripts.

### Validation Workflow
To ensure code quality before submission:
1.  Complete your refactoring or feature work.
2.  Run `npm run validate`.
3.  If errors occur, fix the code (do not suppress the linter).
4.  Rerun `npm run validate`.
5.  Continue until the output is clean.

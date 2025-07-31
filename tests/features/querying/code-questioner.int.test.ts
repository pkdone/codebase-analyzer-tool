import "reflect-metadata";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import CodeQuestioner from "../../../src/components/querying/code-questioner";
import LLMRouter from "../../../src/llm/core/llm-router";
import type { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";
import type { ProjectedSourceMetataContentAndSummary } from "../../../src/repositories/source/sources.model";

// Mock dependencies
jest.mock("../../../src/llm/core/llm-router");
jest.mock("../../../src/repositories/source/sources.repository");

describe("CodeQuestioner Integration Tests", () => {
  let codeQuestioner: CodeQuestioner;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  const mockProjectName = "test-project";
  const mockQuestion = "How does user authentication work?";

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock LLMRouter
    mockLLMRouter = {
      generateEmbeddings: jest.fn(),
      executeCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    // Create mock SourcesRepository
    mockSourcesRepository = {
      vectorSearchProjectSourcesRawContent: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    // Create CodeQuestioner instance with mocked dependencies
    codeQuestioner = new CodeQuestioner(mockSourcesRepository, mockLLMRouter);
  });

  describe("Successful Query Flow", () => {
    test("should execute complete query flow successfully", async () => {
      // Mock embedding generation
      const mockQueryVector = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      // Mock vector search results
      const mockSearchResults: ProjectedSourceMetataContentAndSummary[] = [
        {
          filepath: "src/auth/auth-service.ts",
          content: `
export class AuthService {
  async login(username: string, password: string) {
    // Authenticate user
    const user = await this.validateCredentials(username, password);
    return this.generateToken(user);
  }
}`,
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "Authentication service for user login",
            implementation: "Service class for handling user authentication",
          },
        },
        {
          filepath: "src/auth/user-model.ts",
          content: `
export interface User {
  id: string;
  username: string;
  role: string;
}`,
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "User model interface",
            implementation: "TypeScript interface definition for user entity",
          },
        },
      ];
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(
        mockSearchResults,
      );

      // Mock LLM completion response
      const mockLLMResponse =
        "The authentication system works by validating user credentials through the AuthService class...";
      mockLLMRouter.executeCompletion.mockResolvedValue(mockLLMResponse);

      // Execute the query
      const result = await codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName);

      // Verify the flow
      expect(mockLLMRouter.generateEmbeddings).toHaveBeenCalledWith("Human question", mockQuestion);
      expect(mockSourcesRepository.vectorSearchProjectSourcesRawContent).toHaveBeenCalledWith(
        mockProjectName,
        mockQueryVector,
        expect.any(Number), // vectorSearchResultsLimit
      );
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "Query codebase with context",
        expect.stringContaining(mockQuestion),
        expect.objectContaining({
          outputFormat: expect.any(String),
        }),
      );
      expect(result).toBe(mockLLMResponse);
    });

    test("should handle multiple search results and combine them properly", async () => {
      const mockQueryVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      // Create multiple search results to test content combination
      const mockSearchResults: ProjectedSourceMetataContentAndSummary[] = [
        {
          filepath: "src/auth/auth.ts",
          content: "// Auth implementation",
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "Main auth file",
            implementation: "Core authentication implementation",
          },
        },
        {
          filepath: "src/auth/middleware.ts",
          content: "// Auth middleware",
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "Auth middleware",
            implementation: "Middleware for request authentication",
          },
        },
        {
          filepath: "src/auth/utils.ts",
          content: "// Auth utilities",
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "Auth utility functions",
            implementation: "Helper functions for authentication",
          },
        },
      ];
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(
        mockSearchResults,
      );

      const mockResponse = "Combined response based on multiple files";
      mockLLMRouter.executeCompletion.mockResolvedValue(mockResponse);

      const result = await codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName);

      // Verify that the prompt contains all search results
      const completionCall = mockLLMRouter.executeCompletion.mock.calls[0];
      const prompt = completionCall[1];

      expect(prompt).toContain("src/auth/auth.ts");
      expect(prompt).toContain("src/auth/middleware.ts");
      expect(prompt).toContain("src/auth/utils.ts");
      expect(prompt).toContain("// Auth implementation");
      expect(prompt).toContain("// Auth middleware");
      expect(prompt).toContain("// Auth utilities");
      expect(result).toBe(mockResponse);
    });
  });

  describe("Error Handling", () => {
    test("should handle embedding generation failure", async () => {
      mockLLMRouter.generateEmbeddings.mockResolvedValue(null);

      const result = await codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName);

      expect(result).toBe("No vector was generated for the question - unable to answer question");
      expect(mockSourcesRepository.vectorSearchProjectSourcesRawContent).not.toHaveBeenCalled();
      expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
    });

    test("should handle empty embedding vector", async () => {
      mockLLMRouter.generateEmbeddings.mockResolvedValue([]);

      const result = await codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName);

      expect(result).toBe("No vector was generated for the question - unable to answer question");
      expect(mockSourcesRepository.vectorSearchProjectSourcesRawContent).not.toHaveBeenCalled();
    });

    test("should handle no search results", async () => {
      const mockQueryVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue([]);

      const result = await codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName);

      expect(result).toBe("No relevant code was found to answer the question");
      expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
    });

    test("should handle LLM completion failure", async () => {
      const mockQueryVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      const mockSearchResults: ProjectedSourceMetataContentAndSummary[] = [
        {
          filepath: "test.ts",
          content: "// test content",
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "test summary",
            implementation: "test implementation",
          },
        },
      ];
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(
        mockSearchResults,
      );

      mockLLMRouter.executeCompletion.mockResolvedValue(null);

      const result = await codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName);

      expect(result).toBe("Unable to get an answer from the LLM");
    });

    test("should handle vector search repository errors", async () => {
      const mockQueryVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(
        codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName),
      ).rejects.toThrow("Database connection failed");
    });

    test("should handle LLM router embedding errors", async () => {
      mockLLMRouter.generateEmbeddings.mockRejectedValue(new Error("LLM service unavailable"));

      await expect(
        codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName),
      ).rejects.toThrow("LLM service unavailable");
    });
  });

  describe("Prompt Construction", () => {
    test("should construct proper prompt with question and code content", async () => {
      const mockQueryVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      const testQuestion = "How is error handling implemented?";
      const mockSearchResults: ProjectedSourceMetataContentAndSummary[] = [
        {
          filepath: "src/errors/error-handler.ts",
          content: `
export class ErrorHandler {
  handle(error: Error) {
    console.error(error.message);
    throw error;
  }
}`,
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "Global error handler",
            implementation: "Error handling service for application",
          },
        },
      ];
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(
        mockSearchResults,
      );

      mockLLMRouter.executeCompletion.mockResolvedValue("Error handling response");

      await codeQuestioner.queryCodebaseWithQuestion(testQuestion, mockProjectName);

      const completionCall = mockLLMRouter.executeCompletion.mock.calls[0];
      const prompt = completionCall[1];

      // Verify prompt structure
      expect(prompt).toContain("QUESTION:");
      expect(prompt).toContain(testQuestion);
      expect(prompt).toContain("CODE:");
      expect(prompt).toContain("src/errors/error-handler.ts");
      expect(prompt).toContain("export class ErrorHandler");
      expect(prompt).toContain("Act as a senior developer");
    });

    test("should include file paths and content in correct format", async () => {
      const mockQueryVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      const mockSearchResults: ProjectedSourceMetataContentAndSummary[] = [
        {
          filepath: "components/Button.tsx",
          content: "export const Button = () => <button>Click me</button>;",
          projectName: "test-project",
          type: "tsx",
          summary: {
            purpose: "React button component",
            implementation: "Reusable UI button component",
          },
        },
        {
          filepath: "utils/helpers.ts",
          content: "export const formatDate = (date: Date) => date.toISOString();",
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "Date formatting utility",
            implementation: "Utility function for date formatting",
          },
        },
      ];
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(
        mockSearchResults,
      );

      mockLLMRouter.executeCompletion.mockResolvedValue("Component analysis");

      await codeQuestioner.queryCodebaseWithQuestion(
        "How are components structured?",
        mockProjectName,
      );

      const completionCall = mockLLMRouter.executeCompletion.mock.calls[0];
      const prompt = completionCall[1];

      // Verify that each file is properly formatted
      expect(prompt).toMatch(/File: components\/Button\.tsx[\s\S]*export const Button/);
      expect(prompt).toMatch(/File: utils\/helpers\.ts[\s\S]*export const formatDate/);
    });
  });

  describe("Vector Search Configuration", () => {
    test("should use appropriate vector search limit", async () => {
      const mockQueryVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue([]);

      await codeQuestioner.queryCodebaseWithQuestion(mockQuestion, mockProjectName);

      expect(mockSourcesRepository.vectorSearchProjectSourcesRawContent).toHaveBeenCalledWith(
        mockProjectName,
        mockQueryVector,
        expect.any(Number),
      );

      // Verify the limit is reasonable (should be from config)
      const searchCall = mockSourcesRepository.vectorSearchProjectSourcesRawContent.mock.calls[0];
      const limit = searchCall[2];
      expect(typeof limit).toBe("number");
      expect(limit).toBeGreaterThan(0);
      expect(limit).toBeLessThanOrEqual(50); // Reasonable upper bound
    });
  });

  describe("Real-world Scenarios", () => {
    test("should handle typical development question about API endpoints", async () => {
      const question = "What REST endpoints are available for user management?";
      const mockQueryVector = [0.15, 0.25, 0.35, 0.45];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      const mockSearchResults: ProjectedSourceMetataContentAndSummary[] = [
        {
          filepath: "routes/users.ts",
          content: `
router.get('/api/users', getAllUsers);
router.post('/api/users', createUser);
router.put('/api/users/:id', updateUser);
router.delete('/api/users/:id', deleteUser);`,
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "User management REST endpoints",
            implementation: "REST API routes for user CRUD operations",
          },
        },
        {
          filepath: "controllers/user-controller.ts",
          content: `
export const getAllUsers = async (req, res) => {
  const users = await userService.findAll();
  res.json(users);
};`,
          projectName: "test-project",
          type: "ts",
          summary: {
            purpose: "User controller implementation",
            implementation: "Controller class for user-related HTTP requests",
          },
        },
      ];
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(
        mockSearchResults,
      );

      const expectedResponse = "The application provides CRUD endpoints for user management...";
      mockLLMRouter.executeCompletion.mockResolvedValue(expectedResponse);

      const result = await codeQuestioner.queryCodebaseWithQuestion(question, mockProjectName);

      expect(result).toBe(expectedResponse);
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "Query codebase with context",
        expect.stringContaining("REST endpoints"),
        expect.any(Object),
      );
    });

    test("should handle question about database schema", async () => {
      const question = "How is the user table structured?";
      const mockQueryVector = [0.2, 0.3, 0.4];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockQueryVector);

      const mockSearchResults: ProjectedSourceMetataContentAndSummary[] = [
        {
          filepath: "migrations/001_create_users.sql",
          content: `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`,
          projectName: "test-project",
          type: "sql",
          summary: {
            purpose: "User table creation migration",
            implementation: "SQL migration for creating user table",
          },
        },
      ];
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(
        mockSearchResults,
      );

      const expectedResponse = "The user table has the following structure...";
      mockLLMRouter.executeCompletion.mockResolvedValue(expectedResponse);

      const result = await codeQuestioner.queryCodebaseWithQuestion(question, mockProjectName);

      expect(result).toBe(expectedResponse);
      const prompt = mockLLMRouter.executeCompletion.mock.calls[0][1];
      expect(prompt).toContain("CREATE TABLE users");
      expect(prompt).toContain("password_hash");
    });
  });
});

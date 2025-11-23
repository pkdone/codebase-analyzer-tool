import "reflect-metadata";
import { queryCodebaseWithQuestion } from "../../../src/components/querying/codebase-query-processor";
import type { SourcesRepository } from "../../../src/repositories/sources/sources.repository.interface";
import type LLMRouter from "../../../src/llm/llm-router";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import type { ProjectedSourceMetataContentAndSummary } from "../../../src/repositories/sources/sources.model";

describe("queryCodebaseWithQuestion", () => {
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  const testProjectName = "test-project";
  const testQuestion = "How does authentication work?";

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockSourcesRepository = {
      vectorSearchProjectSourcesRawContent: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    // Create mock LLM router
    mockLLMRouter = {
      generateEmbeddings: jest.fn(),
      executeCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;
  });

  describe("queryCodebaseWithQuestion", () => {
    it("should successfully query codebase and return formatted response with references", async () => {
      // Arrange
      const mockVector = [0.1, 0.2, 0.3];
      const mockSourceFiles: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: testProjectName,
          filepath: "src/auth/login.ts",
          type: "typescript",
          content: "export function login() { /* code */ }",
        },
        {
          projectName: testProjectName,
          filepath: "src/auth/verify.ts",
          type: "typescript",
          content: "export function verify() { /* code */ }",
        },
      ];
      const mockLLMResponse = "The authentication works by using JWT tokens.";

      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(mockSourceFiles);
      mockLLMRouter.executeCompletion.mockResolvedValue(mockLLMResponse);

      // Act
      const result = await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert
      expect(mockLLMRouter.generateEmbeddings).toHaveBeenCalledWith("Human question", testQuestion);
      expect(mockSourcesRepository.vectorSearchProjectSourcesRawContent).toHaveBeenCalledWith(
        testProjectName,
        mockVector,
        150, // VECTOR_SEARCH_NUM_CANDIDATES
        6, // VECTOR_SEARCH_NUM_LIMIT
      );
      expect(mockLLMRouter.executeCompletion).toHaveBeenCalledWith(
        "Codebase query",
        expect.stringContaining(testQuestion),
        { outputFormat: LLMOutputFormat.TEXT },
      );
      expect(result).toContain(mockLLMResponse);
      expect(result).toContain("References:");
      expect(result).toContain("src/auth/login.ts");
      expect(result).toContain("src/auth/verify.ts");
    });

    it("should return error message when no vector is generated", async () => {
      // Arrange
      mockLLMRouter.generateEmbeddings.mockResolvedValue(null);

      // Act
      const result = await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert
      expect(result).toBe("No vector was generated for the question - unable to answer question");
      expect(mockSourcesRepository.vectorSearchProjectSourcesRawContent).not.toHaveBeenCalled();
    });

    it("should return error message when empty vector is generated", async () => {
      // Arrange
      mockLLMRouter.generateEmbeddings.mockResolvedValue([]);

      // Act
      const result = await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert
      expect(result).toBe("No vector was generated for the question - unable to answer question");
      expect(mockSourcesRepository.vectorSearchProjectSourcesRawContent).not.toHaveBeenCalled();
    });

    it("should return error message when vector search returns no results", async () => {
      // Arrange
      const mockVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue([]);

      // Act
      const result = await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert
      expect(result).toBe("Unable to answer question because no relevent code was found");
      expect(mockLLMRouter.executeCompletion).not.toHaveBeenCalled();
    });

    it("should return error message when LLM returns empty response", async () => {
      // Arrange
      const mockVector = [0.1, 0.2, 0.3];
      const mockSourceFiles: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: testProjectName,
          filepath: "src/test.ts",
          type: "typescript",
          content: "test content",
        },
      ];

      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(mockSourceFiles);
      mockLLMRouter.executeCompletion.mockResolvedValue(null);

      // Act
      const result = await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert
      expect(result).toBe("Unable to answer question because no insight was generated");
    });

    it("should handle object response from LLM", async () => {
      // Arrange
      const mockVector = [0.1, 0.2, 0.3];
      const mockSourceFiles: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: testProjectName,
          filepath: "src/test.ts",
          type: "typescript",
          content: "test content",
        },
      ];
      const mockLLMResponse = { answer: "Authentication uses JWT" };

      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(mockSourceFiles);
      mockLLMRouter.executeCompletion.mockResolvedValue(mockLLMResponse);

      // Act
      const result = await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert
      expect(result).toContain(JSON.stringify(mockLLMResponse));
      expect(result).toContain("References:");
    });

    it("should use correct vector search parameters", async () => {
      // Arrange
      const mockVector = [0.1, 0.2, 0.3];
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue([
        {
          projectName: testProjectName,
          filepath: "test.ts",
          type: "typescript",
          content: "content",
        },
      ]);
      mockLLMRouter.executeCompletion.mockResolvedValue("response");

      // Act
      await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert - Verify the constants are used correctly
      const callArgs = mockSourcesRepository.vectorSearchProjectSourcesRawContent.mock.calls[0];
      expect(callArgs[2]).toBe(150); // VECTOR_SEARCH_NUM_CANDIDATES
      expect(callArgs[3]).toBe(6); // VECTOR_SEARCH_NUM_LIMIT);
    });

    it("should use CODEBASE_QUERY_TEMPLATE from templates.ts", async () => {
      // Arrange
      const mockVector = [0.1, 0.2, 0.3];
      const mockSourceFiles: ProjectedSourceMetataContentAndSummary[] = [
        {
          projectName: testProjectName,
          filepath: "src/test.ts",
          type: "typescript",
          content: "test content",
        },
      ];

      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockVector);
      mockSourcesRepository.vectorSearchProjectSourcesRawContent.mockResolvedValue(mockSourceFiles);
      mockLLMRouter.executeCompletion.mockResolvedValue("response");

      // Act
      await queryCodebaseWithQuestion(
        mockSourcesRepository,
        mockLLMRouter,
        testQuestion,
        testProjectName,
      );

      // Assert - Verify the prompt uses the template from templates.ts
      const callArgs = mockLLMRouter.executeCompletion.mock.calls[0];
      const prompt = callArgs[1];
      expect(prompt).toContain("Act as a senior developer");
      expect(prompt).toContain("QUESTION:");
      expect(prompt).toContain("CODE:");
      expect(prompt).toContain(testQuestion);
      expect(prompt).toContain("test content");
    });
  });
});

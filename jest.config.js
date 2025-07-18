module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Define where to find test files (exclude integration tests)
  testMatch: [
    '<rootDir>/tests/**/*.test.ts'
  ],

  // Override the default test match
  testPathIgnorePatterns: [
    '/node_modules/',        // Keep the default ignore
    '<rootDir>/dist/',       // Ignore the dist folder
    '.*\\.int\\.test\\.ts$',   // Skip integration tests using regex
  ],  
};

// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // JavaScript files - use standard ESLint with Node.js globals
  {
    files: ['**/*.js'],
    ...eslint.configs.recommended,
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'script', // CommonJS for .js files
      },
    },
  },

  // ES Module JavaScript files (.mjs) - use standard ESLint with Node.js globals
  {
    files: ['**/*.mjs'],
    ...eslint.configs.recommended,
    languageOptions: {
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module', // ES modules for .mjs files
      },
    },
  },

  // TypeScript files - use strict TypeScript ESLint
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/explicit-member-accessibility": ["error", { "accessibility": "no-public" }],
      "@typescript-eslint/member-ordering": "error",     
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true, 
          allowBoolean: true, 
          allowArray: false,
          allowNullish: false,
          allowRegExp: false,
        },
      ],      
    },
    
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  
  // Relaxed rules for test files
  {
    files: ["tests/**/*.ts", "tests/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off", 
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
);
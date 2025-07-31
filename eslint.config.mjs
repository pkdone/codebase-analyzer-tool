// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['*js', 'dist/**', 'node_modules/**'],
  },

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    rules: {
      "@typescript-eslint/explicit-member-accessibility": ["error", { "accessibility": "no-public" }],
      "@typescript-eslint/member-ordering": "error",     
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/promise-function-async": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-unnecessary-type-parameters": "off",
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
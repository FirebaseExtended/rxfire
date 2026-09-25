import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    name: 'Project - Ignores',
    ignores: ['dist/**', 'node_modules/**', '.firebase/**', '.yarn/**'],
  },
  {
    name: 'Project - Linter Options',
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    name: 'ESLint JS - Recommended',
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
  },
  {
    name: 'Project - TypeScript',
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    rules: {
      'max-len': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      '@typescript-eslint/no-wrapper-object-types': 'off',
    },
  },
]);
// @ts-check

/** Check out https://typescript-eslint.io/getting-started/ */

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  ...defineConfig([
    {
      name: 'ESLint JS - Recommended',
      ...js.configs.recommended
    },
    tseslint.configs.recommended,
    {
      name: 'typescript-eslint - config parser',
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.node,
        },
        parser: tseslint.parser,
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
          ecmaVersion: 12,
          sourceType: 'module',
        },
      },
    },
  ]),
  {
    name: 'Ignore folder and files',
    ignores: ['**/dist', '**/eslint.config.mjs'],
  },
  {
    name: 'typescript-eslint plugin - Custom rules',
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  },
];

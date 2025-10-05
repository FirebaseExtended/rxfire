// @ts-check

/** Check out https://typescript-eslint.io/getting-started/ */

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  ...defineConfig([
    eslint.configs.recommended,
    tseslint.configs.recommended,
    [
      {
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
    ],
  ]),
  {
    ignores: ['**/dist', 'eslint.config.mjs'],
  },
  {
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  },
];

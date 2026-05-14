import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import promisePlugin from 'eslint-plugin-promise';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const importOrderRule = [
  'error',
  {
    groups: [
      'builtin',
      'external',
      'internal',
      ['parent', 'sibling', 'index'],
      'type',
    ],
    pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
    pathGroupsExcludedImportTypes: ['type'],
    'newlines-between': 'always',
    alphabetize: { order: 'asc', caseInsensitive: true },
  },
];

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'src/routeTree.gen.ts']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'import-x': importX,
      promise: promisePlugin,
      react: reactPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: './tsconfig.app.json' }),
      ],
      react: { version: 'detect' },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'import-x/order': importOrderRule,
      'promise/prefer-await-to-then': 'error',
      'react/forbid-dom-props': ['error', { forbid: ['style'] }],
    },
  },
  // shadcn-generated UI primitives — do not edit; chart.tsx uses inline style legitimately
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react/forbid-dom-props': 'off',
    },
  },
  // TODO(NUE-M3): remove this override once pages migrate to apiClient + Tailwind
  {
    files: [
      'src/pages/**/*.{ts,tsx}',
      'src/components/CustomerProfilePage.tsx',
    ],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      'promise/prefer-await-to-then': 'off',
      'react/forbid-dom-props': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', '*.config.{ts,js}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'import-x': importX },
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'import-x/order': importOrderRule,
    },
  },
  eslintConfigPrettier,
]);

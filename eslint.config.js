// ESLint flat config (v9+)
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import importPlugin from 'eslint-plugin-import'

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '.claude/**', '_archive/**', '**/*.d.ts'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      // Strictness
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],

      // Imports
      'import/no-cycle': ['error', { maxDepth: 3 }],
      'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
    },
  },
  // Client-specific: forbids importing server code
  {
    files: ['packages/client/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/packages/server/**'], message: 'client must not import from server' },
            { group: ['**/server/src/**'], message: 'client must not import from server' },
          ],
        },
      ],
    },
  },
  // Server-specific: forbids importing client code or DOM
  {
    files: ['packages/server/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/packages/client/**'], message: 'server must not import from client' },
            { group: ['three', 'three/*'], message: 'three.js is client-only' },
          ],
        },
      ],
    },
  },
]

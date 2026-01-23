import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '*.config.js', '*.config.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // Type-aware linting for stricter type safety
      ...tseslint.configs.recommendedTypeChecked,
      // Stylistic rules for consistency
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // React specific
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript relaxations for practical use
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Allow || for simplicity
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: { attributes: false }
      }],

      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // Separate config for test files with relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test_data/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
])

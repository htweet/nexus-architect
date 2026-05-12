import js from '@eslint/js';
// @typescript-eslint v8 ships a typed-config helper — use it for ESLint 9 compat.
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  // Base JS recommended rules.
  js.configs.recommended,

  // TypeScript recommended rules (v8 flat-config style).
  ...tseslint.configs.recommended,

  // Project-specific overrides.
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      // react-hooks v5 uses the recommended export directly.
      'react-hooks/rules-of-hooks':  'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Global ignores.
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/storybook-static/**', '**/.turbo/**'],
  },
);

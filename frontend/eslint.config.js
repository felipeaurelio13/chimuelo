import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'public/',
      'node_modules/',
      '**/*.d.ts',
      'vite.config.*',
      'vitest.config.*',
      'tailwind.config.*',
      'postcss.config.*',
      'eslint.config.*',
    ],
  },
];

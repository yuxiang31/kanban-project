/**
 * @fileoverview ESLint config. Rules adapted from the Google JavaScript Style
 * Guide (https://google.github.io/styleguide/jsguide.html). Layout is left to
 * the Biome formatter, so no stylistic rules are enabled here.
 */

import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

const googleRules = {
  'no-var': 'error',
  'prefer-const': ['error', {destructuring: 'all'}],
  'prefer-rest-params': 'error',
  'prefer-spread': 'error',
  'prefer-template': 'error',
  'object-shorthand': 'error',
  eqeqeq: ['error', 'always', {null: 'ignore'}],
  curly: ['error', 'all'],
  'new-cap': ['error', {capIsNew: false}],
  camelcase: ['error', {properties: 'never', ignoreDestructuring: true}],
  'no-throw-literal': 'error',
  'no-new-wrappers': 'error',
  'no-array-constructor': 'error',
  'no-multi-str': 'error',
  'guard-for-in': 'error',
  'no-unused-vars': [
    'error',
    {argsIgnorePattern: '^_', varsIgnorePattern: '^_'},
  ],
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/data/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {...globals.node},
    },
    rules: googleRules,
  },
  {
    files: ['apps/web/**/*.{js,jsx}'],
    plugins: {react, 'react-hooks': reactHooks},
    languageOptions: {
      parserOptions: {ecmaFeatures: {jsx: true}},
      globals: {...globals.browser},
    },
    settings: {react: {version: 'detect'}},
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
    },
  },
];

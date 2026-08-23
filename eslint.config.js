import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const isTripleSlashDirective = (comment, sourceCode) =>
  comment.type === 'Line' &&
  comment.value.startsWith('/ <reference') &&
  sourceCode.getIndexFromLoc(comment.loc.start) === 0;

const castAdrift = {
  rules: {
    'no-comments': {
      meta: {
        type: 'problem',
        docs: { description: 'source carries no comments; rationale lives in docs/design-notes.md' },
        schema: [],
        messages: {
          found: 'no comments in src — move the rationale to docs/design-notes.md',
        },
      },
      create(context) {
        const sourceCode = context.sourceCode;
        return {
          Program() {
            for (const comment of sourceCode.getAllComments()) {
              if (isTripleSlashDirective(comment, sourceCode)) continue;
              context.report({ loc: comment.loc, messageId: 'found' });
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-e2e',
      'node_modules',
      'coverage',
      '.claude',
      'sim-out',
      'e2e/.artifacts',
      'playwright-report',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx,mts}'],
    plugins: {
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'use services/rng.ts streams',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'use union types / const objects',
        },
      ],
      'import/no-default-export': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/chaos', '**/services/chaos'],
              message:
                'chaos entropy is the wormhole exception (DESIGN 9.1); nothing else may import it',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,js}'],
    plugins: { 'cast-adrift': castAdrift },
    rules: {
      'cast-adrift/no-comments': 'error',
    },
  },
  {
    files: ['src/services/rng.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    files: [
      'src/services/chaos.ts',
      'src/services/chaos.test.ts',
      'src/game/run/flow.ts',
      'src/game/run/wormholeFlow.test.ts',
      'src/services/testApi.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['e2e/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: [
      'vite.config.ts',
      'vitest.config.ts',
      'vitest.rules.config.ts',
      'playwright.config.ts',
      'playwright.emu.config.ts',
      'eslint.config.js',
      'api/**',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },
);

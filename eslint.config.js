import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
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
    },
  },
  {
    files: ['src/services/rng.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'vitest.config.ts', 'eslint.config.js', 'api/**'],
    rules: {
      'import/no-default-export': 'off',
    },
  },
);

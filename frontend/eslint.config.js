import ParserTypescriptEslint from '@typescript-eslint/parser';
import PluginImport from 'eslint-plugin-import';
import PluginJest from 'eslint-plugin-jest';
import PluginTypescriptEslint from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  {
    ignores: [
      'build/**/*',
      'dist/**/*',
      'node_modules/**/*',
      '*.config.js',
      '*.config.ts',
      'coverage/**/*',
      '.vscode/**/*',
      '.cursor/**/*'
    ]
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021
      },
      parser: ParserTypescriptEslint,
      parserOptions: {
        tsconfigRootDir: __dirname
      }
    },

    plugins: {
      import: PluginImport,
      jest: PluginJest,
      '@typescript-eslint': PluginTypescriptEslint
    },
    rules: {
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
      'no-var': 'error',
      'no-unused-vars': 'off',
      'no-magic-numbers': [
        'error',
        {
          ignoreArrayIndexes: true,
          ignore: [
            -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 20, 50, 200, 400, 401, 404, 500,
            600, 700, 800, 1000, 2000, 3000
          ],
          ignoreDefaultValues: true
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
      // Avoid barrel imports by restricting the import of MUI components for development
      // 'no-restricted-imports': [
      //   'error',
      //   {
      //     patterns: [{ regex: '^@mui/[^/]+$' }]
      //   }
      // ]
    },
    settings: {
      'import/resolver': {
        ...PluginImport.configs.typescript.settings['import/resolver'],
        typescript: {
          project: ['tsconfig.json']
        }
      }
    }
  }
];

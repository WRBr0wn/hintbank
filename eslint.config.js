import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // The Cloudflare Worker (server/) is not React and runs on worker globals.
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: { ...globals.worker, WebSocketPair: 'readonly' },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Worker test frames are decoded JSON asserted against; any is the honest
    // shape there.
    files: ['server/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)

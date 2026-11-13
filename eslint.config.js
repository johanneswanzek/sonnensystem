// ESLint (flat config): no-undef ist die harte Regel – jede Abhängigkeit muss als import sichtbar sein.
// Kein Umformatieren des bestehenden Codes; Stilregeln bleiben aus.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'dist-artifact/', '.test/', '.artifact/', '.shots/', 'public/', 'node_modules/', 'playwright-report/', 'test-results/', 'tools/models/node_modules/', 'work/'] },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, __TARGET__: 'readonly', __SITE__: 'readonly' },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    files: ['tools/**/*.{js,mjs}', 'tests/**/*.js', '*.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': 'warn' },
  },
  {
    files: ['tools/shots/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // E2E-Suite: CommonJS (tests/e2e/package.json), Code läuft teils im Browser (page.evaluate).
    // Playwright verlangt das leere Muster ({}, info) für Tests ohne Fixtures; Regeln mit geschütztem Leerzeichen sind Absicht.
    files: ['tests/e2e/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-empty-pattern': 'off', 'no-empty': ['error', { allowEmptyCatch: true }], 'no-irregular-whitespace': 'off', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }] },
  },
];

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', 'web-build/*', 'store-assets/*', 'test-results/*', 'playwright-report/*', '.eas/*']),
  expoConfig,
  {
    rules: {
      // The React Compiler rules describe the constraints the compiler needs.
      // app.json does not turn the compiler on, and the app already relies on
      // patterns these flag: reading the clock while rendering, and mirroring
      // props into a ref so the rest timer survives a closed screen. Revisit
      // these rules when the compiler is enabled, not before.
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // `Notifications.AndroidImportance` is an enum, which this resolver cannot
      // see through the namespace import.
      'import/namespace': 'warn',
    },
  },
  {
    // Node scripts are not bundled, so Expo's inline-env rule does not apply.
    // The upload script reads secret names from the shell environment.
    files: ['scripts/**/*.ts'],
    rules: { 'expo/no-dynamic-env-var': 'off' },
  },
]);

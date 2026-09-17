module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist/**', 'coverage/**', 'node_modules/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};

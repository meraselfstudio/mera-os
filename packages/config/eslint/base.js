/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
]

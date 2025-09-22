export default {
  testEnvironment: 'node',
  transform: {},               // ESM puro, sin transpilar
  setupFiles: ['<rootDir>/tests/setup.js'], // mocks antes de cargar tests
  testMatch: ['**/tests/**/*.test.js']
};

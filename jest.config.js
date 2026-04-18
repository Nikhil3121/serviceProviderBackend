// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/swagger.js',
    '!src/templates/**',
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  testTimeout: 30000,
  setupFilesAfterFramework: [],
  verbose: true,
};

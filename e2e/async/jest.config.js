require('ts-node').register();

module.exports = {
  resolver: '<rootDir>/../../src/resolvers/ng-jest-resolver.ts',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/../../setup-jest.js'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': ['<rootDir>/../../src/index.ts', require('./ts-jest.config')],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};

require('ts-node').register();

module.exports = {
  resolver: '<rootDir>/../../src/resolvers/ng-jest-resolver.ts',
  setupFilesAfterEnv: ['<rootDir>/../../setup-jest.js'],
  snapshotSerializers: [
    '<rootDir>/../../build/serializers/html-comment',
    '<rootDir>/../../build/serializers/ng-snapshot',
    '<rootDir>/../../build/serializers/no-ng-attributes',
  ],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|js|mjs|html)$': ['<rootDir>/../../src/index.ts', require('./ts-jest.config')],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};

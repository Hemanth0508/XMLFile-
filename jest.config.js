// jest.config.js

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 10000, // 10 seconds
};

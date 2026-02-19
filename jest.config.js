export default {
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testMatch: [
        '<rootDir>/src/components/**/*.test.ts?(x)',
        '<rootDir>/src/app/api/!(**)/__tests__/*.test.ts?(x)', // Exclude src/app/api/__tests__
        '<rootDir>/src/app/!(api)/**/__tests__/*.test.ts?(x)', // Match other app/__tests__ but not api
        '<rootDir>/src/lib/**/*.test.ts?(x)', // Added to match src/lib/validations/customer.test.ts
      ],
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
      },
      transformIgnorePatterns: [
        '/node_modules/(?!next-auth|@auth/core|@panva/hkdf|jose|msw|until-async)',
      ],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
      },
    },
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/app/api/**/*.test.ts',
        '<rootDir>/src/proxy.test.ts',
      ],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
      moduleNameMapper: {
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
      },
    },
  ],
};
/**
 * Component tests.
 *
 * `npm run test:domain` covers the pure layer, and covers it well — but it is
 * structurally incapable of catching the bugs this project has actually shipped:
 * a status with a badge that nothing could produce, a card affordance that could
 * never appear, a target that would not bundle. Every one of those was a
 * rendering fact, invisible to a function that returns a value.
 *
 * These tests render. They are deliberately few and deliberately about state
 * rather than markup: which of a component's branches is on screen, given data.
 * Asserting on layout or copy would make them break every time a word changes,
 * which is how a suite becomes something people delete.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.tsx', '<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: ['src/components/**/*.tsx', 'src/features/**/*.ts'],
};

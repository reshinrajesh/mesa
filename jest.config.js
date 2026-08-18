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
  /**
   * Comfortably above the 5s the screen harness allows a `findBy*` to wait.
   *
   * These two numbers have to be set together and were not: raising the async
   * timeout alone means a query may wait the full five seconds inside a test
   * that is only allowed to run for five, so the slowest test in each file —
   * the first, which pays for the module graph — fails on the clock rather than
   * on its assertion.
   */
  testTimeout: 20_000,
  collectCoverageFrom: ['src/components/**/*.tsx', 'src/features/**/*.ts'],
};

import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  testMatch: ["**/src/tests/**/*.tests.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};

export default config;

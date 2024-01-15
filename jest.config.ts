import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  collectCoverage: false,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  slowTestThreshold: 10,
  roots: ["<rootDir>"],
  testMatch: ["**/__tests__/*.test.ts"],
  globalTeardown: "<rootDir>/CI/cleanup/Zombies.ts",
};

export default config;

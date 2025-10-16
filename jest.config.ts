import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",

  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }],
  },
  extensionsToTreatAsEsm: [".ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup-globals.ts"],

  moduleNameMapper: {
    "^@prisma/client$": "<rootDir>/tests/mocks/prisma.ts",
    "^@clerk/express$": "<rootDir>/tests/mocks/clerk.ts",
    "^@clerk/express/webhooks$": "<rootDir>/tests/mocks/clerk-webhooks.ts",
  },

  collectCoverageFrom: ["src/**/*.{js,jsx,ts,tsx}", "!src/**/*.d.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/mocks/", "/dist/"],
};

export default config;

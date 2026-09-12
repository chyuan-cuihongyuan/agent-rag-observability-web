/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}", "<rootDir>/src/**/__tests__/**/*.{ts,tsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // AUTOLOOP al-19 / 工单 1019：next/jest 经典分辨器不读 package exports，
    // msw/node 子路径映射绝对路径（msw 2.6 传递依赖为经典分辨可解）
    "^msw/node$": "<rootDir>/node_modules/msw/lib/node/index.js",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(@base-ui|lucide-react|next)/)"],
};

module.exports = createJestConfig(config);

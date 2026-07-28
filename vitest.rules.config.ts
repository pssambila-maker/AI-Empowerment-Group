import { defineConfig } from "vitest/config";

// Separate config for firestore.rules.test.ts, which requires the Firestore
// emulator to be running (see TESTING.md). Kept apart from vitest.config.ts
// so `npm test` (pure unit tests) never depends on Java/the emulator.
export default defineConfig({
  test: {
    include: ["firestore.rules.test.ts"],
    environment: "node",
    testTimeout: 15000,
  },
});

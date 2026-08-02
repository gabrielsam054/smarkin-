import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Real, committed test configuration — addresses the Production Readiness
 * Audit's single largest finding: zero test files existed in the actual
 * repository, and every "tests pass" claim made during this project's
 * development was a disposable sandbox script, never committed, never run
 * by `npm test`. This file plus everything under /tests is meant to close
 * that gap for real.
 *
 * tsconfigPaths() resolves the same "@/*" aliases the real app uses
 * (src/lib/..., src/components/...) so test imports match production
 * imports exactly — no separate, parallel path convention for tests.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    // Anything under src/lib/**/repository/supabase* or
    // src/lib/supabase/** touches a live database connection this test
    // suite cannot and should not provide — those files are exercised via
    // their interfaces (in-memory implementations) instead, not imported
    // directly in any test here.
  },
});

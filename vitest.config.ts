import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the app's pure helpers and repository contract.
 *
 * `environment: 'node'` because nothing under test renders: the helpers
 * (`formatCurrency`, `formatDate`), the storage-path builders
 * (`sanitizeSegment`, `getPath`, `getProductImagePath`) and the `RepoResult`
 * helpers are plain TypeScript. Repository tests mock the Supabase client, so
 * the suite stays hermetic — no env vars, no network, no DOM.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

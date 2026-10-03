import { defineConfig } from 'vitest/config'

// Security-rules tests. They talk to the local Firebase emulators, so run them
// through `npm run test:rules` (which wraps them in `firebase emulators:exec`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
})

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    coverage: { reporter: ['text', 'json-summary'] }
  }
});

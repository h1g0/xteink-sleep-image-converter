import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Emit relative paths so the build can be served from a subdirectory (e.g. GitHub Pages) as-is
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

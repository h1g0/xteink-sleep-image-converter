import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages などのサブディレクトリにそのまま置けるよう相対パスで出力する
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

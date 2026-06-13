import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Testujemy wyłącznie czystą logikę domenową (bez natywnych modułów).
    include: ['src/lib/**/*.test.ts'],
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  build: { rollupOptions: { input: {
    pilot: resolve(import.meta.dirname, 'index.html'),
    prototype005: resolve(import.meta.dirname, 'prototype-005.html'),
  } } },
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  build: { rollupOptions: { input: {
    v8: resolve(import.meta.dirname, 'index.html'),
    pilot006: resolve(import.meta.dirname, 'pilot-006.html'),
    prototype005: resolve(import.meta.dirname, 'prototype-005.html'),
  } } },
});

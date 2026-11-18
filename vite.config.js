import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  build: { rollupOptions: { input: {
    garage: resolve(import.meta.dirname, 'index.html'),
    v8: resolve(import.meta.dirname, 'stage-007.html'),
    pilot006: resolve(import.meta.dirname, 'pilot-006.html'),
    prototype005: resolve(import.meta.dirname, 'prototype-005.html'),
  } } },
});

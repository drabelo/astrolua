import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works at https://<user>.github.io/astrolua/
  base: './',
  build: {
    rollupOptions: {
      input: {
        us: resolve(__dirname, 'index.html'),
        dailton: resolve(__dirname, 'dailton/index.html'),
        felipe: resolve(__dirname, 'felipe/index.html'),
      },
    },
  },
});

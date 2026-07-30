import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// 四个角色站点由同一个 Vite SPA 提供，通过 /customer、/operator、/verifier、/admin 区分。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@coupon/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' }
  },
  preview: { host: true, port: 4173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true, maxWorkers: 1, minWorkers: 1, fileParallelism: false }
});

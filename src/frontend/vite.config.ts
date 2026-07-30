import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { sharedResolve } from './vite.site';

// 仅用于 vitest 与编辑器工具链；四个站点的 dev/build 使用 vite.<site>.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: sharedResolve,
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', css: true, maxWorkers: 1, minWorkers: 1, fileParallelism: false }
});

import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';

/** 四个角色站点各自独立构建、独立端口、独立产物目录 */
export type SiteId = 'customer' | 'operator' | 'verifier' | 'admin';

/** customer 是主站，占用默认端口 5173 */
export const sitePorts: Record<SiteId, number> = { customer: 5173, operator: 5174, verifier: 5175, admin: 5176 };

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export const sharedResolve = {
  alias: {
    '@': resolvePath('./src'),
    '@coupon/shared': resolvePath('../shared/src/index.ts')
  }
};

export function createSiteConfig(site: SiteId): UserConfig {
  return {
    root: resolvePath(`./sites/${site}`),
    // .env 统一放在 src/frontend 下，四个站点共享 VITE_* 变量
    envDir: resolvePath('.'),
    // 每站独立的依赖预构建缓存：四个 dev server 并行时不会互相覆盖 .vite/deps
    cacheDir: resolvePath(`./node_modules/.vite/${site}`),
    plugins: [react()],
    resolve: sharedResolve,
    server: { host: true, port: sitePorts[site], strictPort: true, proxy: { '/api': 'http://localhost:3000' } },
    preview: { host: true, port: sitePorts[site] + 100, strictPort: true },
    build: { outDir: resolvePath(`./dist/${site}`), emptyOutDir: true }
  };
}

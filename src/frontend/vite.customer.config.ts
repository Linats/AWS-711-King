import { defineConfig } from 'vite';
import { createSiteConfig } from './vite.site';

// 主站：普通用户站点，开发端口 5173
export default defineConfig(createSiteConfig('customer'));

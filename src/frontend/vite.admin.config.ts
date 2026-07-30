import { defineConfig } from 'vite';
import { createSiteConfig } from './vite.site';

// 数据与审计中心，开发端口 5176
export default defineConfig(createSiteConfig('admin'));

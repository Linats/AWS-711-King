import { defineConfig } from 'vite';
import { createSiteConfig } from './vite.site';

// 运营控制台，开发端口 5174
export default defineConfig(createSiteConfig('operator'));

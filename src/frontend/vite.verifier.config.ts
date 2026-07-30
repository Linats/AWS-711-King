import { defineConfig } from 'vite';
import { createSiteConfig } from './vite.site';

// 核销终端，开发端口 5175
export default defineConfig(createSiteConfig('verifier'));

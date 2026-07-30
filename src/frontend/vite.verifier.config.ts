import { defineConfig } from 'vite';
import { createSiteConfig } from './vite.site';

// 核销终端兼容配置；与其他角色共用 5173，正式入口使用 vite.config.ts
export default defineConfig(createSiteConfig('verifier'));

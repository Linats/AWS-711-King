import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_FILE: z.string().default('./data/local-db.json'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development-only-jwt-secret-change-me'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // 四个角色站点共用一个 origin，通过 URL path 区分
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_NAME: z.string().default('coupon_refresh'),
  // 可选：设置后 operator/verifier 自助注册必须提供该注册码，customer 注册不受影响。
  // 空字符串按“未配置”处理，避免 .env 里留空键导致启动失败。
  REGISTRATION_STAFF_CODE: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(6).optional()
  ),
  AWS_REGION: z.string().default('us-east-1'),
  BEDROCK_AUTH_MODE: z.enum(['sdk', 'api_key']).default('sdk'),
  BEDROCK_MODEL_ID: z.string().default('amazon.nova-lite-v1:0'),
  BEDROCK_API_KEY: z.string().optional(),
  BEDROCK_BUSINESS_TIMEOUT_MS: z.coerce.number().int().positive().max(60000).default(4000),
  LOG_LEVEL: z.string().default('info')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}
if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_ACCESS_SECRET.startsWith('development-only')) {
  throw new Error('JWT_ACCESS_SECRET must be set in production');
}
if (parsed.data.BEDROCK_AUTH_MODE === 'api_key' && !parsed.data.BEDROCK_API_KEY && parsed.data.NODE_ENV === 'production') {
  throw new Error('BEDROCK_API_KEY is required for api_key mode in production');
}

export const config = parsed.data;

/** 允许的前端 origin 列表；四个角色站点在同一 origin 下按 path 区分。 */
export const corsOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

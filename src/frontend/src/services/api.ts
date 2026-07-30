import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorBody, ApiSuccess, UserSummary } from '@coupon/shared';

interface RetriableConfig extends AxiosRequestConfig { _retry?: boolean; skipAuthRefresh?: boolean; }
let memoryAccessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;
let sessionExpiredHandler: (() => void) | undefined;
let tokenChangedHandler: ((token: string | null) => void) | undefined;

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
export const publicClient = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
export const apiClient = axios.create({ baseURL, withCredentials: true, timeout: 15000 });

export function setMemoryAccessToken(token: string | null) { memoryAccessToken = token; tokenChangedHandler?.(token); }
export function getMemoryAccessToken() { return memoryAccessToken; }
export function configureSessionHandlers(handlers: { onExpired: () => void; onTokenChanged: (token: string | null) => void }) {
  sessionExpiredHandler = handlers.onExpired;
  tokenChangedHandler = handlers.onTokenChanged;
}

apiClient.interceptors.request.use((config) => {
  if (memoryAccessToken) config.headers.Authorization = `Bearer ${memoryAccessToken}`;
  return config;
});

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = publicClient.post<ApiSuccess<{ accessToken: string }>>('/auth/refresh')
      .then(({ data }) => { setMemoryAccessToken(data.data.accessToken); return data.data.accessToken; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use((response) => response, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  if (error.response?.status !== 401 || !config || config._retry || config.skipAuthRefresh) return Promise.reject(error);
  config._retry = true;
  try {
    const token = await refreshAccessToken();
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    return apiClient.request(config);
  } catch {
    setMemoryAccessToken(null);
    sessionExpiredHandler?.();
    return Promise.reject(error);
  }
});

export function dataOf<T>(response: { data: ApiSuccess<T> }): T { return response.data.data; }

const friendlyMessages: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: '用户名或密码错误', AUTH_TOKEN_EXPIRED: '登录已过期，请重新登录', AUTH_REFRESH_INVALID: '会话已失效，请重新登录',
  AUTH_INSUFFICIENT_PERMISSIONS: '无权执行此操作', VALIDATION_ERROR: '提交内容不符合要求', CAMPAIGN_INACTIVE: '活动当前不可领取',
  COUPON_OUT_OF_STOCK: '优惠券已抢光', COUPON_ALREADY_CLAIMED: '你已经领取过该优惠券', COUPON_EXCEED_LIMIT: '已达到领取上限',
  COUPON_NOT_FOUND: '券码不存在', COUPON_EXPIRED: '优惠券已过期', COUPON_ALREADY_VERIFIED: '优惠券已核销', RISK_BLOCKED: '操作过于频繁，已被风控拦截',
  RISK_ALREADY_REVIEWED: '该记录已审核', SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试'
};
export function getApiError(error: unknown): { code: string; message: string; requestId?: string } {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data?.error;
    if (body) return { code: body.code, message: friendlyMessages[body.code] ?? body.message, requestId: body.requestId };
    if (error.code === 'ECONNABORTED') return { code: 'TIMEOUT', message: '请求超时，请重试' };
    if (!error.response) return { code: 'NETWORK_ERROR', message: '无法连接服务，请检查网络或后端是否启动' };
  }
  return { code: 'UNKNOWN', message: error instanceof Error ? error.message : '发生未知错误' };
}

export async function fetchCurrentUser(): Promise<UserSummary> { return dataOf(await apiClient.get<ApiSuccess<UserSummary>>('/auth/me')); }

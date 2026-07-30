import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type {
  ApiErrorBody, ApiSuccess, AuthSession, CampaignDto, CouponDto, PaginatedResponse,
  RegisterInput, UserSummary, VerificationDto
} from '@coupon/shared';

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
  AUTH_USERNAME_TAKEN: '该账号已被注册，请更换账号名', AUTH_ROLE_NOT_REGISTRABLE: '管理员账号不支持自助注册', AUTH_STAFF_CODE_INVALID: '员工注册码不正确',
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

/** 登录真实后端并将 access token 注入后续业务请求。 */
export async function loginAccount(username: string, password: string): Promise<AuthSession> {
  const session = dataOf(await publicClient.post<ApiSuccess<AuthSession>>('/auth/login', { username, password }, { skipAuthRefresh: true } as never));
  setMemoryAccessToken(session.accessToken);
  return session;
}

/** 自助注册：角色由站点决定，服务端只接受 customer/operator/verifier。注册成功即建立会话。 */
export async function registerAccount(input: RegisterInput): Promise<AuthSession> {
  const session = dataOf(await publicClient.post<ApiSuccess<AuthSession>>('/auth/register', input, { skipAuthRefresh: true } as never));
  setMemoryAccessToken(session.accessToken);
  return session;
}

export async function logoutAccount(): Promise<void> {
  try { await publicClient.post('/auth/logout'); } finally { setMemoryAccessToken(null); }
}

export async function fetchCampaigns(): Promise<CampaignDto[]> {
  return dataOf(await apiClient.get<PaginatedResponse<CampaignDto>>('/campaigns', { params: { pageSize: 100 } }));
}

export async function fetchMyCoupons(): Promise<CouponDto[]> {
  return dataOf(await apiClient.get<PaginatedResponse<CouponDto>>('/my-coupons', { params: { pageSize: 100, status: 'all' } }));
}

export interface ClaimResponse {
  couponId: string;
  couponCode: string;
  campaignId: string;
  campaignName: string;
  value: number;
  expiresAt: string;
}

export async function claimCampaign(campaignId: string): Promise<ClaimResponse> {
  return dataOf(await apiClient.post<ApiSuccess<ClaimResponse>>(`/campaigns/${campaignId}/claim`));
}

export async function verifyCoupon(couponCode: string, bizOrderNo: string): Promise<VerificationDto> {
  return dataOf(await apiClient.post<ApiSuccess<VerificationDto>>('/verify', { couponCode, bizOrderNo }));
}

export interface VerificationHistoryItem {
  id: string;
  couponCode: string;
  campaignId?: string;
  campaignName?: string;
  username?: string;
  verifierName?: string;
  bizOrderNo: string;
  result: string;
  createdAt: string;
}

export async function fetchVerifications(): Promise<VerificationHistoryItem[]> {
  return dataOf(await apiClient.get<PaginatedResponse<VerificationHistoryItem>>('/verifications', { params: { pageSize: 100 } }));
}

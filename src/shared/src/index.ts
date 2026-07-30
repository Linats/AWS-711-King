export const roles = ['admin', 'operator', 'customer', 'verifier'] as const;
export type Role = (typeof roles)[number];

/** 允许自助注册的角色；admin 只能由系统预置，不对外开放注册。 */
export const selfServiceRoles = ['customer', 'operator', 'verifier'] as const;
export type SelfServiceRole = (typeof selfServiceRoles)[number];
export function isSelfServiceRole(value: string): value is SelfServiceRole {
  return (selfServiceRoles as readonly string[]).includes(value);
}

/** 账号与密码规则，前后端共用同一套口径。 */
export const usernamePattern = /^[a-zA-Z0-9_]{3,32}$/;
export const passwordRules = { minLength: 8, maxLength: 72 } as const;
export function checkPassword(password: string): { ok: boolean; message?: string } {
  if (password.length < passwordRules.minLength) return { ok: false, message: `密码至少 ${passwordRules.minLength} 位` };
  if (password.length > passwordRules.maxLength) return { ok: false, message: `密码最多 ${passwordRules.maxLength} 位` };
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return { ok: false, message: '密码需同时包含字母和数字' };
  return { ok: true };
}

export interface RegisterInput {
  username: string;
  password: string;
  displayName?: string;
  role: SelfServiceRole;
  /** 可选员工注册码：后端配置了 REGISTRATION_STAFF_CODE 时，operator/verifier 注册必填 */
  staffCode?: string;
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  user: UserSummary;
}

export const campaignStatuses = ['draft', 'active', 'paused', 'sold_out', 'expired', 'deleted'] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];
export const couponStatuses = ['claimed', 'verified', 'expired', 'revoked'] as const;
export type CouponStatus = (typeof couponStatuses)[number];
export type RiskDecision = 'pass' | 'review' | 'block';
export type ReviewStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface CampaignDto {
  id: string;
  name: string;
  description?: string | null;
  couponType: string;
  value: number;
  totalStock: number;
  remainingStock: number;
  perUserLimit: number;
  startTime: string;
  endTime: string;
  status: CampaignStatus;
  rules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CouponDto {
  id: string;
  campaignId: string;
  code: string;
  status: CouponStatus;
  campaignName: string;
  value: number;
  claimedAt: string;
  expiresAt: string;
  verifiedAt?: string | null;
}

export interface RecommendationDto {
  campaignId: string;
  campaignName: string;
  value: number;
  reason: string;
  source: 'ai' | 'rule';
}

export interface VerificationDto {
  verificationId: string;
  couponId: string;
  couponCode: string;
  bizOrderNo: string;
  result: string;
  verifiedAt: string;
  idempotentReplay: boolean;
}

export interface RiskRecordDto {
  id: string;
  userId: string;
  campaignId: string;
  source: 'ai' | 'rule';
  riskScore: number;
  decision: RiskDecision;
  reasons: string[];
  reviewStatus: ReviewStatus;
  createdAt: string;
}

export interface ApiSuccess<T> {
  code: 0;
  message?: string;
  data: T;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiSuccess<T[]> {
  pagination: Pagination;
}

export interface ApiErrorBody {
  error: { code: string; message: string; requestId: string; details?: unknown };
}

export const errorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USERNAME_TAKEN: 'AUTH_USERNAME_TAKEN',
  AUTH_ROLE_NOT_REGISTRABLE: 'AUTH_ROLE_NOT_REGISTRABLE',
  AUTH_STAFF_CODE_INVALID: 'AUTH_STAFF_CODE_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_REFRESH_INVALID: 'AUTH_REFRESH_INVALID',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  CAMPAIGN_INACTIVE: 'CAMPAIGN_INACTIVE',
  COUPON_OUT_OF_STOCK: 'COUPON_OUT_OF_STOCK',
  COUPON_ALREADY_CLAIMED: 'COUPON_ALREADY_CLAIMED',
  COUPON_EXCEED_LIMIT: 'COUPON_EXCEED_LIMIT',
  COUPON_NOT_FOUND: 'COUPON_NOT_FOUND',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  COUPON_ALREADY_VERIFIED: 'COUPON_ALREADY_VERIFIED',
  RISK_BLOCKED: 'RISK_BLOCKED',
  RISK_ALREADY_REVIEWED: 'RISK_ALREADY_REVIEWED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

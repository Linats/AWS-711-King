import { createContext, useContext } from 'react';
import type { CampaignDto, CouponDto, Role, UserSummary } from '@coupon/shared';
import type { DemoRisk } from '@/demo';
import type { VerificationHistoryItem } from '@/services/api';

export interface VerifyOutcome { ok: boolean; replay?: boolean; message: string; }
export interface RegisterOutcome { ok: boolean; message: string; user?: UserSummary; }
export interface RegisterPayload { username: string; password: string; displayName?: string; role: Role; staffCode?: string; }

/** 四个角色页面共享同一后端 API；优惠券与核销数据持久化到服务端数据库。 */
export interface DemoState {
  user: UserSummary | null;
  campaigns: CampaignDto[];
  coupons: CouponDto[];
  risks: DemoRisk[];
  verifications: VerificationHistoryItem[];
  login: (username: string, password: string) => Promise<UserSummary>;
  /** 自助注册：与后端 /auth/register 同一套校验口径，admin 一律拒绝 */
  register: (input: RegisterPayload) => Promise<RegisterOutcome>;
  logout: () => Promise<void>;
  claim: (campaign: CampaignDto) => Promise<CouponDto>;
  addCampaign: (values: Record<string, unknown>) => void;
  updateCampaignStatus: (id: string, status: CampaignDto['status']) => void;
  reviewRisk: (id: string, approved: boolean) => void;
  verify: (code: string, order: string) => Promise<VerifyOutcome>;
}

export const DemoContext = createContext<DemoState | null>(null);

export function useDemo(): DemoState {
  const value = useContext(DemoContext);
  if (!value) throw new Error('Demo context missing');
  return value;
}

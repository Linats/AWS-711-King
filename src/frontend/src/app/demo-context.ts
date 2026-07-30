import { createContext, useContext } from 'react';
import type { CampaignDto, CouponDto, UserSummary } from '@coupon/shared';
import type { DemoRisk, DemoVerification } from '@/demo';

export interface VerifyOutcome { ok: boolean; replay?: boolean; message: string; }

/** 四个站点共用同一套演示数据行为；每个站点在自己的浏览器上下文中独立持有状态。 */
export interface DemoState {
  user: UserSummary | null;
  campaigns: CampaignDto[];
  coupons: CouponDto[];
  risks: DemoRisk[];
  verifications: DemoVerification[];
  login: (username: string, password: string) => UserSummary | null;
  logout: () => void;
  claim: (campaign: CampaignDto) => CouponDto | null;
  addCampaign: (values: Record<string, unknown>) => void;
  updateCampaignStatus: (id: string, status: CampaignDto['status']) => void;
  reviewRisk: (id: string, approved: boolean) => void;
  verify: (code: string, order: string) => VerifyOutcome;
}

export const DemoContext = createContext<DemoState | null>(null);

export function useDemo(): DemoState {
  const value = useContext(DemoContext);
  if (!value) throw new Error('Demo context missing');
  return value;
}

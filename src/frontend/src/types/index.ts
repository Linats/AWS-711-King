import type { CampaignDto, RiskRecordDto } from '@coupon/shared';

export interface CampaignInput {
  name: string;
  description?: string;
  couponType: string;
  value: number;
  totalStock: number;
  perUserLimit: number;
  startTime: string;
  endTime: string;
  rules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RiskRecordView extends RiskRecordDto { username?: string; campaignName?: string; reviewedAt?: string; reviewComment?: string; }
export interface VerificationRecord { id: string; couponCode: string; campaignId?: string; campaignName: string; username: string; verifierName: string; bizOrderNo: string; result: string; createdAt: string; }
export interface StatsOverview {
  totalCampaigns: number;
  totalClaims: number;
  totalVerifications: number;
  claimRate: number;
  verificationRate: number;
  remainingStock: number;
  trends: Array<{ date: string; claims: number; verifications: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  recentRisks: RiskRecordView[];
}
export interface AuditLog { id: string; requestId: string; actorId?: string; actorName?: string; action: string; resourceType?: string; resourceId?: string; outcome: 'success' | 'failure' | 'denied'; detail?: Record<string, unknown>; createdAt: string; }
export interface ClaimResult { couponId?: string; couponCode?: string; campaignId?: string; campaignName?: string; value?: number; expiresAt?: string; riskRecordId?: string; decision?: 'pass' | 'review' | 'block'; reviewStatus?: string; }
export type CampaignWithStats = CampaignDto & { claimedCount?: number };

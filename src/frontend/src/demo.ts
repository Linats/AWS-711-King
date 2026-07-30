import type { CampaignDto, CouponDto, RiskRecordDto, Role, UserSummary } from '@coupon/shared';

export const demoUsers: Record<string, UserSummary> = {
  admin: { id: 'u-admin', username: 'admin', displayName: '系统管理员', role: 'admin' },
  operator: { id: 'u-operator', username: 'operator', displayName: '运营人员', role: 'operator' },
  verifier: { id: 'u-verifier', username: 'verifier', displayName: '核销人员', role: 'verifier' },
  customer_a: { id: 'u-a', username: 'customer_a', displayName: '用户 A', role: 'customer' },
  customer_b: { id: 'u-b', username: 'customer_b', displayName: '用户 B', role: 'customer' },
  customer_c: { id: 'u-c', username: 'customer_c', displayName: '用户 C', role: 'customer' }
};

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const past = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const initialCampaigns: CampaignDto[] = [
  { id: 'c1', name: '夏日清凉满减券', description: '满 50 元可用，适用于全场商品', couponType: 'fixed', value: 10, totalStock: 1000, remainingStock: 638, perUserLimit: 1, startTime: past(2), endTime: future(20), status: 'active', rules: { minimumSpend: 50 } },
  { id: 'c2', name: '新用户专享礼券', description: '新用户首单无门槛使用', couponType: 'fixed', value: 20, totalStock: 500, remainingStock: 126, perUserLimit: 1, startTime: past(5), endTime: future(10), status: 'active' },
  { id: 'c3', name: '周末咖啡折扣券', description: '周末指定咖啡品类 8 折', couponType: 'discount', value: 8, totalStock: 800, remainingStock: 417, perUserLimit: 2, startTime: past(1), endTime: future(35), status: 'active' },
  { id: 'c4', name: '国庆预热活动', description: '运营活动草稿，尚未发布', couponType: 'fixed', value: 30, totalStock: 2000, remainingStock: 2000, perUserLimit: 1, startTime: future(30), endTime: future(40), status: 'draft' },
  { id: 'c5', name: '春季焕新券', description: '历史活动，当前已暂停', couponType: 'fixed', value: 15, totalStock: 600, remainingStock: 82, perUserLimit: 1, startTime: past(60), endTime: future(3), status: 'paused' }
];

export const initialCoupons: CouponDto[] = [
  { id: 'cp1', campaignId: 'c2', code: 'CP-DEMO-2026-001', status: 'claimed', campaignName: '新用户专享礼券', value: 20, claimedAt: past(1), expiresAt: future(10) },
  { id: 'cp2', campaignId: 'c3', code: 'CP-DEMO-2026-002', status: 'verified', campaignName: '周末咖啡折扣券', value: 8, claimedAt: past(8), expiresAt: future(20), verifiedAt: past(2) },
  { id: 'cp3', campaignId: 'c1', code: 'CP-DEMO-2026-003', status: 'expired', campaignName: '夏日清凉满减券', value: 10, claimedAt: past(40), expiresAt: past(10) }
];

export const initialRisks: Array<RiskRecordDto & { username: string; campaignName: string }> = [
  { id: 'r1', userId: 'u-b', campaignId: 'c1', source: 'ai', riskScore: 65, decision: 'review', reasons: ['短时间内请求频率异常', '设备环境发生变化'], reviewStatus: 'pending', createdAt: new Date(Date.now() - 25 * 60_000).toISOString(), username: 'customer_b', campaignName: '夏日清凉满减券' },
  { id: 'r2', userId: 'u-c', campaignId: 'c2', source: 'rule', riskScore: 100, decision: 'block', reasons: ['10 秒内请求达到 50 次'], reviewStatus: 'pending', createdAt: new Date(Date.now() - 70 * 60_000).toISOString(), username: 'customer_c', campaignName: '新用户专享礼券' }
];

export interface DemoVerification { id: string; couponCode: string; campaignName: string; username: string; bizOrderNo: string; result: string; createdAt: string; }
export const initialVerifications: DemoVerification[] = [
  { id: 'v1', couponCode: 'CP-DEMO-2026-002', campaignName: '周末咖啡折扣券', username: 'customer_a', bizOrderNo: 'ORDER-20260730-001', result: 'success', createdAt: past(2) }
];

export const roleLabel: Record<Role, string> = { admin: '管理员', operator: '运营人员', verifier: '核销人员', customer: '普通用户' };
export const statusLabel: Record<string, string> = { active: '进行中', draft: '草稿', paused: '已暂停', sold_out: '已售罄', expired: '已过期', deleted: '已删除', claimed: '可使用', verified: '已使用' };

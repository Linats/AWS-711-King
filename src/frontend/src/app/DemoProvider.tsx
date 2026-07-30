import { useState, type ReactNode } from 'react';
import type { CouponDto } from '@coupon/shared';
import { demoUsers, initialCampaigns, initialCoupons, initialRisks, initialVerifications, type DemoRisk, type DemoVerification } from '@/demo';
import { DemoContext, type DemoState } from './demo-context';

export const DEMO_PASSWORD = 'Coupon123!';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoState['user']>(null);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [risks, setRisks] = useState<DemoRisk[]>(initialRisks);
  const [verifications, setVerifications] = useState(initialVerifications);

  const login: DemoState['login'] = (username, password) => {
    const account = demoUsers[username];
    if (!account || password !== DEMO_PASSWORD) return null;
    setUser(account);
    return account;
  };

  const claim: DemoState['claim'] = (campaign) => {
    if (coupons.some((coupon) => coupon.campaignId === campaign.id && coupon.status === 'claimed')) return null;
    const coupon: CouponDto = {
      id: crypto.randomUUID(), campaignId: campaign.id, code: `CP-${Date.now().toString().slice(-10)}`, status: 'claimed',
      campaignName: campaign.name, value: campaign.value, claimedAt: new Date().toISOString(), expiresAt: campaign.endTime
    };
    setCoupons((items) => [coupon, ...items]);
    setCampaigns((items) => items.map((item) => item.id === campaign.id ? { ...item, remainingStock: Math.max(0, item.remainingStock - 1) } : item));
    return coupon;
  };

  const addCampaign: DemoState['addCampaign'] = (values) => setCampaigns((items) => [{
    id: crypto.randomUUID(), name: String(values.name), description: String(values.description ?? ''), couponType: String(values.couponType ?? 'fixed'),
    value: Number(values.value), totalStock: Number(values.totalStock), remainingStock: Number(values.totalStock), perUserLimit: Number(values.perUserLimit),
    startTime: new Date(String(values.startTime)).toISOString(), endTime: new Date(String(values.endTime)).toISOString(), status: 'draft'
  }, ...items]);

  const updateCampaignStatus: DemoState['updateCampaignStatus'] = (id, status) =>
    setCampaigns((items) => items.map((item) => item.id === id ? { ...item, status } : item));

  const reviewRisk: DemoState['reviewRisk'] = (id, approved) =>
    setRisks((items) => items.map((item) => item.id === id ? { ...item, reviewStatus: approved ? 'approved' : 'rejected' } : item));

  const verify: DemoState['verify'] = (code, order) => {
    const replay = verifications.find((item) => item.couponCode === code && item.bizOrderNo === order);
    if (replay) return { ok: true, replay: true, message: '该请求已处理，已返回首次核销结果' };
    const coupon = coupons.find((item) => item.code === code);
    if (!coupon) return { ok: false, message: '券码不存在，请检查后重试' };
    if (coupon.status === 'expired') return { ok: false, message: '优惠券已过期，无法核销' };
    if (coupon.status === 'verified') return { ok: false, message: '优惠券已经核销' };
    const record: DemoVerification = {
      id: crypto.randomUUID(), couponCode: code, campaignName: coupon.campaignName, username: 'customer_a',
      bizOrderNo: order, result: 'success', createdAt: new Date().toISOString()
    };
    setVerifications((items) => [record, ...items]);
    setCoupons((items) => items.map((item) => item.code === code ? { ...item, status: 'verified', verifiedAt: record.createdAt } : item));
    return { ok: true, message: '核销成功' };
  };

  return <DemoContext.Provider value={{
    user, campaigns, coupons, risks, verifications,
    login, logout: () => setUser(null), claim, addCampaign, updateCampaignStatus, reviewRisk, verify
  }}>{children}</DemoContext.Provider>;
}

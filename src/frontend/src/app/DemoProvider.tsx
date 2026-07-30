import { useEffect, useState, type ReactNode } from 'react';
import { isSelfServiceRole, type CampaignDto, type CouponDto, type Role } from '@coupon/shared';
import { initialRisks, type DemoRisk } from '@/demo';
import {
  claimCampaign, fetchCampaigns, fetchCurrentUser, fetchMyCoupons, fetchVerifications,
  getApiError, loginAccount, logoutAccount, registerAccount, verifyCoupon
} from '@/services/api';
import { DemoContext, type DemoState } from './demo-context';

export const DEMO_PASSWORD = 'Coupon123!';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoState['user']>(null);
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [coupons, setCoupons] = useState<CouponDto[]>([]);
  const [risks, setRisks] = useState<DemoRisk[]>(initialRisks);
  const [verifications, setVerifications] = useState<DemoState['verifications']>([]);

  const loadRoleData = async (role: Role) => {
    const nextCampaigns = await fetchCampaigns();
    setCampaigns(nextCampaigns);
    if (role === 'customer') setCoupons(await fetchMyCoupons());
    else setCoupons([]);
    if (role === 'verifier' || role === 'admin') setVerifications(await fetchVerifications());
    else setVerifications([]);
  };

  useEffect(() => {
    let active = true;
    void fetchCurrentUser()
      .then(async (current) => {
        if (!active) return;
        setUser(current);
        await loadRoleData(current.role);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const login: DemoState['login'] = async (username, password) => {
    const session = await loginAccount(username.trim(), password);
    setUser(session.user);
    await loadRoleData(session.user.role);
    return session.user;
  };

  const register: DemoState['register'] = async ({ username, password, displayName, role, staffCode }) => {
    if (!isSelfServiceRole(role)) return { ok: false, message: '管理员账号不支持自助注册，请联系系统管理员开通' };
    try {
      const session = await registerAccount({ username, password, displayName, role, staffCode });
      setUser(session.user);
      await loadRoleData(session.user.role);
      return { ok: true, message: '注册成功', user: session.user };
    } catch (error) {
      return { ok: false, message: getApiError(error).message };
    }
  };

  const claim: DemoState['claim'] = async (campaign) => {
    const issued = await claimCampaign(campaign.id);
    const [nextCoupons, nextCampaigns] = await Promise.all([fetchMyCoupons(), fetchCampaigns()]);
    setCoupons(nextCoupons);
    setCampaigns(nextCampaigns);
    return nextCoupons.find((coupon) => coupon.id === issued.couponId || coupon.code === issued.couponCode) ?? {
      id: issued.couponId,
      campaignId: issued.campaignId,
      code: issued.couponCode,
      status: 'claimed',
      campaignName: issued.campaignName,
      value: issued.value,
      claimedAt: new Date().toISOString(),
      expiresAt: issued.expiresAt
    };
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

  const verify: DemoState['verify'] = async (code, order) => {
    try {
      const result = await verifyCoupon(code, order);
      setVerifications(await fetchVerifications());
      return { ok: true, replay: result.idempotentReplay, message: result.idempotentReplay ? '该请求已处理，已返回首次核销结果' : '核销成功' };
    } catch (error) {
      return { ok: false, message: getApiError(error).message };
    }
  };

  const logout = async () => {
    try { await logoutAccount(); } finally {
      setUser(null);
      setCampaigns([]);
      setCoupons([]);
      setVerifications([]);
    }
  };

  return <DemoContext.Provider value={{
    user, campaigns, coupons, risks, verifications,
    login, register, logout, claim, addCampaign, updateCampaignStatus, reviewRisk, verify
  }}>{children}</DemoContext.Provider>;
}

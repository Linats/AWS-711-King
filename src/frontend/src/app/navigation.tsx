import { AppstoreOutlined, AuditOutlined, BarChartOutlined, GiftOutlined, HomeOutlined, SafetyCertificateOutlined, ScanOutlined, UnorderedListOutlined } from '@ant-design/icons';
import type { Role } from '@coupon/shared';

export interface NavItem { key: string; label: string; icon: React.ReactNode; }
export const homeByRole: Record<Role, string> = { customer: '/customer', operator: '/operator', verifier: '/verifier', admin: '/admin' };
export const navigationByRole: Record<Role, NavItem[]> = {
  customer: [{ key: '/customer', label: '首页', icon: <HomeOutlined /> }, { key: '/customer/my-coupons', label: '我的券包', icon: <GiftOutlined /> }],
  operator: [{ key: '/operator', label: '运营首页', icon: <HomeOutlined /> }, { key: '/operator/campaigns', label: '活动管理', icon: <AppstoreOutlined /> }, { key: '/operator/risk-review', label: '风控审核', icon: <SafetyCertificateOutlined /> }],
  verifier: [{ key: '/verifier', label: '核销', icon: <ScanOutlined /> }, { key: '/verifier/history', label: '核销记录', icon: <UnorderedListOutlined /> }],
  admin: [{ key: '/admin', label: '统计概览', icon: <HomeOutlined /> }, { key: '/admin/stats', label: '详细统计', icon: <BarChartOutlined /> }, { key: '/admin/audit-logs', label: '审计日志', icon: <AuditOutlined /> }]
};

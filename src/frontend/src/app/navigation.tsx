import type { ReactNode } from 'react';
import { AppstoreOutlined, AuditOutlined, BarChartOutlined, GiftOutlined, HomeOutlined, SafetyCertificateOutlined, ScanOutlined, UnorderedListOutlined } from '@ant-design/icons';
import type { Role } from '@coupon/shared';

export interface NavItem { key: string; label: string; icon: ReactNode; }

/** 每个角色站点的首页路径；站点之间相互独立，路径保留角色前缀以便与设计文档路由表对齐。 */
export const homeByRole: Record<Role, string> = { customer: '/customer', operator: '/operator', verifier: '/verifier', admin: '/admin' };

/** 导航文案按角色的实际工作内容表述，站点只加载自己角色的导航。 */
export const navigationByRole: Record<Role, NavItem[]> = {
  customer: [
    { key: '/customer', label: '发现优惠', icon: <HomeOutlined /> },
    { key: '/customer/my-coupons', label: '我的券包', icon: <GiftOutlined /> }
  ],
  operator: [
    { key: '/operator', label: '运营概览', icon: <HomeOutlined /> },
    { key: '/operator/campaigns', label: '活动管理', icon: <AppstoreOutlined /> },
    { key: '/operator/risk-review', label: '风控审核', icon: <SafetyCertificateOutlined /> }
  ],
  verifier: [
    { key: '/verifier', label: '快速核销', icon: <ScanOutlined /> },
    { key: '/verifier/history', label: '核销记录', icon: <UnorderedListOutlined /> }
  ],
  admin: [
    { key: '/admin', label: '数据总览', icon: <HomeOutlined /> },
    { key: '/admin/stats', label: '数据分析', icon: <BarChartOutlined /> },
    { key: '/admin/audit-logs', label: '审计日志', icon: <AuditOutlined /> }
  ]
};

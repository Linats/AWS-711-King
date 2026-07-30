import type { ReactNode } from 'react';
import { AppstoreOutlined, BarChartOutlined, GiftOutlined, ScanOutlined } from '@ant-design/icons';
import type { Role } from '@coupon/shared';
import { homeByRole, navigationByRole, type NavItem } from './navigation';

/** 四个独立站点，每个站点只服务一个角色。customer 是主站，负责提供其他站点入口。 */
export type SiteId = Role;

export interface SiteTheme {
  primary: string;
  soft: string;
  gradient: string;
  shadow: string;
  heroAccent: string;
  loginBackground: string;
}

export interface SiteDefinition {
  id: SiteId;
  role: Role;
  /** 主站：普通用户站点，聚合其他站点超链 */
  isMain: boolean;
  url: string;
  home: string;
  nav: NavItem[];
  icon: ReactNode;
  /** 浏览器标题与 meta 描述，按角色分别表述 */
  siteTitle: string;
  brandName: string;
  audience: string;
  tagline: string;
  description: string;
  heroBadge: string;
  heroTitleLead: string;
  heroTitleAccent: string;
  heroCopy: string;
  heroMetrics: Array<{ value: string; label: string }>;
  loginTitle: string;
  loginWelcome: string;
  loginHint: string;
  /** 该站点允许登录的演示账号 */
  accountUsernames: string[];
  /** 是否开放自助注册；admin 站点为 false，管理员账号只能由系统预置 */
  allowsSelfRegistration: boolean;
  /** 注册页文案；不开放注册的站点用 registerNotice 说明原因 */
  registerTitle: string;
  registerHint: string;
  registerNotice: string;
  theme: SiteTheme;
}

/** 部署时可用 VITE_SITE_*_URL 覆盖；默认在当前 origin 下使用角色路径。 */
const configuredUrls: Record<SiteId, unknown> = {
  customer: import.meta.env.VITE_SITE_CUSTOMER_URL,
  operator: import.meta.env.VITE_SITE_OPERATOR_URL,
  verifier: import.meta.env.VITE_SITE_VERIFIER_URL,
  admin: import.meta.env.VITE_SITE_ADMIN_URL
};

function resolveUrl(id: SiteId): string {
  const configured = configuredUrls[id];
  if (typeof configured === 'string' && configured.trim()) return configured.trim().replace(/\/+$/, '');
  return `/${id}`;
}

export const siteDefinitions: Record<SiteId, SiteDefinition> = {
  customer: {
    id: 'customer',
    role: 'customer',
    isMain: true,
    url: resolveUrl('customer'),
    home: homeByRole.customer,
    nav: navigationByRole.customer,
    icon: <GiftOutlined />,
    siteTitle: '优惠券中心 · 用户主站',
    brandName: '优惠券中心',
    audience: '普通用户',
    tagline: '领券、看券、用券，一站搞定',
    description: '面向普通用户的优惠券主站：智能推荐可领活动、原子化秒级领取、券包四种状态一目了然。',
    heroBadge: 'AI 智能推荐',
    heroTitleLead: '好券自己找上门，',
    heroTitleAccent: '领了就能用',
    heroCopy: 'AI 结合你的浏览与消费偏好挑选活动，领取即刻入包；可使用、已使用、已过期清楚区分，不再错过有效期。',
    heroMetrics: [
      { value: 'AI 推荐', label: '附带推荐理由' },
      { value: '秒级', label: '领取即时到账' },
      { value: '4 种状态', label: '券包清晰可筛' }
    ],
    loginTitle: '登录优惠券中心',
    loginWelcome: '欢迎回来',
    loginHint: '使用普通用户账号登录，浏览推荐活动并领取优惠券',
    accountUsernames: ['customer_a', 'customer_b', 'customer_c'],
    allowsSelfRegistration: true,
    registerTitle: '注册普通用户',
    registerHint: '注册后即可浏览推荐活动、领取优惠券并管理自己的券包',
    registerNotice: '注册即创建普通用户账号，不包含任何后台管理权限。',
    theme: {
      primary: '#5b6df9',
      soft: '#eef0ff',
      gradient: 'linear-gradient(135deg,#5b6df9,#9168f2)',
      shadow: '#5b6df940',
      heroAccent: '#92a0ff',
      loginBackground: 'radial-gradient(circle at 12% 18%,#3c52a9 0,transparent 35%),radial-gradient(circle at 74% 84%,#4f3388 0,transparent 30%),#10162d'
    }
  },
  operator: {
    id: 'operator',
    role: 'operator',
    isMain: false,
    url: resolveUrl('operator'),
    home: homeByRole.operator,
    nav: navigationByRole.operator,
    icon: <AppstoreOutlined />,
    siteTitle: '运营控制台 · 活动与风控',
    brandName: '运营控制台',
    audience: '运营人员',
    tagline: '活动全生命周期与风险放行',
    description: '面向运营人员的控制台：创建维护优惠券活动、掌握库存与领取率、审核 AI 与规则识别出的异常领券。',
    heroBadge: '活动 & 风控',
    heroTitleLead: '从建券到放行，',
    heroTitleAccent: '运营动作一处闭环',
    heroCopy: '草稿、发布、暂停、软删除全程可追溯；库存与领取率实时可见，风控待办在同一处放行或拒绝并留下理由。',
    heroMetrics: [
      { value: '6 态流转', label: '活动状态受控' },
      { value: '实时库存', label: '领取率同步更新' },
      { value: 'AI + 规则', label: '双重风险信号' }
    ],
    loginTitle: '登录运营控制台',
    loginWelcome: '运营工作台',
    loginHint: '仅运营人员账号可进入，用于活动配置与风控人工审核',
    accountUsernames: ['operator'],
    allowsSelfRegistration: true,
    registerTitle: '注册运营人员',
    registerHint: '注册后可创建与维护活动、变更活动状态并审核风控待办',
    registerNotice: '运营账号可修改线上活动与放行风控请求，请按团队规范申请；后端配置员工注册码后需要填写。',
    theme: {
      primary: '#0d9488',
      soft: '#e4f7f4',
      gradient: 'linear-gradient(135deg,#0d9488,#0ea5e9)',
      shadow: '#0d948840',
      heroAccent: '#6ee7d5',
      loginBackground: 'radial-gradient(circle at 12% 18%,#0f5d5a 0,transparent 35%),radial-gradient(circle at 74% 84%,#155e75 0,transparent 30%),#08201f'
    }
  },
  verifier: {
    id: 'verifier',
    role: 'verifier',
    isMain: false,
    url: resolveUrl('verifier'),
    home: homeByRole.verifier,
    nav: navigationByRole.verifier,
    icon: <ScanOutlined />,
    siteTitle: '核销终端 · 幂等核销',
    brandName: '核销终端',
    audience: '核销人员',
    tagline: '输入券码，安全幂等核销',
    description: '面向门店核销人员的终端：券码加业务单号完成核销，重复提交返回首次结果，核销记录可追溯。',
    heroBadge: '幂等核销',
    heroTitleLead: '同一业务单号重复提交，',
    heroTitleAccent: '也只核销一次',
    heroCopy: '券码与业务单号一起提交，系统以业务单号保证幂等；过期、无效、已核销都会给出明确原因，不产生二次扣减。',
    heroMetrics: [
      { value: '幂等保证', label: '重放返回首次结果' },
      { value: '< 200ms', label: '核销响应目标' },
      { value: '全量留痕', label: '记录可按单查询' }
    ],
    loginTitle: '登录核销终端',
    loginWelcome: '门店核销',
    loginHint: '仅核销人员账号可进入，用于券码核销与核销记录查询',
    accountUsernames: ['verifier'],
    allowsSelfRegistration: true,
    registerTitle: '注册核销人员',
    registerHint: '注册后可在门店核销优惠券并查询核销记录',
    registerNotice: '核销账号可将顾客券码置为已使用，请按门店规范申请；后端配置员工注册码后需要填写。',
    theme: {
      primary: '#16a34a',
      soft: '#e6f8ec',
      gradient: 'linear-gradient(135deg,#16a34a,#65a30d)',
      shadow: '#16a34a40',
      heroAccent: '#86efac',
      loginBackground: 'radial-gradient(circle at 12% 18%,#14532d 0,transparent 35%),radial-gradient(circle at 74% 84%,#166534 0,transparent 30%),#07200f'
    }
  },
  admin: {
    id: 'admin',
    role: 'admin',
    isMain: false,
    url: resolveUrl('admin'),
    home: homeByRole.admin,
    nav: navigationByRole.admin,
    icon: <BarChartOutlined />,
    siteTitle: '数据与审计中心 · 平台监管',
    brandName: '数据与审计中心',
    audience: '系统管理员',
    tagline: '指标、风控告警与审计留痕',
    description: '面向系统管理员的监管站点：核心业务指标与趋势、风控告警只读视图、关键操作审计日志。',
    heroBadge: '指标 & 审计',
    heroTitleLead: '指标与留痕，',
    heroTitleAccent: '一屏掌握平台状态',
    heroCopy: '活动数、发券数、核销数与转化率实时汇总；风控告警只读查看，关键操作全部落审计日志且敏感信息已脱敏。',
    heroMetrics: [
      { value: '6 项指标', label: '核心业务口径' },
      { value: '只读告警', label: '风控信息不可改' },
      { value: '脱敏审计', label: '关键操作可追溯' }
    ],
    loginTitle: '登录数据与审计中心',
    loginWelcome: '平台监管',
    loginHint: '仅管理员账号可进入，用于查看统计数据与审计日志',
    accountUsernames: ['admin'],
    allowsSelfRegistration: false,
    registerTitle: '管理员账号不开放注册',
    registerHint: '管理员拥有全平台数据与审计权限，只能由系统预置或由现有管理员开通',
    registerNotice: '本站点不提供注册入口；如需管理员权限请联系系统管理员。',
    theme: {
      primary: '#7c3aed',
      soft: '#f1ebff',
      gradient: 'linear-gradient(135deg,#7c3aed,#db2777)',
      shadow: '#7c3aed40',
      heroAccent: '#c4b5fd',
      loginBackground: 'radial-gradient(circle at 12% 18%,#3b1d78 0,transparent 35%),radial-gradient(circle at 74% 84%,#701a75 0,transparent 30%),#160b2a'
    }
  }
};

export const siteOrder: SiteId[] = ['customer', 'operator', 'verifier', 'admin'];
export const mainSite = siteDefinitions.customer;

/** 主站与各站点顶栏使用：除自己以外的其他站点，按固定顺序排列。 */
export function otherSites(current: SiteId): SiteDefinition[] {
  return siteOrder.filter((id) => id !== current).map((id) => siteDefinitions[id]);
}

/** 把站点主题写入 CSS 变量，使同一套样式在四个站点呈现各自的主色。 */
export function applySiteTheme(site: SiteDefinition) {
  const style = document.documentElement.style;
  style.setProperty('--site-primary', site.theme.primary);
  style.setProperty('--site-soft', site.theme.soft);
  style.setProperty('--site-gradient', site.theme.gradient);
  style.setProperty('--site-shadow', site.theme.shadow);
  style.setProperty('--site-hero-accent', site.theme.heroAccent);
  style.setProperty('--site-login-bg', site.theme.loginBackground);
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import SiteApp, { type SiteRoute } from '@/app/SiteApp';
import { siteDefinitions, type SiteId } from '@/app/site-config';
import CustomerHome from '@/pages/customer/CustomerHome';
import CouponWallet from '@/pages/customer/CouponWallet';
import OperatorHome from '@/pages/operator/OperatorHome';
import CampaignManagement from '@/pages/operator/CampaignManagement';
import RiskReview from '@/pages/operator/RiskReview';
import VerifyPage from '@/pages/verifier/VerifyPage';
import VerificationHistory from '@/pages/verifier/VerificationHistory';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AuditLogs from '@/pages/admin/AuditLogs';

const siteRoutes: Record<SiteId, SiteRoute[]> = {
  customer: [
    { path: '/customer', element: <CustomerHome /> },
    { path: '/customer/my-coupons', element: <CouponWallet /> }
  ],
  operator: [
    { path: '/operator', element: <OperatorHome /> },
    { path: '/operator/campaigns', element: <CampaignManagement /> },
    { path: '/operator/risk-review', element: <RiskReview /> }
  ],
  verifier: [
    { path: '/verifier', element: <VerifyPage /> },
    { path: '/verifier/history', element: <VerificationHistory /> }
  ],
  admin: [
    { path: '/admin', element: <AdminDashboard /> },
    { path: '/admin/stats', element: <AdminDashboard detailed /> },
    { path: '/admin/audit-logs', element: <AuditLogs /> }
  ]
};

const siteIds: SiteId[] = ['customer', 'operator', 'verifier', 'admin'];
const firstPathSegment = window.location.pathname.split('/').filter(Boolean)[0];
const siteId = siteIds.includes(firstPathSegment as SiteId) ? firstPathSegment as SiteId : 'customer';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SiteApp site={siteDefinitions[siteId]} routes={siteRoutes[siteId]} />
  </React.StrictMode>
);

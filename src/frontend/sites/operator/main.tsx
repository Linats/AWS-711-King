import React from 'react';
import ReactDOM from 'react-dom/client';
import SiteApp, { type SiteRoute } from '@/app/SiteApp';
import { siteDefinitions } from '@/app/site-config';
import OperatorHome from '@/pages/operator/OperatorHome';
import CampaignManagement from '@/pages/operator/CampaignManagement';
import RiskReview from '@/pages/operator/RiskReview';

/** 运营站点：只打包 operator 页面 */
const routes: SiteRoute[] = [
  { path: '/operator', element: <OperatorHome /> },
  { path: '/operator/campaigns', element: <CampaignManagement /> },
  { path: '/operator/risk-review', element: <RiskReview /> }
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><SiteApp site={siteDefinitions.operator} routes={routes} /></React.StrictMode>
);

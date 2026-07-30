import React from 'react';
import ReactDOM from 'react-dom/client';
import SiteApp, { type SiteRoute } from '@/app/SiteApp';
import { siteDefinitions } from '@/app/site-config';
import VerifyPage from '@/pages/verifier/VerifyPage';
import VerificationHistory from '@/pages/verifier/VerificationHistory';

/** 核销站点：只打包 verifier 页面 */
const routes: SiteRoute[] = [
  { path: '/verifier', element: <VerifyPage /> },
  { path: '/verifier/history', element: <VerificationHistory /> }
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><SiteApp site={siteDefinitions.verifier} routes={routes} /></React.StrictMode>
);

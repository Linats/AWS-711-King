import React from 'react';
import ReactDOM from 'react-dom/client';
import SiteApp, { type SiteRoute } from '@/app/SiteApp';
import { siteDefinitions } from '@/app/site-config';
import CustomerHome from '@/pages/customer/CustomerHome';
import CouponWallet from '@/pages/customer/CouponWallet';

/** 主站（普通用户）：只打包 customer 页面 */
const routes: SiteRoute[] = [
  { path: '/customer', element: <CustomerHome /> },
  { path: '/customer/my-coupons', element: <CouponWallet /> }
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><SiteApp site={siteDefinitions.customer} routes={routes} /></React.StrictMode>
);

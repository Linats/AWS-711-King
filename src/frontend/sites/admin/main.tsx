import React from 'react';
import ReactDOM from 'react-dom/client';
import SiteApp, { type SiteRoute } from '@/app/SiteApp';
import { siteDefinitions } from '@/app/site-config';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AuditLogs from '@/pages/admin/AuditLogs';

/** 管理站点：只打包 admin 页面 */
const routes: SiteRoute[] = [
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/admin/stats', element: <AdminDashboard detailed /> },
  { path: '/admin/audit-logs', element: <AuditLogs /> }
];

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><SiteApp site={siteDefinitions.admin} routes={routes} /></React.StrictMode>
);

import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  App as AntApp, Avatar, Button, Card, ConfigProvider, Drawer, Dropdown, Form, Input, Layout, Menu,
  Result, Space, Tag, theme, Tooltip, Typography
} from 'antd';
import {
  GlobalOutlined, LoginOutlined, LogoutOutlined, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined,
  MoonOutlined, SettingOutlined, SunOutlined, UserOutlined
} from '@ant-design/icons';
import { demoUsers, roleLabel } from '@/demo';
import { SiteLinkRow } from '@/components/common/SiteLinks';
import { NotFoundPage } from '@/components/common/AsyncState';
import RegisterPage from '@/pages/auth/RegisterPage';
import { getApiError } from '@/services/api';
import { DEMO_PASSWORD, DemoProvider } from './DemoProvider';
import { useDemo } from './demo-context';
import { applySiteTheme, mainSite, otherSites, siteDefinitions, type SiteDefinition } from './site-config';
import { SiteContext, useSite } from './site-context';
import '@/styles/index.css';

const { Header, Sider, Content } = Layout;
const { Text, Title, Paragraph } = Typography;

export interface SiteRoute { path: string; element: ReactNode; }

/** 四个站点共用的骨架：注入站点定义与本站路由，其他角色的页面不会被打进本站产物。 */
export default function SiteApp({ site, routes }: { site: SiteDefinition; routes: SiteRoute[] }) {
  useEffect(() => {
    document.title = site.siteTitle;
    applySiteTheme(site);
  }, [site]);

  return <SiteContext.Provider value={site}>
    <ConfigProvider theme={{ token: { colorPrimary: site.theme.primary, borderRadius: 12 } }}>
      <BrowserRouter>
        <DemoProvider>
          <AntApp>
            <Routes>
              <Route path={`${site.home}/login`} element={<LoginPage />} />
              {/* 管理员站点不挂载注册路由 */}
              {site.allowsSelfRegistration ? <Route path={`${site.home}/register`} element={<RegisterPage />} /> : null}
              <Route path="*" element={<SiteLayout routes={routes} />} />
            </Routes>
          </AntApp>
        </DemoProvider>
      </BrowserRouter>
    </ConfigProvider>
  </SiteContext.Provider>;
}

function LoginPage() {
  const site = useSite();
  const { user, login, logout } = useDemo();
  const navigate = useNavigate();
  const { message, modal } = AntApp.useApp();
  if (user) return <Navigate to={site.home} replace />;

  const submit = async (values: { username: string; password: string }) => {
    try {
      const authenticated = await login(values.username, values.password);
      if (authenticated.role !== site.role) {
        const target = siteDefinitions[authenticated.role];
        await logout();
        return modal.confirm({
          title: `该账号是${roleLabel[authenticated.role]}`,
          content: `${site.brandName}只服务${site.audience}。${roleLabel[authenticated.role]}请前往「${target.brandName}」（${target.url}）。`,
          okText: `前往${target.brandName}`,
          cancelText: '留在本站',
          onOk: () => { window.location.href = target.url; }
        });
      }
      navigate(site.home);
    } catch (error) {
      message.error(getApiError(error).message);
    }
  };

  return <div className="login-screen">
    <div className="login-art">
      <div className="brand-mark">{site.icon}</div>
      <Tag color="blue">{site.heroBadge}</Tag>
      <Title className="hero-title">{site.heroTitleLead}<br /><span>{site.heroTitleAccent}</span></Title>
      <Paragraph className="hero-copy">{site.heroCopy}</Paragraph>
      <div className="hero-metrics">{site.heroMetrics.map((metric) => <div key={metric.label}><b>{metric.value}</b><span>{metric.label}</span></div>)}</div>
    </div>
    <Card className="login-card" bordered={false}>
      <Space direction="vertical" size={4}>
        <Text type="secondary">{site.loginWelcome}</Text>
        <Title level={2}>{site.loginTitle}</Title>
        <Text type="secondary">{site.loginHint}</Text>
      </Space>
      <Form
        layout="vertical" size="large" onFinish={submit} className="login-form"
        initialValues={{ username: site.accountUsernames[0], password: DEMO_PASSWORD }}
      >
        <Form.Item name="username" label="账号" rules={[{ required: true }]}><Input prefix={<UserOutlined />} placeholder={`请输入${site.audience}账号`} /></Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password placeholder={DEMO_PASSWORD} /></Form.Item>
        <Button type="primary" htmlType="submit" block size="large" icon={<LoginOutlined />}>进入{site.brandName}</Button>
      </Form>
      <div className="login-register">
        {site.allowsSelfRegistration
          ? <Text type="secondary">还没有账号？<Link to={`${site.home}/register`}>注册{roleLabel[site.role]}</Link></Text>
          : <Text type="secondary">{site.registerNotice}</Text>}
      </div>
      <div className="demo-accounts">
        <Text type="secondary">本站可用演示账号</Text>
        <div className="account-grid">{site.accountUsernames.map((username) => {
          const account = demoUsers[username];
          return <Button key={username} onClick={() => submit({ username, password: DEMO_PASSWORD })}>
            <Avatar size="small">{account?.displayName[0]}</Avatar>{account?.displayName ?? username}
          </Button>;
        })}</div>
        <Text type="secondary" className="password-hint">所有演示账号密码：{DEMO_PASSWORD}</Text>
        <div className="login-sites">
          <Text type="secondary">{site.isMain ? '其他角色请前往对应站点' : `不是${site.audience}？前往其他站点`}</Text>
          <SiteLinkRow current={site.id} />
        </div>
      </div>
    </Card>
  </div>;
}

function SiteLayout({ routes }: { routes: SiteRoute[] }) {
  const site = useSite();
  const { user, logout } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(false);
  if (!user) return <Navigate to={`${site.home}/login`} replace />;
  if (user.role !== site.role) return <WrongSite />;

  const menu = <Menu mode="inline" selectedKeys={[location.pathname]} items={site.nav} onClick={({ key }) => { navigate(key); setMobile(false); }} />;
  const brand = <div className="app-brand" onClick={() => navigate(site.home)}>
    <span className="brand-icon">{site.icon}</span>{!collapsed && <strong>{site.brandName}</strong>}
  </div>;
  const siteSwitcher = {
    items: otherSites(site.id).map((target) => ({
      key: target.id,
      icon: target.icon,
      label: <a href={target.url} target="_blank" rel="noreferrer">{target.brandName} · {target.audience}</a>
    }))
  };

  return <ConfigProvider theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: site.theme.primary, borderRadius: 12 } }}>
    <Layout className={`app-layout ${dark ? 'theme-dark' : ''}`}>
      <Sider className="desktop-sider" width={246} collapsedWidth={80} collapsible collapsed={collapsed} trigger={null} theme="light">
        {brand}
        {menu}
        <div className="sider-bottom">
          {!site.isMain && !collapsed && <a className="sider-main-link" href={mainSite.url} target="_blank" rel="noreferrer">返回{mainSite.brandName}</a>}
          <Button type="text" block icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '' : '收起导航'}</Button>
        </div>
      </Sider>
      <Drawer placement="left" open={mobile} onClose={() => setMobile(false)} width={270} styles={{ body: { padding: 0 } }}>
        <div className="app-brand"><span className="brand-icon">{site.icon}</span><strong>{site.brandName}</strong></div>
        {menu}
      </Drawer>
      <Layout>
        <Header className="topbar">
          <Button className="mobile-menu" type="text" icon={<MenuOutlined />} onClick={() => setMobile(true)} />
          <div className="topbar-spacer" />
          <Tag color="processing">{site.audience}站点</Tag>
          <Dropdown menu={siteSwitcher}>
            <Button type="text" icon={<GlobalOutlined />}>切换站点</Button>
          </Dropdown>
          <Tooltip title="切换明暗主题">
            <Button type="text" shape="circle" icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => setDark(!dark)} />
          </Tooltip>
          <Dropdown menu={{
            items: [
              { key: 'settings', label: '个人设置', icon: <SettingOutlined /> },
              { type: 'divider' },
              { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true }
            ],
            onClick: ({ key }) => { if (key === 'logout') { logout(); navigate(`${site.home}/login`); } }
          }}>
            <Button type="text" className="user-button">
              <Avatar>{user.displayName[0]}</Avatar>
              <span><b>{user.displayName}</b><small>{roleLabel[user.role]}</small></span>
            </Button>
          </Dropdown>
        </Header>
        <Content className="app-content">
          <div className="page-shell">
            <Routes>
              <Route path="/" element={<Navigate to={site.home} replace />} />
              {routes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  </ConfigProvider>;
}

function WrongSite() {
  const site = useSite();
  const { user, logout } = useDemo();
  const target = user ? siteDefinitions[user.role] : mainSite;
  return <Result
    status="403"
    title="站点与账号角色不匹配"
    subTitle={`${site.brandName}只服务${site.audience}，当前账号是${user ? roleLabel[user.role] : '未知角色'}。`}
    extra={<Space>
      <Button type="primary" href={target.url}>前往{target.brandName}</Button>
      <Button onClick={logout}>切换账号</Button>
    </Space>}
  />;
}
